/**
 * Excluir a conta (App Store, diretriz 5.1.1(v)).
 *
 * O trabalho pesado é do servidor (`delete_my_account`, em
 * `supabase/schema.sql`), que apaga a conta sem apagar o histórico do grupo
 * — quem sai vira fantasma de novo, e o fechamento continua fechando. Aqui
 * fica só a ordem das três etapas, que importa: apagar lá, esquecer aqui,
 * encerrar a sessão.
 */
import type { Database } from '../db/driver';
import { forgetAccount } from '../db/repositories';
import { supabase } from './supabase';

export type DeleteAccountResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

export async function deleteAccount(db: Database): Promise<DeleteAccountResult> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (session === null) return { ok: false, message: 'Você já não está conectado.' };

  const { error } = await supabase.rpc('delete_my_account');
  if (error !== null) return { ok: false, message: error.message };

  // Só depois de o servidor confirmar: se limpar antes e a chamada falhar, o
  // aparelho ficaria achando que não tem conta enquanto ela continua lá.
  forgetAccount(db, session.user.id);
  await supabase.auth.signOut();

  return { ok: true };
}
