/**
 * Sessão do Supabase, disponível para a UI (Fase 6 — spec §11 "Entrada").
 *
 * Mesmo desenho do `DatabaseProvider`: um contexto, um provider, hooks finos.
 * A diferença é que aqui existe um estado de carregamento de verdade —
 * `getSession()` lê do SecureStore antes de saber se há sessão — algo que o
 * SQLite local nunca precisou, por isso o `DatabaseProvider` não tem.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
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

/**
 * Repete uma vez quando a falha é de rede, e não de credencial.
 *
 * O primeiro pedido de um app recém-aberto falha de vez em quando com
 * "network connection was lost" — já documentado adiante, na troca do código
 * do link mágico, onde isso foi visto ao vivo. As entradas por código e por
 * senha nasceram sem essa proteção, e são justamente as que o revisor da
 * Apple usa: ali um soluço não é um aborrecimento, é uma reprovação e mais
 * duas semanas.
 *
 * Só repete erro de rede. Senha errada ou código vencido continuam
 * respondendo na hora — insistir neles seria esconder a resposta certa.
 */
async function comUmaSegundaChance(
  tentar: () => Promise<{ error: { message: string } | null }>,
): Promise<{ error: { message: string } | null }> {
  const primeira = await tentar();
  if (primeira.error === null || !/network|connection/iu.test(primeira.error.message)) {
    return primeira;
  }
  await new Promise((resolva) => setTimeout(resolva, 1200));
  return tentar();
}

interface AuthStore {
  readonly session: Session | null;
  /** Só é `true` durante a leitura inicial do SecureStore, uma vez por abertura do app. */
  readonly loading: boolean;
  readonly signInWithEmail: (email: string) => Promise<SignInResult>;
  /**
   * Entrada pelo código numérico que vem no mesmo e-mail do link.
   *
   * Existe porque o link sozinho não basta, e a reprovação 2.1(a) da Apple em
   * 06/10/2026 mostrou isso: "não conseguimos acessar o app porque o link de
   * confirmação não funcionava". Link mágico é de uso único, e há dois jeitos
   * comuns de ele morrer antes de a pessoa tocar nele — filtro de segurança
   * de e-mail que abre os links para checar, e e-mail lido num aparelho
   * diferente do que pediu (o PKCE guarda o verificador em quem pediu).
   *
   * O código não depende de deep link, não é de uso único por pré-abertura e
   * funciona mesmo que o e-mail seja lido noutro lugar.
   */
  readonly signInWithCode: (email: string, code: string) => Promise<SignInResult>;
  /**
   * Entrada por senha, para quem tiver uma.
   *
   * Nasceu da segunda reprovação da Apple, em 09/10/2026: "não conseguimos
   * acessar o app porque o e-mail de confirmação não foi enviado". Enquanto a
   * única porta depender de uma mensagem chegar, a revisão depende de algo
   * fora do nosso alcance — e eles pedem, por diretriz, credenciais que
   * funcionem sempre.
   *
   * Não é a porta principal e não há cadastro de senha no app: quem entra por
   * e-mail nunca precisa saber que isto existe. Serve a quem recebeu uma senha
   * definida no painel, e a quem simplesmente não consegue receber e-mail.
   */
  readonly signInWithPassword: (email: string, password: string) => Promise<SignInResult>;
  readonly signOut: () => Promise<void>;
  /** Último erro do link mágico, para a tela poder explicar em vez de ficar muda. */
  readonly linkError: string | undefined;
  readonly clearLinkError: () => void;
}

