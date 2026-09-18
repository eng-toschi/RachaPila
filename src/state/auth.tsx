/**
 * Sessão do Supabase, disponível para a UI (Fase 6 — spec §11 "Entrada").
 *
 * Mesmo desenho do `DatabaseProvider`: um contexto, um provider, hooks finos.
 * A diferença é que aqui existe um estado de carregamento de verdade —
 * `getSession()` lê do SecureStore antes de saber se há sessão — algo que o
 * SQLite local nunca precisou, por isso o `DatabaseProvider` não tem.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';

/**
 * Para onde o Supabase manda o link mágico de volta.
 *
 * `Linking.createURL` resolve para o esquema certo em cada ambiente: um
 * `exp://<ip>:<porta>/--/` dentro do Expo Go (muda a cada `expo start`), ou
 * `rachapila://` num build de verdade. Por isso o link de redirect precisa
 * estar cadastrado como PADRÃO (`exp://**` e `rachapila://**`) em
 * Authentication → URL Configuration, não como texto fixo.
 */
export const AUTH_REDIRECT_URL = Linking.createURL('/');

export type SignInResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

interface AuthStore {
  readonly session: Session | null;
  /** Só é `true` durante a leitura inicial do SecureStore, uma vez por abertura do app. */
  readonly loading: boolean;
  readonly signInWithEmail: (email: string) => Promise<SignInResult>;
  readonly signOut: () => Promise<void>;
  /**
   * Depuração temporária (ver DECISIONS.md): erro da última troca de código
   * PKCE por sessão, quando o link mágico volta pro app mas a sessão não
   * fecha. `undefined` = nenhuma tentativa ainda nesta abertura do app.
   */
  readonly lastExchangeError: string | undefined;
}

const AuthContext = createContext<AuthStore | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastExchangeError, setLastExchangeError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    /**
     * O link mágico chega como deep link, não como navegação de navegador —
     * é por isso que `detectSessionInUrl` está desligado no cliente (isso é
     * coisa de web). Aqui a URL completa (com o `code` da PKCE) é entregue à
     * mão para o Supabase trocar por uma sessão.
     */
    const completeSignIn = (url: string, retriesLeft = 2): void => {
      if (!url.includes('code=')) return;
      void supabase.auth.exchangeCodeForSession(url).then(({ error }) => {
        /**
         * A troca do código costuma falhar uma vez por um soluço de rede bem
         * na hora em que o Safari devolve o controle pro app (visto ao vivo:
         * "network connection was lost"). Se a falha for de rede e o código
         * ainda não tiver sido usado, vale tentar de novo antes de desistir.
         */
        if (error !== null && retriesLeft > 0 && /network/iu.test(error.message)) {
          setTimeout(() => { completeSignIn(url, retriesLeft - 1); }, 1500);
          return;
        }
        setLastExchangeError(error === null ? undefined : `${error.message} (${url})`);
      });
    };

    void Linking.getInitialURL().then((url) => {
      if (url !== null) completeSignIn(url);
    });
    const linkListener = Linking.addEventListener('url', ({ url }) => { completeSignIn(url); });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
      linkListener.remove();
    };
  }, []);

  const value = useMemo<AuthStore>(
    () => ({
      session,
      loading,
      lastExchangeError,
      signInWithEmail: async (email) => {
        setLastExchangeError(undefined);
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: AUTH_REDIRECT_URL },
        });
        return error === null ? { ok: true } : { ok: false, message: error.message };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, lastExchangeError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthStore {
  const store = useContext(AuthContext);
  if (store === undefined) throw new Error('useAuth fora do AuthProvider.');
  return store;
}
