/**
 * Aplica linhas vindas do servidor no SQLite local (spec §10, "Pull").
 *
 * Nunca grava no `ops_outbox`: aplicar o que o servidor mandou não é uma
 * mudança local que precise viajar de volta — faria o mesmo dado dar voltas
 * entre os aparelhos para sempre. `record()` (em `commands/`) é para ações da
 * pessoa; isto aqui é para o eco delas vindo de outro dispositivo.
 *
 * Resolução de conflito: last-writer-wins comparando `(lamport, actor_id)`
 * (§10) — igual ao que os RPCs `push_*` fazem do lado do servidor. Uma linha
 * remota só sobrescreve a local se vencer essa comparação; do contrário, a
 * linha local (ainda não sincronizada, ou já mais nova) fica como está.
 */
import type { Database } from '../db/driver';

interface Versioned {
  readonly lamport: number;
  readonly actor_id: string;
}

function remoteWins(db: Database, table: 'trips' | 'participants' | 'expenses' | 'settlements', id: string, remote: Versioned): boolean {
  const current = db.get<Versioned>(`SELECT lamport, actor_id FROM ${table} WHERE id = ?`, [id]);
  if (current === undefined) return true;
  if (remote.lamport !== current.lamport) return remote.lamport > current.lamport;
  return remote.actor_id > current.actor_id;
}

export interface RemoteTripRow {
  readonly id: string;
  readonly name: string;
  readonly base_currency: string;
  readonly starts_on: string | null;
  readonly ends_on: string | null;
  readonly cover_color: string;
  readonly archived_at: string | null;
  readonly deleted_at: string | null;
  readonly lamport: number;
  readonly actor_id: string;
  readonly updated_at: string;
}

export function applyRemoteTrip(db: Database, trip: RemoteTripRow, currencies: readonly string[]): void {
  db.transaction(() => {
    if (!remoteWins(db, 'trips', trip.id, trip)) return;

    db.run(
      `INSERT INTO trips (id, name, base_currency, starts_on, ends_on, cover_color, archived_at,
                           deleted_at, lamport, actor_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, base_currency = excluded.base_currency, starts_on = excluded.starts_on,
         ends_on = excluded.ends_on, cover_color = excluded.cover_color, archived_at = excluded.archived_at,
         deleted_at = excluded.deleted_at, lamport = excluded.lamport, actor_id = excluded.actor_id,
         updated_at = excluded.updated_at`,
      [
        trip.id, trip.name, trip.base_currency, trip.starts_on, trip.ends_on, trip.cover_color,
        trip.archived_at, trip.deleted_at, trip.lamport, trip.actor_id, trip.updated_at,
      ],
    );

    db.run('DELETE FROM trip_currencies WHERE trip_id = ?', [trip.id]);
    currencies.forEach((code, position) => {
      db.run('INSERT INTO trip_currencies (trip_id, code, position) VALUES (?, ?, ?)', [trip.id, code, position]);
    });
  });
}

export interface RemoteParticipantRow {
  readonly id: string;
  readonly trip_id: string;
  readonly display_name: string;
  readonly user_id: string | null;
  readonly avatar_seed: string;
  readonly email: string | null;
  readonly pix_key: string | null;
  readonly pix_key_kind: string | null;
  readonly pix_name: string | null;
  readonly pix_city: string | null;
  readonly merged_into: string | null;
  readonly archived_at: string | null;
  readonly deleted_at: string | null;
  readonly lamport: number;
  readonly actor_id: string;
  readonly updated_at: string;
}

export function applyRemoteParticipant(db: Database, p: RemoteParticipantRow): void {
  db.transaction(() => {
    if (!remoteWins(db, 'participants', p.id, p)) return;

    db.run(
      `INSERT INTO participants (id, trip_id, display_name, user_id, avatar_seed, email, pix_key,
                                  pix_key_kind, pix_name, pix_city, merged_into, archived_at,
                                  deleted_at, lamport, actor_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name, user_id = excluded.user_id, avatar_seed = excluded.avatar_seed,
         email = excluded.email, pix_key = excluded.pix_key, pix_key_kind = excluded.pix_key_kind,
         pix_name = excluded.pix_name, pix_city = excluded.pix_city, merged_into = excluded.merged_into,
         archived_at = excluded.archived_at, deleted_at = excluded.deleted_at, lamport = excluded.lamport,
         actor_id = excluded.actor_id, updated_at = excluded.updated_at`,
      [
        p.id, p.trip_id, p.display_name, p.user_id, p.avatar_seed, p.email, p.pix_key,
        p.pix_key_kind, p.pix_name, p.pix_city, p.merged_into, p.archived_at,
        p.deleted_at, p.lamport, p.actor_id, p.updated_at,
      ],
    );
  });
}

