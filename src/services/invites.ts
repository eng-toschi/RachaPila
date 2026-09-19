/**
 * Convite de viagem (spec §7.2).
 *
 * O token é gerado no aparelho — mas com fonte criptográfica de verdade
 * (`expo-crypto`), diferente do gerador de reserva em `db/ids.ts`, que é só
 * para identificadores locais. Quem convida precisa estar de posse de uma
 * viagem já sincronizada: convidar para algo que só existe neste celular não
 * significa nada para quem vai aceitar.
 */
import * as Crypto from 'expo-crypto';
import type { Database } from '../db/driver';
import { syncTrip } from '../sync/client';
import { supabase } from './supabase';

export type CreateInviteResult =
  | { readonly ok: true; readonly token: string; readonly deepLink: string }
  | { readonly ok: false; readonly message: string };

export async function createInvite(
  db: Database,
  tripId: string,
  participantId?: string,
): Promise<CreateInviteResult> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (session === null) return { ok: false, message: 'Entre na sua conta antes de convidar alguém.' };

  const syncResult = await syncTrip(db, tripId);
  if (!syncResult.ok) {
    return { ok: false, message: 'Não consegui sincronizar a viagem antes de gerar o convite. Tenta de novo.' };
  }

  const token = Crypto.randomUUID();
  const { error } = await supabase.from('trip_invites').insert({
    token,
    trip_id: tripId,
    participant_id: participantId ?? null,
    created_by: session.user.id,
  });
  if (error !== null) return { ok: false, message: error.message };

  return { ok: true, token, deepLink: `rachapila://join/${token}` };
}
