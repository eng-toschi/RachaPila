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
import { WEB_BASE_URL } from '../config/app';
import type { Database } from '../db/driver';
import { syncTrip } from '../sync/client';
import { supabase } from './supabase';

/**
 * Endereço para compartilhar um convite.
 *
 * O token vai na query, não no caminho: a página é estática, e sem servidor
 * para rotear `/convite/<token>` daria 404. A página tenta abrir o app
 * sozinha pelo `rachapila://` e, para quem ainda não tem, mostra o caminho
 * da loja — que é o que faltava para um convite ser útil fora do grupo de
 * quem já instalou.
 */
export function inviteUrl(token: string): string {
  return `${WEB_BASE_URL}/convite.html?c=${token}`;
}

/**
 * O texto que acompanha o link.
 *
 * Link `https://`, não `rachapila://`: nenhum app de mensagem transforma
 * esquema customizado em link tocável, então o deep link cru virava texto
 * morto. A página do convite resolve os dois lados — abre o app sozinha para
 * quem já tem, e leva à loja quem ainda não tem. O código não vai na mensagem
 * porque a página o mostra, e mensagem curta é mais provável de ser lida até
 * o fim.
 */
export function inviteMessage(token: string): string {
  return (
    `Entra na nossa viagem no RachaPila!\n\n` +
    `${inviteUrl(token)}\n\n` +
    `O link abre o app. Se você ainda não tem, ele leva para baixar.`
  );
}

export type CreateInviteResult =
  | { readonly ok: true; readonly token: string }
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
    const detail = 'message' in syncResult.error ? syncResult.error.message : syncResult.error.code;
    return { ok: false, message: `Não consegui sincronizar a viagem antes de gerar o convite: ${detail}` };
  }

  const token = Crypto.randomUUID();
  const { error } = await supabase.from('trip_invites').insert({
    token,
    trip_id: tripId,
    participant_id: participantId ?? null,
    created_by: session.user.id,
  });
  if (error !== null) return { ok: false, message: error.message };

  return { ok: true, token };
}
