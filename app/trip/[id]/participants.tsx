import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addParticipant, updateParticipant } from '@/commands';
import { findMe, listParticipants, participantHasExpenses } from '@/db/repositories';
import { maskPixKey, parsePixKey } from '@/domain/pix';
import { createInvite } from '@/services/invites';
import { useAuth } from '@/state/auth';
import { useDatabase, useMutate, useQuery } from '@/state/database';
import { Avatar, Button, Card, Divider, Row, Text } from '@/ui/components';
import { IconBack, IconCheck, IconInfo, IconPlus } from '@/ui/icons';
import { useTheme } from '@/ui/theme';
import { MIN_TOUCH, RADIUS, SPACING } from '@/ui/tokens';

export default function ParticipantsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const mutate = useMutate();
  const { db } = useDatabase();
  const { session } = useAuth();
  const params = useLocalSearchParams();
  const tripId = typeof params.id === 'string' ? params.id : '';

  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | undefined>(undefined);
  const [pixDraft, setPixDraft] = useState('');
  const [pixError, setPixError] = useState<string | undefined>(undefined);
  const [invitingId, setInvitingId] = useState<string | undefined>(undefined);
  const [inviteError, setInviteError] = useState<string | undefined>(undefined);

  const people = useQuery((database) =>
    listParticipants(database, tripId).map((p) => ({
      id: p.id,
      name: p.display_name,
      seed: p.avatar_seed,
      pixKey: p.pix_key,
      pixKind: p.pix_key_kind,
      isMe: findMe(database, tripId)?.id === p.id,
      linked: p.user_id !== null,
      archived: p.archived_at !== null,
      hasExpenses: participantHasExpenses(database, p.id),
    })),
  );

  /**
   * "Excluir" aqui é arquivar, nunca apagar de verdade (§10 — tombstone):
   * despesa já lançada com essa pessoa não pode sumir, ou o fechamento de
   * quem ficou quebra. Quem nunca lançou nada some da lista sem ressalva;
   * quem já tem histórico precisa saber que ele permanece.
   */
  const toggleArchive = (participantId: string, name: string, archived: boolean, hasExpenses: boolean): void => {
    if (archived) {
      mutate((db, ctx) => updateParticipant(db, ctx, { participantId, archived: false }));
      return;
    }

    Alert.alert(
      `Remover ${name} da viagem?`,
      hasExpenses
        ? `${name} já aparece em despesas lançadas — isso continua valendo para o saldo e o histórico. Só deixa de aparecer para novas despesas. Dá para trazer de volta depois.`
        : `${name} ainda não tem despesa nenhuma. Dá para trazer de volta depois, se precisar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            mutate((db, ctx) => updateParticipant(db, ctx, { participantId, archived: true }));
          },
        },
      ],
    );
  };

  const invite = async (participantId?: string): Promise<void> => {
    setInvitingId(participantId ?? 'trip');
    setInviteError(undefined);
    const result = await createInvite(db, tripId, participantId);
    setInvitingId(undefined);
    if (!result.ok) {
      setInviteError(result.message);
      return;
    }
    // Sem o link `https://` da Fase 7 (exige hospedar a página do convite), o
    // `rachapila://` vira texto morto em WhatsApp e afins — nenhum app deles
    // transforma esquema customizado em link tocável. Mandar o código na
    // frente é o que de fato funciona hoje; o link some da mensagem até
    // existir uma página de verdade para receber quem ainda não tem o app.
    await Share.share({
      message:
        `Entra na nossa viagem no RachaPila!\n\n` +
        `Código do convite: ${result.token}\n\n` +
        `No app, toque no ícone de pessoa na tela inicial → "Tenho um convite" → cole o código.`,
    });
  };

  const add = (): void => {
    const name = draft.trim();
    if (name === '') return;
    mutate((db, ctx) => addParticipant(db, ctx, { tripId, displayName: name }));
    setDraft('');
  };

  const savePix = (participantId: string): void => {
    const parsed = parsePixKey(pixDraft);
    if (!parsed.ok) {
      setPixError(
        parsed.error.code === 'invalid_cpf'
          ? 'CPF inválido — confira os dígitos.'
          : parsed.error.code === 'invalid_cnpj'
            ? 'CNPJ inválido — confira os dígitos.'
            : 'Não reconheci essa chave. Use CPF, e-mail, telefone ou chave aleatória.',
      );
      return;
    }
    const name = people.find((p) => p.id === participantId)?.name ?? '';
    mutate((db, ctx) =>
      updateParticipant(db, ctx, {
        participantId,
        pixKey: parsed.value.value,
        pixKeyKind: parsed.value.kind,
        pixName: name,
      }),
    );
    setEditing(undefined);
    setPixDraft('');
    setPixError(undefined);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingTop: insets.top + SPACING.sm, paddingHorizontal: SPACING.xl }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => { router.back(); }} hitSlop={12}>
            <IconBack size={24} color={t.text} />
          </Pressable>
          <Text variant="title">Participantes</Text>
          <View style={{ width: 24 }} />
        </Row>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SPACING.xl,
          paddingTop: SPACING.lg,
          paddingBottom: insets.bottom + 110,
          gap: SPACING.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Card padded={false}>
          {people.map((person, index) => (
            <View key={person.id}>
              {index === 0 ? null : <Divider />}
              <View style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm }}>
                <Row>
                  <Avatar name={person.name} seed={person.seed} size={38} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="body" strong={person.isMe} tone={person.archived ? 'faint' : 'default'}>
                      {person.name}
                      {person.isMe ? ' · você' : ''}
                      {person.archived ? ' · removido' : ''}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {person.pixKey === null
                        ? 'sem Pix cadastrado'
                        : `Pix ${maskPixKey({ kind: (person.pixKind ?? 'random') as 'cpf', value: person.pixKey })}`}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Editar Pix de ${person.name}`}
                    hitSlop={10}
                    onPress={() => {
                      setEditing(editing === person.id ? undefined : person.id);
                      setPixDraft('');
                      setPixError(undefined);
                    }}
                  >
                    <Text variant="label" tone="accent">
                      {person.pixKey === null ? 'Cadastrar' : 'Trocar'}
                    </Text>
                  </Pressable>
                </Row>

                {person.isMe ? null : (
                  <Row gap={SPACING.lg}>
                    {session !== null && !person.linked && !person.archived ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Convidar ${person.name}`}
                        onPress={() => { void invite(person.id); }}
                        disabled={invitingId !== undefined}
                      >
                        <Text variant="label" tone="accent">
                          {invitingId === person.id ? 'Gerando convite…' : `Convidar ${person.name}`}
                        </Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={person.archived ? `Trazer ${person.name} de volta` : `Remover ${person.name}`}
                      onPress={() => { toggleArchive(person.id, person.name, person.archived, person.hasExpenses); }}
                    >
                      <Text variant="label" tone={person.archived ? 'muted' : 'negative'}>
                        {person.archived ? 'Trazer de volta' : 'Remover'}
                      </Text>
                    </Pressable>
                  </Row>
                )}

                {editing === person.id ? (
                  <View style={{ gap: SPACING.sm }}>
                    <Row>
                      <TextInput
                        value={pixDraft}
                        onChangeText={(text) => {
                          setPixDraft(text);
                          setPixError(undefined);
                        }}
                        placeholder="CPF, e-mail, telefone ou chave aleatória"
                        placeholderTextColor={t.textFaint}
                        autoCapitalize="none"
                        accessibilityLabel="Chave Pix"
                        style={{
                          flex: 1,
                          minHeight: MIN_TOUCH,
                          fontSize: 15,
                          color: t.text,
                          backgroundColor: t.surfaceAlt,
                          borderRadius: RADIUS.md,
                          paddingHorizontal: SPACING.md,
                        }}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Salvar chave Pix"
                        onPress={() => { savePix(person.id); }}
                        style={{ backgroundColor: t.accent, borderRadius: RADIUS.pill, padding: 11 }}
                      >
                        <IconCheck size={16} color={t.onAccent} />
                      </Pressable>
                    </Row>
                    {pixError === undefined ? null : (
                      <Text variant="caption" tone="negative">
                        {pixError}
                      </Text>
                    )}
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </Card>

        <Card>
          <Row>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={add}
              returnKeyType="done"
              placeholder="Adicionar alguém pelo nome"
              placeholderTextColor={t.textFaint}
              accessibilityLabel="Nome do participante"
              style={{ flex: 1, fontSize: 15.5, color: t.text, minHeight: MIN_TOUCH }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adicionar participante"
              onPress={add}
              style={{ backgroundColor: t.accentSoft, borderRadius: RADIUS.pill, padding: 9 }}
            >
              <IconPlus size={18} color={t.accent} />
            </Pressable>
          </Row>
        </Card>

        {session === null ? (
          <Card style={{ backgroundColor: t.surfaceAlt }}>
            <Row style={{ alignItems: 'flex-start' }}>
              <IconInfo size={18} color={t.textMuted} />
              <Text variant="caption" tone="muted" style={{ flex: 1, lineHeight: 18 }}>
                Entre na sua conta (ícone de pessoa na home) para convidar alguém pra esta viagem.
              </Text>
            </Row>
          </Card>
        ) : (
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="body" strong>
                  Convidar por link
                </Text>
                <Text variant="caption" tone="muted">
                  Quem entrar escolhe quem é na viagem — não cria gente nova à toa.
                </Text>
              </View>
              <Button
                label={invitingId === 'trip' ? 'Gerando…' : 'Convidar'}
                variant="secondary"
                onPress={() => { void invite(undefined); }}
                disabled={invitingId !== undefined}
              />
            </Row>
          </Card>
        )}

        {inviteError === undefined ? null : (
          <Text variant="caption" tone="negative">
            {inviteError}
          </Text>
        )}
      </ScrollView>

      <View style={{ position: 'absolute', left: SPACING.xl, right: SPACING.xl, bottom: insets.bottom + SPACING.lg }}>
        <Button label="Voltar para a viagem" variant="secondary" onPress={() => { router.back(); }} />
      </View>
    </View>
  );
}
