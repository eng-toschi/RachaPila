/**
 * Sincronização automática (spec §10).
 *
 * Sem isto, a Fase 6 existe mas não serve: dois amigos lançando despesa na
 * mesma viagem não veem um ao outro até alguém gerar um convite. Aqui ficam
 * os três gatilhos que fazem os dados andarem sozinhos:
 *
 *  - **Empurrar** o que mudou aqui, alguns segundos depois de mudar. O sinal
 *    é o `ops_outbox` ter linha pendente — não a tela ter re-renderizado —,
 *    então aplicar o que veio do servidor não dispara um push de volta.
 *  - **Puxar** ao abrir uma viagem e ao voltar pro app. É quando a pessoa
 *    está olhando, que é quando estar desatualizado incomoda.
 *  - **Repetir** com espera crescente quando falha (1s → 5min, §10), porque
 *    a falha normal é rede ruim de viagem, não erro de programa.
 *
 * Só sincroniza viagem que alguém compartilhou (`listSyncedTripIds`) — ver o
 * comentário lá sobre isto ser opt-in.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { isTripSynced, listSyncedTripIds } from '@/db/repositories';
import { pullTrip, pushTrip, type SyncError } from '@/sync/client';
import { pendingCount } from '@/sync/outbox';
import { useAuth } from './auth';
import { useDatabase } from './database';

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncStore {
  readonly status: SyncStatus;
  readonly lastError: string | undefined;
  /** Puxa e empurra uma viagem agora. Não faz nada se ninguém a compartilhou. */
  readonly syncNow: (tripId: string) => void;
}

const SyncContext = createContext<SyncStore | undefined>(undefined);

/** Espera antes de empurrar: agrupa uma rajada de edições num envio só. */
const PUSH_DELAY_MS = 2_000;

/** §10: exponencial até cinco minutos. O último valor se repete daí em diante. */
const BACKOFF_MS = [1_000, 2_000, 5_000, 15_000, 60_000, 300_000] as const;

function describe(error: SyncError): string {
  switch (error.code) {
    case 'not_logged_in':
      return 'Você saiu da conta.';
    case 'push_failed':
    case 'pull_failed':
      return error.message;
  }
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { db, revision, mutate } = useDatabase();

  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastError, setLastError] = useState<string | undefined>(undefined);

  // Refs, não estado: mudar isto não pode re-renderizar nem recriar `run`,
  // senão o próprio efeito que agenda o push vira um laço.
  const running = useRef(false);
  const failures = useRef(0);
  const retry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const run = useCallback(
    async (tripIds: readonly string[], alsoPull: boolean): Promise<void> => {
      if (session === null || running.current || tripIds.length === 0) return;

      running.current = true;
      setStatus('syncing');

      let applied = false;
      let failure: SyncError | undefined;

      try {
        for (const tripId of tripIds) {
          const pushed = await pushTrip(db, tripId);
          if (!pushed.ok) {
            failure = pushed.error;
            break;
          }
          if (!alsoPull) continue;

          const pulled = await pullTrip(db, tripId);
          if (!pulled.ok) {
            failure = pulled.error;
            break;
          }
          applied = true;
        }
      } catch (error) {
        // `pushTrip`/`pullTrip` devolvem Result em vez de lançar, mas o que
        // está por baixo (rede, Supabase) pode estourar de um jeito que eles
        // não preveem. Sem este catch, a trava abaixo ficaria presa e a
        // sincronização morreria em silêncio pelo resto da sessão.
        failure = { code: 'push_failed', message: error instanceof Error ? error.message : String(error) };
      } finally {
        running.current = false;
      }

      // O pull grava direto no SQLite, fora de `mutate` — sem este empurrão
      // as telas continuariam mostrando o estado de antes.
      if (applied) mutate(() => undefined);

      if (failure === undefined) {
        failures.current = 0;
        setStatus('idle');
        setLastError(undefined);
        return;
      }

      setStatus('error');
      setLastError(describe(failure));

      // Sair da conta não é falha de rede: insistir não resolveria nada.
      if (failure.code === 'not_logged_in') return;

      const wait = BACKOFF_MS[Math.min(failures.current, BACKOFF_MS.length - 1)] ?? 300_000;
      failures.current += 1;
      clearTimeout(retry.current);
      retry.current = setTimeout(() => {
        void run(listSyncedTripIds(db), true);
      }, wait);
    },
    [db, mutate, session],
  );

  /**
   * Empurrar: o gatilho é existir operação pendente, conferido a cada escrita
   * local (`revision`). Aplicar dados vindos do servidor não cria operação —
   * é isso que impede o eco de ficar indo e voltando para sempre.
   */
  useEffect(() => {
    if (session === null || pendingCount(db) === 0) return;

    const timer = setTimeout(() => {
      void run(listSyncedTripIds(db), false);
    }, PUSH_DELAY_MS);

    return () => { clearTimeout(timer); };
  }, [revision, session, db, run]);

  /** Puxar ao voltar pro app: o celular ficou no bolso, o grupo não parou. */
  useEffect(() => {
    if (session === null) return;

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void run(listSyncedTripIds(db), true);
    });

    return () => { subscription.remove(); };
  }, [session, db, run]);

  /** Uma sincronização ao entrar, para quem abre o app já com a viagem aberta. */
  useEffect(() => {
    if (session === null) return;
    void run(listSyncedTripIds(db), true);
  }, [session, db, run]);

  useEffect(() => () => { clearTimeout(retry.current); }, []);

  const value = useMemo<SyncStore>(
    () => ({
      status,
      lastError,
      syncNow: (tripId) => {
        if (!isTripSynced(db, tripId)) return;
        void run([tripId], true);
      },
    }),
    [status, lastError, db, run],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncStore {
  const store = useContext(SyncContext);
  if (store === undefined) throw new Error('useSync fora do SyncProvider.');
  return store;
}
