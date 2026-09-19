/**
 * Fala com o Supabase: drena o `ops_outbox` (push) e traz o que mudou lá
 * (pull). Espelha o §10 do spec.
 *
 * Push relê o estado ATUAL de cada entidade no SQLite local na hora de
 * mandar — nunca reenvia o payload antigo gravado na operação. Isso importa
 * por dois motivos: o payload de uma op pode estar incompleto (`setTripCurrencies`
 * grava só `{id, currencies}`, por exemplo) e várias ops seguidas na mesma
 * entidade viram um push só, do estado final — o servidor só quer saber "como
 * está agora", não a lista de passos.
 *
 * A viagem é sempre a primeira coisa empurrada, e "tornar-se dono" acontece
 * logo depois dela: as políticas de RLS de tudo o mais dependem de já existir
 * uma linha em `trip_members` (ver DECISIONS.md e os comentários em
 * `supabase/schema.sql`).
 */
import type { Database } from '../db/driver';
import { markFailed, markSynced, pendingOps, type OpEntity } from './outbox';
import {
  applyRemoteExpense,
  applyRemoteParticipant,
  applyRemoteSettlement,
  applyRemoteTrip,
  type RemoteExpenseRow,
  type RemoteParticipantRow,
  type RemoteSettlementRow,
  type RemoteTripRow,
} from './apply';
import { supabase } from '../services/supabase';

export type SyncError =
  | { readonly code: 'not_logged_in' }
  | { readonly code: 'push_failed'; readonly message: string }
  | { readonly code: 'pull_failed'; readonly message: string };

export type SyncResult = { readonly ok: true } | { readonly ok: false; readonly error: SyncError };

interface FullTripRow {
  id: string;
  name: string;
  base_currency: string;
  starts_on: string | null;
  ends_on: string | null;
  cover_color: string;
  archived_at: string | null;
  deleted_at: string | null;
  lamport: number;
  actor_id: string;
  updated_at: string;
}

interface FullParticipantRow {
  id: string;
  trip_id: string;
  display_name: string;
  user_id: string | null;
  avatar_seed: string;
  email: string | null;
  pix_key: string | null;
  pix_key_kind: string | null;
  pix_name: string | null;
  pix_city: string | null;
  merged_into: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  lamport: number;
  actor_id: string;
  updated_at: string;
}

interface FullExpenseRow {
  id: string;
  trip_id: string;
  description: string;
  category: string;
  amount_cents: number;
  currency: string;
  fx_rate_ppm: number;
  fx_manual: number;
  fx_as_of: string | null;
  payment_method: string;
  iof_ppm: number;
  spent_on: string;
  spent_at: string | null;
  place_label: string | null;
  place_lat: number | null;
  place_lon: number | null;
  paid_by: string;
  split_type: 'equal' | 'exact';
  note: string | null;
  created_by: string;
  deleted_at: string | null;
  lamport: number;
  actor_id: string;
  updated_at: string;
}

interface FullShareRow {
  participant_id: string;
  input_cents: number;
  computed_cents: number;
  position: number;
}

