/**
 * Aceitar convite (spec §7.2).
 *
 * Convite direcionado: `accept_trip_invite` já vincula o fantasma certo do
 * lado do servidor, então depois de puxar a viagem a pessoa já é alguém
 * reconhecível aqui — segue direto pra viagem. Convite genérico: ninguém é
 * vinculado sozinho (regra "não existe entrada silenciosa"), então a tela
 * pergunta "quem é você?" entre os fantasmas ainda soltos, com a opção de
 * dizer que é gente nova.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addParticipant, linkParticipantToUser } from '@/commands';
import { listActiveParticipants } from '@/db/repositories';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/state/auth';
import { useDatabase } from '@/state/database';
import { pullTrip, pushTrip } from '@/sync/client';
import { Avatar, Button, Card, Divider, Row, Text } from '@/ui/components';
import { IconUser } from '@/ui/icons';
import { useTheme } from '@/ui/theme';
import { MIN_TOUCH, RADIUS, SPACING } from '@/ui/tokens';

type Step = 'checking' | 'need_login' | 'accepting' | 'choose_identity' | 'new_here' | 'error';

export default function JoinScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { session, loading: authLoading } = useAuth();
  const { db, mutate } = useDatabase();
  const params = useLocalSearchParams();
  const token = typeof params.token === 'string' ? params.token : '';

  const [step, setStep] = useState<Step>('checking');
  const [message, setMessage] = useState('');
  const [tripId, setTripId] = useState<string | undefined>(undefined);
  const [ghosts, setGhosts] = useState<{ id: string; name: string; seed: string }[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authLoading || token === '') return;
    if (session === null) {
      setStep('need_login');
      return;
    }
    setStep((current) => (current === 'need_login' || current === 'checking' ? 'accepting' : current));
  }, [authLoading, session, token]);

  const cancelledRef = useRef(false);

  useEffect(() => {
    if (step !== 'accepting' || session === null) return;
    cancelledRef.current = false;

    void (async () => {
      const { data, error } = (await supabase.rpc('accept_trip_invite', { invite_token: token })) as {
        readonly data: string | null;
        readonly error: { readonly message: string } | null;
      };
      if (cancelledRef.current) return;
      if (error !== null || typeof data !== 'string') {
        setMessage(error?.message ?? 'Não consegui aceitar o convite.');
        setStep('error');
        return;
      }

      const pullResult = await pullTrip(db, data);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (cancelledRef.current) return;
      if (!pullResult.ok) {
        setMessage('Convite aceito, mas não consegui baixar os dados da viagem agora. Abra a viagem de novo em instantes.');
        setStep('error');
        return;
      }

      setTripId(data);
      const already = listActiveParticipants(db, data).find((p) => p.user_id === session.user.id);
      if (already !== undefined) {
        router.replace(`/trip/${data}`);
        return;
      }

      setGhosts(
        listActiveParticipants(db, data)
          .filter((p) => p.user_id === null)
          .map((p) => ({ id: p.id, name: p.display_name, seed: p.avatar_seed })),
      );
      setStep('choose_identity');
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, [step, session, token, db]);

  const finish = (destinationTripId: string): void => {
    void pushTrip(db, destinationTripId);
    router.replace(`/trip/${destinationTripId}`);
  };

  const chooseGhost = (participantId: string): void => {
    if (session === null || tripId === undefined) return;
    mutate((database, ctx) => linkParticipantToUser(database, ctx, { participantId, userId: session.user.id }));
    finish(tripId);
  };

  const confirmNewHere = (): void => {
    const trimmed = name.trim();
    if (trimmed === '' || session === null || tripId === undefined) return;
    setBusy(true);
    mutate((database, ctx) =>
      addParticipant(database, ctx, { tripId, displayName: trimmed, userId: session.user.id }),
    );
    finish(tripId);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View
        style={{
          paddingTop: insets.top + SPACING.lg,
          paddingHorizontal: SPACING.xl,
          paddingBottom: insets.bottom + SPACING.xl,
          flex: 1,
          gap: SPACING.lg,
        }}
      >
        {step === 'checking' || step === 'accepting' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md }}>
            <ActivityIndicator color={t.textFaint} />
            <Text variant="caption" tone="muted">
              Entrando na viagem…
            </Text>
          </View>
        ) : null}

        {step === 'need_login' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: RADIUS.pill,
                backgroundColor: t.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconUser size={28} color={t.accent} />
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text variant="title">Entre pra aceitar o convite</Text>
              <Text variant="caption" tone="muted" style={{ textAlign: 'center', maxWidth: 280 }}>
                Assim que você entrar, a gente continua daqui automaticamente.
              </Text>
            </View>
            <Button label="Entrar" onPress={() => { router.push('/login'); }} />
          </View>
        ) : null}

        {step === 'error' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg }}>
            <Text variant="title">Não deu certo</Text>
            <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
              {message}
            </Text>
            <Button label="Voltar" variant="secondary" onPress={() => { router.back(); }} />
          </View>
        ) : null}

        {step === 'choose_identity' ? (
          <ScrollView contentContainerStyle={{ gap: SPACING.lg, paddingTop: SPACING.xxl }}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text variant="title">Quem é você?</Text>
              <Text variant="caption" tone="muted" style={{ textAlign: 'center', maxWidth: 300 }}>
                Escolha seu nome na lista pra herdar o que já foi lançado por você, ou diga que é
                gente nova na viagem.
              </Text>
            </View>

            {ghosts.length > 0 ? (
              <Card padded={false}>
                {ghosts.map((ghost, index) => (
                  <View key={ghost.id}>
                    {index === 0 ? null : <Divider />}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => { chooseGhost(ghost.id); }}
                      style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }}
                    >
                      <Row>
                        <Avatar name={ghost.name} seed={ghost.seed} size={38} />
                        <Text variant="body" style={{ flex: 1 }}>
                          Sou {ghost.name}
                        </Text>
                      </Row>
                    </Pressable>
                  </View>
                ))}
              </Card>
            ) : null}

            <Pressable accessibilityRole="button" onPress={() => { setStep('new_here'); }}>
              <Text variant="label" tone="accent" style={{ textAlign: 'center' }}>
                Sou novo aqui
              </Text>
            </Pressable>
          </ScrollView>
        ) : null}

        {step === 'new_here' ? (
          <View style={{ flex: 1, justifyContent: 'center', gap: SPACING.lg }}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text variant="title">Como te chamam na viagem?</Text>
            </View>
            <Card style={{ paddingVertical: SPACING.md }}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                placeholderTextColor={t.textFaint}
                autoFocus
                accessibilityLabel="Seu nome"
                style={{ fontSize: 16, color: t.text, minHeight: MIN_TOUCH - 12 }}
              />
            </Card>
            <Button
              label={busy ? 'Entrando…' : 'Entrar na viagem'}
              onPress={confirmNewHere}
              disabled={name.trim() === '' || busy}
            />
            <Pressable accessibilityRole="button" onPress={() => { setStep('choose_identity'); }}>
              <Text variant="label" tone="muted" style={{ textAlign: 'center' }}>
                Voltar
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
