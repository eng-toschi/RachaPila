import { installRandomSource } from '@/state/randomPolyfill';

// Antes de qualquer import que possa gerar um id: o Hermes não tem `crypto`.
installRandomSource();

// O Supabase (e o WHATWG fetch por baixo dele) espera um `URL` completo. O
// Hermes tem uma implementação parcial que já causou bug em outro projeto
// desta mesma stack — o polyfill substitui por uma implementação testada,
// antes de qualquer código que possa construir uma URL.
import 'react-native-url-polyfill/auto';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { linkParticipantToUser } from '@/commands';
import { findMe, listTrips, localActorId, setLinkedUserId } from '@/db/repositories';
import { AuthProvider, useAuth } from '@/state/auth';
import { DatabaseProvider, useDatabase } from '@/state/database';
import { SyncProvider } from '@/state/sync';
import { ThemeProvider, useTheme, useThemeControl } from '@/ui/theme';

void SplashScreen.preventAutoHideAsync();

/**
 * Qual rota é o chão da pilha.
 *
 * Sem isto, quem chega a uma tela por fora da navegação normal — link de
 * convite `rachapila://`, `router.replace` saindo de uma modal, ou o sistema
 * reabrindo o app direto numa rota — cai numa pilha de um item só. A seta de
 * voltar então não falha: ela não faz nada, porque não há o que desempilhar.
 * Declarando a âncora, o router materializa a home embaixo e o voltar tem
 * para onde ir.
 *
 * A chave é `anchor`; `initialRouteName` é o nome antigo, ainda aceito.
 */
export const unstable_settings = { anchor: 'index' };

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Sem esperar a fonte, a primeira pintura sai na fonte do sistema e troca na
  // cara do usuário — o pulo é mais feio que a espera.
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <ThemeProvider>
          <AuthProvider>
            <SyncProvider>
              <Navigation />
            </SyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

function Navigation() {
  const palette = useTheme();
  const { isDark } = useThemeControl();
  const { session } = useAuth();
  const { db, mutate } = useDatabase();

  useEffect(() => {
    if (session === null) return;
    const userId = session.user.id;

    /**
     * Migração de identidade (ver DECISIONS.md, migração `linked_user_id`):
     * um participante "Você" criado antes do login existir tem
     * `user_id = actor_id do aparelho`, um valor que não significa nada pro
     * Supabase. Assim que a sessão chega, troca isso pelo id de verdade em
     * toda viagem local — sem isso, `push_participant` falha com violação de
     * chave estrangeira na primeira sincronização.
     */
    mutate((database, ctx) => {
      setLinkedUserId(database, userId);
      const myActorId = localActorId(database);
      for (const trip of listTrips(database)) {
        const me = findMe(database, trip.id);
        if (me !== undefined && me.user_id === myActorId) {
          linkParticipantToUser(database, ctx, { participantId: me.id, userId });
        }
      }
    });
  }, [session, db, mutate]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="login" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="trip/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen
          name="trip/[id]/expense/new"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="trip/[id]/expense/[expenseId]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  );
}
