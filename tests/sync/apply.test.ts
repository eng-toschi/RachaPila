/**
 * Convergência entre réplicas (spec §10, seção `sync/` dos testes).
 *
 * `applyRemote*` é o lado "pull" da sincronização: aplica no SQLite local uma
 * linha que veio do servidor, resolvendo conflito por `(lamport, actor_id)`.
 * Simula duas réplicas trocando a mesma linha, fora de ordem e com edição
 * concorrente, sem precisar de rede nem do Supabase — é lógica local pura.
 */
import { describe, expect, it } from 'vitest';
import type { Database } from '@/db/driver';
import {
  applyRemoteExpense,
  applyRemoteParticipant,
  applyRemoteTrip,
  type RemoteExpenseRow,
  type RemoteParticipantRow,
  type RemoteTripRow,
} from '@/sync/apply';
import { openTestDb } from '../db/_harness';

interface FullTripRow extends RemoteTripRow {
  id: string;
}
interface FullParticipantRow extends RemoteParticipantRow {
  id: string;
}
interface FullExpenseRow extends RemoteExpenseRow {
  id: string;
}

function readTrip(db: Database, id: string): FullTripRow {
  const row = db.get<FullTripRow>('SELECT * FROM trips WHERE id = ?', [id]);
  if (row === undefined) throw new Error('trip not found');
  return row;
}

function readParticipant(db: Database, id: string): FullParticipantRow {
  const row = db.get<FullParticipantRow>('SELECT * FROM participants WHERE id = ?', [id]);
  if (row === undefined) throw new Error('participant not found');
  return row;
}

function readExpense(db: Database, id: string): FullExpenseRow {
  const row = db.get<FullExpenseRow>('SELECT * FROM expenses WHERE id = ?', [id]);
  if (row === undefined) throw new Error('expense not found');
  return row;
}