const AuthContext = createContext<AuthStore | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState<string | undefined>(undefined);

  /**
   * Religa a renovação do token a cada volta para o primeiro plano.
   *
   * `autoRefreshToken: true` no cliente só mantém um timer enquanto o
   * JavaScript está rodando. Em app de celular o JavaScript para quando o app
   * vai para segundo plano, e o Supabase **não** retoma sozinho ao voltar —
   * é preciso chamar `startAutoRefresh` à mão. Sem isso, passada a validade
   * do access token (uma hora), a sessão simplesmente morre, e a pessoa é
   * jogada de volta para a tela de entrada sem nenhuma explicação.
   *
   * Foi o que apareceu no teste com a família: "perdeu login em pouco tempo".
   */
  useEffect(() => {
    if (AppState.currentState === 'active') void supabase.auth.startAutoRefresh();

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    });

    return () => {
      subscription.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, []);

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
     * coisa de web). `exchangeCodeForSession` espera só o valor do `code`,
     * não a URL inteira (documentado assim em `@supabase/auth-js`, embora
     * versões antigas da lib aceitassem a URL) — mandar a URL inteira faz o
     * servidor receber um `auth_code` inválido e responder "invalid flow
     * state", com o app parecendo travado sem pista nenhuma do motivo.
     */
    const completeSignIn = (url: string, retriesLeft = 2): void => {
      if (!url.includes('code=')) return;
      const code = new URL(url).searchParams.get('code');
      if (code === null) return;
      void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
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
        if (error !== null) {
          /**
           * Antes isto era só um `console.warn`, e a pessoa voltava do e-mail
           * para uma tela idêntica à que tinha deixado — sem erro, sem aviso,
           * sem saída. Foi assim que o revisor da Apple concluiu que não dava
           * para acessar o app. Falha silenciosa em caminho de login é falha
           * dupla: a de entrar, e a de não contar por quê.
           */
          console.warn('[auth] falha ao trocar código do link mágico por sessão:', error.message);
          setLinkError(
            'O link não funcionou — ele vale uma vez só, e expira em uma hora. ' +
              'Use o código do mesmo e-mail, ou peça um link novo.',
          );
        }
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
      signInWithEmail: async (email) => {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: AUTH_REDIRECT_URL },
        });
        return error === null ? { ok: true } : { ok: false, message: error.message };
      },
      signInWithCode: async (email, code) => {
        const token = code.replace(/\D/gu, '');

        /**
         * Tenta como entrada e, se não colar, como cadastro.
         *
         * O Supabase trata e-mail novo e e-mail conhecido como fluxos
         * diferentes: quem já existe recebe o template "Magic link or OTP";
         * quem chega pela primeira vez recebe o "Confirm signup", e a
         * verificação correspondente é de tipo `signup`. Isso não aparece em
         * teste feito com a própria conta, porque ela já existe — foi assim
         * que escapou até a segunda reprovação da Apple, em 09/10/2026, cujo
         * relato dizia exatamente "ao tentar criar uma conta nova".
         *
         * Tentar os dois tipos custa uma chamada a mais só quando a primeira
         * falha, e livra o app de depender de qual caminho o servidor
         * escolheu.
         */
        const primeira = await comUmaSegundaChance(() =>
          supabase.auth.verifyOtp({ email, token, type: 'email' }),
        );
        if (primeira.error === null) return { ok: true };

        const segunda = await comUmaSegundaChance(() =>
          supabase.auth.verifyOtp({ email, token, type: 'signup' }),
        );
        if (segunda.error === null) return { ok: true };

        return { ok: false, message: primeira.error.message };
      },
      signInWithPassword: async (email, password) => {
        const { error } = await comUmaSegundaChance(() =>
          supabase.auth.signInWithPassword({ email, password }),
        );
        if (error === null) return { ok: true };
        /**
         * A maioria das contas aqui nunca teve senha — elas nascem do link
         * mágico. O Supabase responde a isso com "invalid login credentials",
         * que faria a pessoa procurar erro de digitação numa senha que ela
         * nunca criou. Melhor dizer o que de fato acontece.
         */
        const semSenha = /invalid login credentials/iu.test(error.message);
        return {
          ok: false,
          message: semSenha
            ? 'E-mail ou senha não conferem. Se você nunca criou uma senha, entre pelo código enviado por e-mail.'
            : error.message,
        };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      linkError,
      clearLinkError: () => { setLinkError(undefined); },
    }),
    [session, loading, linkError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthStore {
  const store = useContext(AuthContext);
  if (store === undefined) throw new Error('useAuth fora do AuthProvider.');
  return store;
}
