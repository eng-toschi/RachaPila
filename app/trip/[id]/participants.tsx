import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addParticipant, updateParticipant } from '@/commands';
import { findMe, listParticipants, participantHasExpenses } from '@/db/repositories';
import { maskPixKey, parsePixKey } from '@/domain/pix';
import { createInvite, inviteUrl } from '@/services/invites';
import { useAuth } from '@/state/auth';
import { useDatabase, useMutate, useQuery } from '@/state/database';
import { Avatar, Badge, Button, Card, Divider, Row, Text } from '@/ui/components';
import { IconBack, IconCheck, IconChevron, IconInfo, IconPlus } from '@/ui/icons';
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
  const [nameDraft, setNameDraft] = useState('');
  const [pixDraft, setPixDraft] = useState('');
  const [editError, setEditError] = useState<string | undefined>(undefined);
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
            closeEditor();
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
    // Link `https://`, não `rachapila://`: nenhum app de mensagem transforma
    // esquema customizado em link tocável, então o deep link cru virava texto
    // morto. A página do convite resolve os dois lados — abre o app sozinha
    // para quem já tem, e leva à loja quem ainda não tem. O código não vai
    // mais na mensagem porque a página o mostra, e mensagem curta é mais
    // provável de ser lida até o fim.
    await Share.share({
      message:
        `Entra na nossa viagem no RachaPila!\n\n` +
        `${inviteUrl(result.token)}\n\n` +
        `O link abre o app. Se você ainda não tem, ele leva para baixar.`,
    });
  };

  const add = (): void => {
    const name = draft.trim();
    if (name === '') return;
    mutate((db, ctx) => addParticipant(db, ctx, { tripId, displayName: name }));
    setDraft('');
  };

  const closeEditor = (): void => {
    setEditing(undefined);
    setNameDraft('');
    setPixDraft('');
    setEditError(undefined);
  };

  /**
   * Uma porta de entrada por linha. Antes havia três ações soltas dentro do
   * card ("Trocar", "Convidar", "Remover") sem hierarquia entre elas, e o nome
   * — o dado mais óbvio de se querer corrigir — não era editável em lugar
   * nenhum. Agora a linha inteira abre um editor, e é lá dentro que tudo mora.
   */
  const openEditor = (participantId: string, name: string, pixKey: string | null): void => {
    if (editing === participantId) {
      closeEditor();
      return;
    }
    setEditing(participantId);
    setNameDraft(name);
    setPixDraft(pixKey ?? '');
    setEditError(undefined);
  };

  /**
   * Salva nome e chave Pix de uma vez: são os dois campos do editor, e separar
   * em dois botões faria a pessoa achar que salvou quando salvou metade.
   * Campo de Pix vazio significa apagar a chave — é como se tira uma chave
   * cadastrada por engano, e não há outro caminho para isso na tela.
   */
  const save = (participantId: string): void => {
    const name = nameDraft.trim();
    if (name === '') {
      setEditError('O nome não pode ficar em branco.');
      return;
    }

    const pix = pixDraft.trim();
    if (pix === '') {
      mutate((db, ctx) =>
        updateParticipant(db, ctx, {
          participantId,
          displayName: name,
          pixKey: null,
          pixKeyKind: null,
          pixName: null,
        }),
      );
      closeEditor();
      return;
    }

    const parsed = parsePixKey(pix);
    if (!parsed.ok) {
      setEditError(
        parsed.error.code === 'invalid_cpf'
          ? 'CPF inválido — confira os dígitos.'
          : parsed.error.code === 'invalid_cnpj'
            ? 'CNPJ inválido — confira os dígitos.'
            : 'Não reconheci essa chave. Use CPF, e-mail, telefone ou chave aleatória.',
      );
      return;
    }

    mutate((db, ctx) =>
      updateParticipant(db, ctx, {
        participantId,
        displayName: name,
        pixKey: parsed.value.value,
        pixKeyKind: parsed.value.kind,
        pixName: name,
      }),
    );
    closeEditor();
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
          {people.map((person, index) => {
            const open = editing === person.id;
            const canInvite = session !== null && !person.linked && !person.archived;
            return (
              <View key={person.id}>
                {index === 0 ? null : <Divider />}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={open ? `Fechar edição de ${person.name}` : `Editar ${person.name}`}
                  accessibilityState={{ expanded: open }}
                  onPress={() => { openEditor(person.id, person.name, person.pixKey); }}
                  style={{
                    paddingHorizontal: SPACING.lg,
                    paddingVertical: SPACING.md,
                    backgroundColor: open ? t.surfaceAlt : 'transparent',
                  }}
                >
                  <Row>
                    <Avatar name={person.name} seed={person.seed} size={38} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Row gap={SPACING.xs}>
                        <Text variant="body" strong={person.isMe} tone={person.archived ? 'faint' : 'default'}>
                          {person.name}
                        </Text>
                        {person.isMe ? <Badge label="você" tone="accent" /> : null}
                        {person.archived ? <Badge label="removido" /> : null}
                      </Row>
                      <Text variant="caption" tone={person.pixKey === null ? 'faint' : 'muted'}>
                        {person.pixKey === null
                          ? 'sem chave Pix'
                          : `Pix ${maskPixKey({ kind: (person.pixKind ?? 'random') as 'cpf', value: person.pixKey })}`}
                      </Text>
                    </View>
                    <Row gap={SPACING.xs}>
                      <Text variant="label" tone="accent">
                        {open ? 'Fechar' : 'Editar'}
                      </Text>
                      <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
                        <IconChevron size={14} color={t.accent} />
                      </View>
                    </Row>
                  </Row>
                </Pressable>

                {open ? (
                  <View
                    style={{
                      paddingHorizontal: SPACING.lg,
                      paddingBottom: SPACING.lg,
                      gap: SPACING.md,
                      backgroundColor: t.surfaceAlt,
                    }}
                  >
                    <View style={{ gap: SPACING.xs }}>
                      <Text variant="overline" tone="muted">
                        Nome
                      </Text>
                      <View style={field(t.surface)}>
                        <TextInput
                          value={nameDraft}
                          onChangeText={(text) => {
                            setNameDraft(text);
                            setEditError(undefined);
                          }}
                          placeholder="Como essa pessoa aparece na viagem"
                          placeholderTextColor={t.textFaint}
                          accessibilityLabel={`Nome de ${person.name}`}
                          numberOfLines={1}
                          style={{ fontSize: 15, color: t.text, padding: 0 }}
                        />
                      </View>
                    </View>

                    <View style={{ gap: SPACING.xs }}>
                      <Text variant="overline" tone="muted">
                        Chave Pix
                      </Text>
                      <View style={field(t.surface)}>
                        <TextInput
                          value={pixDraft}
                          onChangeText={(text) => {
                            setPixDraft(text);
                            setEditError(undefined);
                          }}
                          placeholder="CPF, e-mail, telefone ou chave aleatória"
                          placeholderTextColor={t.textFaint}
                          autoCapitalize="none"
                          autoCorrect={false}
                          accessibilityLabel={`Chave Pix de ${person.name}`}
                          numberOfLines={1}
                          style={{ fontSize: 15, color: t.text, padding: 0 }}
                        />
                      </View>
                      <Text variant="caption" tone="faint">
                        {person.pixKey === null
                          ? 'Serve para o grupo te pagar no fim da viagem. Dá para deixar em branco.'
                          : 'Apagar o campo remove a chave cadastrada.'}
                      </Text>
                    </View>

                    {editError === undefined ? null : (
                      <Text variant="caption" tone="negative">
                        {editError}
                      </Text>
                    )}

                    <Row gap={SPACING.sm}>
                      <Button
                        label="Salvar"
                        icon={<IconCheck size={15} color={t.onAccent} />}
                        onPress={() => { save(person.id); }}
                        style={{ flex: 1 }}
                      />
                      <Button label="Cancelar" variant="secondary" onPress={closeEditor} style={{ flex: 1 }} />
                    </Row>

                    {person.isMe ? null : (
                      <>
                        <Divider />
                        <Row style={{ justifyContent: 'space-between' }}>
                          {canInvite ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Convidar ${person.name}`}
                              onPress={() => { void invite(person.id); }}
                              disabled={invitingId !== undefined}
                              hitSlop={8}
                            >
                              <Text variant="label" tone="accent">
                                {invitingId === person.id ? 'Gerando convite…' : 'Convidar para o app'}
                              </Text>
                            </Pressable>
                          ) : (
                            <Text variant="caption" tone="faint">
                              {person.linked ? 'Já entrou com a própria conta' : ' '}
                            </Text>
                          )}

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={
                              person.archived ? `Trazer ${person.name} de volta` : `Remover ${person.name} da viagem`
                            }
                            onPress={() => {
                              toggleArchive(person.id, person.name, person.archived, person.hasExpenses);
                            }}
                            hitSlop={8}
                          >
                            <Text variant="label" tone={person.archived ? 'muted' : 'negative'}>
                              {person.archived ? 'Trazer de volta' : 'Remover da viagem'}
                            </Text>
                          </Pressable>
                        </Row>
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>

        <Card style={{ paddingVertical: SPACING.md }}>
          <Row>
            {/* Altura no contêiner e `padding: 0` no campo: confiar no
                `minHeight` do próprio TextInput deixava o texto descer até
                encostar na borda do cartão, meio cortado. */}
            <View style={{ flex: 1, height: MIN_TOUCH, justifyContent: 'center' }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={add}
                returnKeyType="done"
                placeholder="Adicionar alguém pelo nome"
                placeholderTextColor={t.textFaint}
                accessibilityLabel="Nome do participante"
                numberOfLines={1}
                style={{ fontSize: 15.5, color: t.text, padding: 0 }}
              />
            </View>
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

/**
 * Caixa de um campo de texto: a altura mora aqui, e o TextInput vai sem
 * padding nenhum dentro dela. É o que garante o texto no meio da caixa nas
 * duas plataformas.
 */
function field(background: string) {
  return {
    height: MIN_TOUCH,
    justifyContent: 'center' as const,
    backgroundColor: background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  };
}