export interface RemoteShareRow {
  readonly participant_id: string;
  readonly input_cents: number;
  readonly computed_cents: number;
  readonly position: number;
}

export interface RemoteExpenseRow {
  readonly id: string;
  readonly trip_id: string;
  readonly description: string;
  readonly category: string;
  readonly amount_cents: number;
  readonly currency: string;
  readonly fx_rate_ppm: number;
  readonly fx_manual: boolean;
  readonly fx_as_of: string | null;
  readonly payment_method: string;
  readonly iof_ppm: number;
  readonly spent_on: string;
  readonly spent_at: string | null;
  readonly place_label: string | null;
  readonly place_lat: number | null;
  readonly place_lon: number | null;
  readonly paid_by: string;
  readonly split_type: 'equal' | 'exact';
  readonly note: string | null;
  readonly created_by: string;
  readonly deleted_at: string | null;
  readonly lamport: number;
  readonly actor_id: string;
  readonly updated_at: string;
}

export function applyRemoteExpense(db: Database, expense: RemoteExpenseRow, shares: readonly RemoteShareRow[]): void {
  db.transaction(() => {
    if (!remoteWins(db, 'expenses', expense.id, expense)) return;

    db.run(
      `INSERT INTO expenses (id, trip_id, description, category, amount_cents, currency, fx_rate_ppm,
                              fx_manual, fx_as_of, payment_method, iof_ppm, spent_on, spent_at,
                              place_label, place_lat, place_lon, paid_by, split_type, note, created_by,
                              deleted_at, lamport, actor_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         description = excluded.description, category = excluded.category, amount_cents = excluded.amount_cents,
         currency = excluded.currency, fx_rate_ppm = excluded.fx_rate_ppm, fx_manual = excluded.fx_manual,
         fx_as_of = excluded.fx_as_of, payment_method = excluded.payment_method, iof_ppm = excluded.iof_ppm,
         spent_on = excluded.spent_on, spent_at = excluded.spent_at, place_label = excluded.place_label,
         place_lat = excluded.place_lat, place_lon = excluded.place_lon, paid_by = excluded.paid_by,
         split_type = excluded.split_type, note = excluded.note, created_by = excluded.created_by,
         deleted_at = excluded.deleted_at, lamport = excluded.lamport, actor_id = excluded.actor_id,
         updated_at = excluded.updated_at`,
      [
        expense.id, expense.trip_id, expense.description, expense.category, expense.amount_cents,
        expense.currency, expense.fx_rate_ppm, expense.fx_manual ? 1 : 0, expense.fx_as_of,
        expense.payment_method, expense.iof_ppm, expense.spent_on, expense.spent_at,
        expense.place_label, expense.place_lat, expense.place_lon, expense.paid_by,
        expense.split_type, expense.note, expense.created_by, expense.deleted_at,
        expense.lamport, expense.actor_id, expense.updated_at,
      ],
    );

    // Partes substituídas em bloco junto com a despesa-mãe (§10) — nunca
    // mescladas linha a linha.
    db.run('DELETE FROM expense_shares WHERE expense_id = ?', [expense.id]);
    shares.forEach((share) => {
      db.run(
        `INSERT INTO expense_shares (expense_id, participant_id, input_cents, computed_cents, position)
         VALUES (?, ?, ?, ?, ?)`,
        [expense.id, share.participant_id, share.input_cents, share.computed_cents, share.position],
      );
    });
  });
}

export interface RemoteSettlementRow {
  readonly id: string;
  readonly trip_id: string;
  readonly from_id: string;
  readonly to_id: string;
  readonly amount_cents: number;
  readonly currency: string;
  readonly fx_rate_ppm: number;
  readonly settled_on: string;
  readonly note: string | null;
  readonly deleted_at: string | null;
  readonly lamport: number;
  readonly actor_id: string;
  readonly updated_at: string;
}

export function applyRemoteSettlement(db: Database, s: RemoteSettlementRow): void {
  db.transaction(() => {
    if (!remoteWins(db, 'settlements', s.id, s)) return;

    db.run(
      `INSERT INTO settlements (id, trip_id, from_id, to_id, amount_cents, currency, fx_rate_ppm,
                                 settled_on, note, deleted_at, lamport, actor_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         from_id = excluded.from_id, to_id = excluded.to_id, amount_cents = excluded.amount_cents,
         currency = excluded.currency, fx_rate_ppm = excluded.fx_rate_ppm, settled_on = excluded.settled_on,
         note = excluded.note, deleted_at = excluded.deleted_at, lamport = excluded.lamport,
         actor_id = excluded.actor_id, updated_at = excluded.updated_at`,
      [
        s.id, s.trip_id, s.from_id, s.to_id, s.amount_cents, s.currency, s.fx_rate_ppm,
        s.settled_on, s.note, s.deleted_at, s.lamport, s.actor_id, s.updated_at,
      ],
    );
  });
}