interface FullSettlementRow {
  id: string;
  trip_id: string;
  from_id: string;
  to_id: string;
  amount_cents: number;
  currency: string;
  fx_rate_ppm: number;
  settled_on: string;
  note: string | null;
  deleted_at: string | null;
  lamport: number;
  actor_id: string;
  updated_at: string;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Torna o usuário dono de uma viagem sem dono ainda — bootstrap de quem a
 * criou offline, antes de qualquer conta existir (ver `schema.sql`, política
 * "become owner of an unowned trip"). Conflito de chave (já é dono) e recusa
 * de RLS (a viagem já tinha dono — convite aceito por outro caminho) são os
 * dois desfechos esperados, não falha.
 */
async function claimTripIfNeeded(tripId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('trip_members').insert({ trip_id: tripId, user_id: userId, role: 'owner' });
  if (error === null) return;
  if (error.code === '23505' || /row-level security/iu.test(error.message)) return;
  throw new Error(error.message);
}

async function pushTripRow(db: Database, tripId: string, userId: string): Promise<void> {
  const trip = db.get<FullTripRow>('SELECT * FROM trips WHERE id = ?', [tripId]);
  if (trip === undefined) return; // nunca existiu ou já foi coletado — nada a empurrar.

  const currencies = db
    .all<{ code: string }>('SELECT code FROM trip_currencies WHERE trip_id = ? ORDER BY position', [tripId])
    .map((row) => row.code);

  const { error } = await supabase.rpc('push_trip', {
    p_id: trip.id,
    p_name: trip.name,
    p_base_currency: trip.base_currency,
    p_starts_on: trip.starts_on,
    p_ends_on: trip.ends_on,
    p_cover_color: trip.cover_color,
    p_archived_at: trip.archived_at,
    p_deleted_at: trip.deleted_at,
    p_lamport: trip.lamport,
    p_actor_id: trip.actor_id,
    p_updated_at: trip.updated_at,
    p_currencies: currencies,
  });
  if (error !== null) throw new Error(error.message);

  // Só depois de a viagem existir do lado de lá: é dela que depende a RLS de
  // tudo o mais (participantes, despesas, acertos).
  await claimTripIfNeeded(tripId, userId);
}

async function pushParticipantRow(db: Database, participantId: string): Promise<void> {
  const p = db.get<FullParticipantRow>('SELECT * FROM participants WHERE id = ?', [participantId]);
  if (p === undefined) return;

  const { error } = await supabase.rpc('push_participant', {
    p_id: p.id,
    p_trip_id: p.trip_id,
    p_display_name: p.display_name,
    p_user_id: p.user_id,
    p_avatar_seed: p.avatar_seed,
    p_email: p.email,
    p_pix_key: p.pix_key,
    p_pix_key_kind: p.pix_key_kind,
    p_pix_name: p.pix_name,
    p_pix_city: p.pix_city,
    p_merged_into: p.merged_into,
    p_archived_at: p.archived_at,
    p_deleted_at: p.deleted_at,
    p_lamport: p.lamport,
    p_actor_id: p.actor_id,
    p_updated_at: p.updated_at,
  });
  if (error !== null) throw new Error(error.message);
}

async function pushExpenseRow(db: Database, expenseId: string): Promise<void> {
  const expense = db.get<FullExpenseRow>('SELECT * FROM expenses WHERE id = ?', [expenseId]);
  if (expense === undefined) return;

  const shares = db.all<FullShareRow>(
    'SELECT participant_id, input_cents, computed_cents, position FROM expense_shares WHERE expense_id = ? ORDER BY position',
    [expenseId],
  );

  const { error } = await supabase.rpc('push_expense', {
    p_id: expense.id,
    p_trip_id: expense.trip_id,
    p_description: expense.description,
    p_category: expense.category,
    p_amount_cents: expense.amount_cents,
    p_currency: expense.currency,
    p_fx_rate_ppm: expense.fx_rate_ppm,
    p_fx_manual: expense.fx_manual !== 0,
    p_fx_as_of: expense.fx_as_of,
    p_payment_method: expense.payment_method,
    p_iof_ppm: expense.iof_ppm,
    p_spent_on: expense.spent_on,
    p_spent_at: expense.spent_at,
    p_place_label: expense.place_label,
    p_place_lat: expense.place_lat,
    p_place_lon: expense.place_lon,
    p_paid_by: expense.paid_by,
    p_split_type: expense.split_type,
    p_note: expense.note,
    p_created_by: expense.created_by,
    p_deleted_at: expense.deleted_at,
    p_lamport: expense.lamport,
    p_actor_id: expense.actor_id,
    p_updated_at: expense.updated_at,
    p_shares: shares,
  });
  if (error !== null) throw new Error(error.message);
}

async function pushSettlementRow(db: Database, settlementId: string): Promise<void> {
  const s = db.get<FullSettlementRow>('SELECT * FROM settlements WHERE id = ?', [settlementId]);
  if (s === undefined) return;

  const { error } = await supabase.rpc('push_settlement', {
    p_id: s.id,
    p_trip_id: s.trip_id,
    p_from_id: s.from_id,
    p_to_id: s.to_id,
    p_amount_cents: s.amount_cents,
    p_currency: s.currency,
    p_fx_rate_ppm: s.fx_rate_ppm,
    p_settled_on: s.settled_on,
    p_note: s.note,
    p_deleted_at: s.deleted_at,
    p_lamport: s.lamport,
    p_actor_id: s.actor_id,
    p_updated_at: s.updated_at,
  });
  if (error !== null) throw new Error(error.message);
}

const PUSH_ORDER: Record<OpEntity, number> = { trip: 0, participant: 1, expense: 2, settlement: 3, subgroup: 4 };

/**
 * Drena o outbox de UMA viagem. Agrupa por `(entity, entityId)`: várias ops
 * seguidas na mesma linha viram um push só, do estado atual — e cada grupo
 * só é marcado sincronizado depois que o push dele especificamente teve
 * sucesso, então uma falha no meio não perde o progresso já feito.
 */
export async function pushTrip(db: Database, tripId: string): Promise<SyncResult> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (session === null) return { ok: false, error: { code: 'not_logged_in' } };

  const ops = pendingOps(db, 500).filter((op) => op.tripId === tripId);
  if (ops.length === 0) return { ok: true };

  const groups = new Map<string, { entity: OpEntity; entityId: string; opIds: string[] }>();
  for (const op of ops) {
    const key = `${op.entity}:${op.entityId}`;
    const group = groups.get(key);
    if (group === undefined) groups.set(key, { entity: op.entity, entityId: op.entityId, opIds: [op.id] });
    else group.opIds.push(op.id);
  }

  const sortedGroups = [...groups.values()].sort((a, b) => PUSH_ORDER[a.entity] - PUSH_ORDER[b.entity]);