/** Cria a mesma viagem e o mesmo participante fantasma nas duas réplicas, cada uma com seu próprio actor_id. */
function twoReplicasWithTripAndParticipant(): { a: Database; b: Database } {
  const a = openTestDb('aparelho-a');
  const now = '2026-03-14T12:00:00.000Z';
  a.run(
    `INSERT INTO trips (id, name, base_currency, actor_id, lamport, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ['trip-1', 'Gramado', 'BRL', 'aparelho-a', 1, now],
  );
  a.run(
    `INSERT INTO participants (id, trip_id, display_name, avatar_seed, actor_id, lamport, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['part-1', 'trip-1', 'Ana', 'seed', 'aparelho-a', 1, now],
  );

  const b = openTestDb('aparelho-b');
  applyRemoteTrip(b, readTrip(a, 'trip-1'), []);
  applyRemoteParticipant(b, readParticipant(a, 'part-1'));

  return { a, b };
}

describe('sync/apply — convergência entre réplicas', () => {
  it('duas réplicas aplicando a mesma viagem convergem ao estado idêntico', () => {
    const { a, b } = twoReplicasWithTripAndParticipant();
    expect(readTrip(b, 'trip-1')).toEqual(readTrip(a, 'trip-1'));
    expect(readParticipant(b, 'part-1')).toEqual(readParticipant(a, 'part-1'));
  });

  it('edição concorrente do mesmo participante: o mesmo vencedor ganha nas duas réplicas, em qualquer ordem', () => {
    const now = '2026-03-14T12:00:00.000Z';

    // Dois "dispositivos" editam o mesmo participante concorrentemente, sem
    // ter visto a edição um do outro — por isso os dois começam do lamport 1.
    const editFromA: RemoteParticipantRow = {
      id: 'part-1', trip_id: 'trip-1', display_name: 'Ana (editado por A)', user_id: null,
      avatar_seed: 'seed', email: null, pix_key: null, pix_key_kind: null, pix_name: null,
      pix_city: null, merged_into: null, archived_at: null, deleted_at: null,
      lamport: 2, actor_id: 'aparelho-a', updated_at: now,
    };
    const editFromB: RemoteParticipantRow = {
      ...editFromA, display_name: 'Ana (editado por B)', actor_id: 'aparelho-b',
    };

    // "aparelho-b" > "aparelho-a" lexicograficamente, então B vence o empate de lamport.
    const replica1 = twoReplicasWithTripAndParticipant().a;
    applyRemoteParticipant(replica1, editFromA);
    applyRemoteParticipant(replica1, editFromB);

    const replica2 = twoReplicasWithTripAndParticipant().a;
    applyRemoteParticipant(replica2, editFromB);
    applyRemoteParticipant(replica2, editFromA);

    expect(readParticipant(replica1, 'part-1').display_name).toBe('Ana (editado por B)');
    expect(readParticipant(replica2, 'part-1').display_name).toBe('Ana (editado por B)');
  });

  it('exclusão com lamport menor não apaga uma edição mais nova (tombstone perde de edição)', () => {
    const now = '2026-03-14T12:00:00.000Z';
    const { a } = twoReplicasWithTripAndParticipant();

    const edited: RemoteParticipantRow = {
      id: 'part-1', trip_id: 'trip-1', display_name: 'Ana (nova edição)', user_id: null,
      avatar_seed: 'seed', email: null, pix_key: null, pix_key_kind: null, pix_name: null,
      pix_city: null, merged_into: null, archived_at: null, deleted_at: null,
      lamport: 5, actor_id: 'aparelho-a', updated_at: now,
    };
    applyRemoteParticipant(a, edited);

    const staleDelete: RemoteParticipantRow = { ...edited, deleted_at: now, lamport: 2 };
    applyRemoteParticipant(a, staleDelete);

    const result = readParticipant(a, 'part-1');
    expect(result.deleted_at).toBeNull();
    expect(result.display_name).toBe('Ana (nova edição)');
  });

  it('exclusão com lamport maior apaga mesmo depois de uma edição (tombstone vence)', () => {
    const now = '2026-03-14T12:00:00.000Z';
    const { a } = twoReplicasWithTripAndParticipant();

    const edited: RemoteParticipantRow = {
      id: 'part-1', trip_id: 'trip-1', display_name: 'Ana (editada)', user_id: null,
      avatar_seed: 'seed', email: null, pix_key: null, pix_key_kind: null, pix_name: null,
      pix_city: null, merged_into: null, archived_at: null, deleted_at: null,
      lamport: 2, actor_id: 'aparelho-a', updated_at: now,
    };
    applyRemoteParticipant(a, edited);

    const newerDelete: RemoteParticipantRow = { ...edited, deleted_at: now, lamport: 3 };
    applyRemoteParticipant(a, newerDelete);

    expect(readParticipant(a, 'part-1').deleted_at).toBe(now);
  });

  it('uma edição com lamport maior RESSUSCITA um registro excluído (§10 — perder é pior que ver um apagado)', () => {
    const now = '2026-03-14T12:00:00.000Z';
    const { a } = twoReplicasWithTripAndParticipant();

    const deleted: RemoteParticipantRow = {
      id: 'part-1', trip_id: 'trip-1', display_name: 'Ana', user_id: null,
      avatar_seed: 'seed', email: null, pix_key: null, pix_key_kind: null, pix_name: null,
      pix_city: null, merged_into: null, archived_at: null, deleted_at: now,
      lamport: 2, actor_id: 'aparelho-a', updated_at: now,
    };
    applyRemoteParticipant(a, deleted);
    expect(readParticipant(a, 'part-1').deleted_at).toBe(now);

    const revived: RemoteParticipantRow = { ...deleted, deleted_at: null, lamport: 3 };
    applyRemoteParticipant(a, revived);
    expect(readParticipant(a, 'part-1').deleted_at).toBeNull();
  });

  it('despesa e partes chegam fora de ordem e convergem, com as partes sempre batendo com a versão aplicada', () => {
    const now = '2026-03-14T12:00:00.000Z';
    const { a: db } = twoReplicasWithTripAndParticipant();
    db.run(
      `INSERT INTO participants (id, trip_id, display_name, avatar_seed, actor_id, lamport, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['part-2', 'trip-1', 'Bruno', 'seed2', 'aparelho-a', 1, now],
    );

    const expenseV1: RemoteExpenseRow = {
      id: 'exp-1', trip_id: 'trip-1', description: 'Jantar', category: 'food', amount_cents: 10_000,
      currency: 'BRL', fx_rate_ppm: 1_000_000, fx_manual: false, fx_as_of: null, payment_method: 'no_fx',
      iof_ppm: 0, spent_on: '2026-03-14', spent_at: null, place_label: null, place_lat: null, place_lon: null,
      paid_by: 'part-1', split_type: 'equal', note: null, created_by: 'aparelho-a', deleted_at: null,
      lamport: 1, actor_id: 'aparelho-a', updated_at: now,
    };
    const sharesV1 = [
      { participant_id: 'part-1', input_cents: 0, computed_cents: 5_000, position: 0 },
      { participant_id: 'part-2', input_cents: 0, computed_cents: 5_000, position: 1 },
    ];

    const expenseV2: RemoteExpenseRow = {
      ...expenseV1, amount_cents: 9_000, lamport: 2,
    };
    const sharesV2 = [
      { participant_id: 'part-1', input_cents: 0, computed_cents: 4_500, position: 0 },
      { participant_id: 'part-2', input_cents: 0, computed_cents: 4_500, position: 1 },
    ];

    // Chega a versão 2 primeiro (rede pode entregar fora de ordem), depois a 1 — a 1 não pode vencer.
    applyRemoteExpense(db, expenseV2, sharesV2);
    applyRemoteExpense(db, expenseV1, sharesV1);

    const finalExpense = readExpense(db, 'exp-1');
    expect(finalExpense.amount_cents).toBe(9_000);

    const shares = db
      .all<{ participant_id: string; computed_cents: number }>(
        'SELECT participant_id, computed_cents FROM expense_shares WHERE expense_id = ? ORDER BY position',
        ['exp-1'],
      );
    expect(shares).toEqual([
      { participant_id: 'part-1', computed_cents: 4_500 },
      { participant_id: 'part-2', computed_cents: 4_500 },
    ]);
    expect(shares.reduce((total, share) => total + share.computed_cents, 0)).toBe(finalExpense.amount_cents);
  });
});