  for (const group of sortedGroups) {
    try {
      switch (group.entity) {
        case 'trip':
          await pushTripRow(db, group.entityId, session.user.id);
          break;
        case 'participant':
          await pushParticipantRow(db, group.entityId);
          break;
        case 'expense':
          await pushExpenseRow(db, group.entityId);
          break;
        case 'settlement':
          await pushSettlementRow(db, group.entityId);
          break;
        case 'subgroup':
          break; // nada gera esta op hoje (ver rememberSubgroup em commands/).
      }
      markSynced(db, group.opIds);
    } catch (error) {
      const message = messageOf(error);
      const [firstOpId] = group.opIds;
      if (firstOpId !== undefined) markFailed(db, firstOpId, message);
      return { ok: false, error: { code: 'push_failed', message } };
    }
  }

  return { ok: true };
}

interface Cursor {
  trips: number;
  participants: number;
  expenses: number;
  settlements: number;
}

const EMPTY_CURSOR: Cursor = { trips: 0, participants: 0, expenses: 0, settlements: 0 };

function readCursor(db: Database, tripId: string): Cursor {
  const row = db.get<{ cursor: string | null }>('SELECT cursor FROM sync_state WHERE trip_id = ?', [tripId]);
  if (row === undefined || row.cursor === null) return { ...EMPTY_CURSOR };
  try {
    return { ...EMPTY_CURSOR, ...(JSON.parse(row.cursor) as Partial<Cursor>) };
  } catch {
    return { ...EMPTY_CURSOR };
  }
}

function writeCursor(db: Database, tripId: string, cursor: Cursor, now: string): void {
  db.run(
    `INSERT INTO sync_state (trip_id, cursor, last_pull_at) VALUES (?, ?, ?)
     ON CONFLICT(trip_id) DO UPDATE SET cursor = excluded.cursor, last_pull_at = excluded.last_pull_at`,
    [tripId, JSON.stringify(cursor), now],
  );
}

interface WithServerSeq {
  readonly server_seq: number;
}

/**
 * Traz o que mudou desde o último pull. Cada tabela tem seu próprio cursor
 * (`server_seq` é uma sequência por tabela, não global) — guardados juntos
 * como um JSON só na coluna `cursor` de `sync_state`, para não precisar de
 * mais colunas nem de outra tabela.
 */
export async function pullTrip(db: Database, tripId: string): Promise<SyncResult> {
  const { data } = await supabase.auth.getSession();
  if (data.session === null) return { ok: false, error: { code: 'not_logged_in' } };

  const cursor = readCursor(db, tripId);
  const next = { ...cursor };

  try {
    const { data: tripRows, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .gt('server_seq', cursor.trips);
    if (tripError !== null) throw new Error(tripError.message);

    for (const trip of tripRows as (RemoteTripRow & WithServerSeq)[]) {
      const { data: currencyRows } = await supabase
        .from('trip_currencies')
        .select('code, position')
        .eq('trip_id', tripId)
        .order('position');
      const codes = ((currencyRows ?? []) as { code: string; position: number }[]).map((row) => row.code);
      applyRemoteTrip(db, trip, codes);
      next.trips = Math.max(next.trips, trip.server_seq);
    }

    const { data: participantRows, error: participantError } = await supabase
      .from('participants')
      .select('*')
      .eq('trip_id', tripId)
      .gt('server_seq', cursor.participants);
    if (participantError !== null) throw new Error(participantError.message);

    for (const p of participantRows as (RemoteParticipantRow & WithServerSeq)[]) {
      applyRemoteParticipant(db, p);
      next.participants = Math.max(next.participants, p.server_seq);
    }

    const { data: expenseRows, error: expenseError } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .gt('server_seq', cursor.expenses);
    if (expenseError !== null) throw new Error(expenseError.message);

    for (const expense of expenseRows as (RemoteExpenseRow & WithServerSeq)[]) {
      const { data: shareRows } = await supabase
        .from('expense_shares')
        .select('participant_id, input_cents, computed_cents, position')
        .eq('expense_id', expense.id)
        .order('position');
      applyRemoteExpense(db, expense, shareRows ?? []);
      next.expenses = Math.max(next.expenses, expense.server_seq);
    }

    const { data: settlementRows, error: settlementError } = await supabase
      .from('settlements')
      .select('*')
      .eq('trip_id', tripId)
      .gt('server_seq', cursor.settlements);
    if (settlementError !== null) throw new Error(settlementError.message);

    for (const s of settlementRows as (RemoteSettlementRow & WithServerSeq)[]) {
      applyRemoteSettlement(db, s);
      next.settlements = Math.max(next.settlements, s.server_seq);
    }

    writeCursor(db, tripId, next, new Date().toISOString());
    return { ok: true };
  } catch (error) {
    return { ok: false, error: { code: 'pull_failed', message: messageOf(error) } };
  }
}

/** Push seguido de pull — o caso comum de "sincronizar agora". */
export async function syncTrip(db: Database, tripId: string): Promise<SyncResult> {
  const pushResult = await pushTrip(db, tripId);
  if (!pushResult.ok) return pushResult;
  return pullTrip(db, tripId);
}
