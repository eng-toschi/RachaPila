import { useRef, useState } from 'react';
import { Pressable, ScrollView, Share, View, type TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addParticipant, createTrip, renameMeInAllTrips, setTripCurrencies } from '@/commands';
import { getMyName, localActorId, nameFromEmail, setMyName } from '@/db/repositories';
import { CurrencyPicker } from '@/features/expenses/CurrencyPicker';
import { createInvite, inviteMessage } from '@/services/invites';
import { useAuth } from '@/state/auth';
import { useDatabase, useMutate } from '@/state/database';
import { Avatar, Button, Card, Chip, Divider, Field, Row, Text } from '@/ui/components';
import { IconPlus, IconTrash } from '@/ui/icons';
import { useTheme } from '@/ui/theme';
import { FONT, RADIUS, SPACING } from '@/ui/tokens';

export default function NewTripScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const mutate = useMutate();
  const { db } = useDatabase();
  const { session } = useAuth();

  const [name, setName] = useState('');
  /**
   * Quem cria a viagem chamava-se "Você" — e "Você" é o que os OUTROS viam
   * depois de sincronizar, o que não identifica ninguém. O nome é pedido
   * aqui, junto de quem mais vai, e guardado no aparelho para não ser
   * perguntado de novo na próxima viagem. O e-mail dá o primeiro palpite.
   */
  const [myName, setMyNameDraft] = useState(
    () => getMyName(db) ?? nameFromEmail(session?.user.email) ?? '',
  );
  const [createdTripId, setCreatedTripId] = useState<string | undefined>(undefined);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | undefined>(undefined);
  const [baseCurrency, setBaseCurrency] = useState<string>('BRL');
  const [otherCurrencies, setOtherCurrencies] = useState<string[]>([]);
  const [picking, setPicking] = useState<'base' | 'other' | undefined>(undefined);
  const [people, setPeople] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const campoNome = useRef<TextInput>(null);
  const vazio = draft.trim() === '';

  const addPerson = (): void => {
    const trimmed = draft.trim();
    if (trimmed === '') return;
    setPeople((current) => [...current, trimmed]);
    setDraft('');
  };

  const canSave = name.trim() !== '';

  const save = (): void => {
    const meuNome = myName.trim();
    let novaViagem = '';

    mutate((database, ctx) => {
      if (meuNome !== '') {
        setMyName(database, meuNome);
        // As viagens que já existiam continuariam com "Você" para sempre: é
        // aqui que o nome fica conhecido pela primeira vez.
        renameMeInAllTrips(database, ctx, meuNome);
      }
      const tripId = createTrip(database, ctx, { name: name.trim(), baseCurrency });
      setTripCurrencies(database, ctx, tripId, otherCurrencies);
      // Quem cria a viagem é "você" — identificado pela conta, se já existir
      // sessão, ou pelo aparelho enquanto não existir (Fase 6). Usar o id do
      // aparelho mesmo já logado deixaria essa viagem nova sem dono de
      // verdade até o próximo login, e a sincronização falharia com
      // violação de chave estrangeira (ver DECISIONS.md, 19/09).
      //
      // Sem nome, volta a ser "Você": sem conta ninguém mais vai ver esta
      // viagem, então o rótulo genérico não confunde pessoa nenhuma.
      addParticipant(database, ctx, {
        tripId,
        displayName: meuNome === '' ? 'Você' : meuNome,
        userId: session === null ? localActorId(database) : session.user.id,
      });
      for (const person of people) {
        addParticipant(database, ctx, { tripId, displayName: person });
      }
      novaViagem = tripId;
    });

    if (novaViagem === '') return;
    // O convite só existe depois da viagem: `createInvite` sincroniza antes de
    // gerar o token, porque convidar para algo que só existe neste celular não
    // significa nada para quem aceita. Por isso o link é oferecido aqui, um
    // passo depois — e só quando há alguém para convidar e conta para assinar.
    if (people.length === 0 || session === null) {
      router.replace(`/trip/${novaViagem}`);
      return;
    }
    setCreatedTripId(novaViagem);
  };

  const compartilharConvite = async (tripId: string): Promise<void> => {
    setInviting(true);
    setInviteError(undefined);
    const result = await createInvite(db, tripId);
    setInviting(false);
    if (!result.ok) {
      setInviteError(result.message);
      return;
    }
    await Share.share({ message: inviteMessage(result.token) });
    router.replace(`/trip/${tripId}`);
  };

  if (createdTripId !== undefined) {
    const quem = people.length === 1 ? people[0] : `${String(people.length)} pessoas`;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: t.bg,
          paddingTop: insets.top + SPACING.lg,
          paddingHorizontal: SPACING.xl,
          paddingBottom: insets.bottom + SPACING.lg,
          gap: SPACING.lg,
        }}
      >
        <Text variant="title">Viagem criada</Text>
        <Card style={{ gap: SPACING.md }}>
          <Text variant="body">
            {quem} já entra na divisão sem instalar nada. O convite é só para quem também vai
            lançar gastos do próprio celular.
          </Text>
          <Text variant="caption" tone="faint">
            Um link serve para o grupo todo: quem entrar escolhe quem é na viagem.
          </Text>
          {inviteError === undefined ? null : (
            <Text variant="caption" tone="negative">
              {inviteError}
            </Text>
          )}
        </Card>
        <View style={{ flex: 1 }} />
        <Button
          label={inviting ? 'Gerando o link…' : 'Compartilhar convite'}
          disabled={inviting}
          onPress={() => { void compartilharConvite(createdTripId); }}
        />
        <Button
          label="Agora não"
          variant="secondary"
          onPress={() => { router.replace(`/trip/${createdTripId}`); }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + SPACING.lg,
          paddingHorizontal: SPACING.xl,
          paddingBottom: insets.bottom + 110,
          gap: SPACING.lg,
        }}
        keyboardShouldPersistTaps="handled"
        /*
          Sem isto, digitar um nome em "Quem vai" empurra a lista para trás do
          teclado e a pessoa não vê quem acabou de acrescentar. O iOS sabe
          descontar o teclado da área rolável sozinho; só faltava pedir.
        */
        automaticallyAdjustKeyboardInsets
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => { router.back(); }} accessibilityRole="button">
            <Text variant="label" tone="muted">
              Cancelar
            </Text>
          </Pressable>
          <Text variant="title">Nova viagem</Text>
          <View style={{ width: 60 }} />
        </Row>

        <Card>
          <Field
            value={name}
            onChangeText={setName}
            placeholder="Para onde vocês vão?"
            placeholderTextColor={t.textFaint}
            style={{ fontSize: 20, letterSpacing: -0.2, fontFamily: FONT.display, color: t.text }}
            accessibilityLabel="Nome da viagem"
            autoFocus
          />
        </Card>

        <View style={{ gap: SPACING.sm }}>
          <Text variant="overline" tone="faint">
            Moeda do acerto
          </Text>
          <Row gap={SPACING.sm}>
            <Chip label={baseCurrency} selected onPress={() => { setPicking('base'); }} />
            <Text variant="caption" tone="faint" style={{ flex: 1 }}>
              É a moeda em que as contas fecham no fim.
            </Text>
          </Row>
        </View>

        <View style={{ gap: SPACING.sm }}>
          <Text variant="overline" tone="faint">
            Outras moedas da viagem
          </Text>
          <Row style={{ flexWrap: 'wrap' }} gap={SPACING.sm}>
            {otherCurrencies.map((code) => (
              <Chip
                key={code}
                label={`${code}  ×`}
                selected
                onPress={() => { setOtherCurrencies((c) => c.filter((x) => x !== code)); }}
              />
            ))}
            <Chip label="+ Moeda" onPress={() => { setPicking('other'); }} />
          </Row>
          <Text variant="caption" tone="faint">
            Escolha agora as moedas que vocês vão gastar. Elas viram atalho no lançamento — e dá
            para acrescentar outra depois.
          </Text>
        </View>

        <View style={{ gap: SPACING.sm }}>
          <Text variant="overline" tone="faint">
            Quem vai
          </Text>

          <Card padded={false}>
            <Row style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm }}>
              <Avatar name={myName === '' ? 'Você' : myName} seed="me" size={32} />
              <Field
                containerStyle={{ flex: 1 }}
                value={myName}
                onChangeText={setMyNameDraft}
                placeholder="Seu nome"
                placeholderTextColor={t.textFaint}
                accessibilityLabel="Seu nome nesta viagem"
                style={{ fontSize: 15, fontFamily: FONT.semi, color: t.text }}
              />
            </Row>

            {people.map((person, index) => (
              <View key={`${person}-${String(index)}`}>
                <Divider />
                <Row style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }}>
                  <Avatar name={person} seed={person} size={32} />
                  <Text variant="body" style={{ flex: 1 }}>
                    {person}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${person}`}
                    onPress={() => { setPeople((current) => current.filter((_, i) => i !== index)); }}
                    hitSlop={12}
                  >
                    <IconTrash size={18} color={t.textFaint} />
                  </Pressable>
                </Row>
              </View>
            ))}

            <Divider />
            <Row style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm }}>
              <Field
                ref={campoNome}
                containerStyle={{ flex: 1 }}
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={addPerson}
                returnKeyType="done"
                placeholder="Adicionar pelo nome"
                placeholderTextColor={t.textFaint}
                style={{ fontSize: 15.5, color: t.text }}
                accessibilityLabel="Nome do participante"
              />
              {/*
                O `+` apagado quando não há texto, e sólido quando há, é o que
                distingue "ainda não dá" de "agora dá". Antes ele parecia um
                botão de abrir alguma coisa: as pessoas tocavam esperando um
                formulário, nada acontecia, e elas não descobriam que o nome
                se digita ali do lado. Tocar vazio agora leva o foco ao campo,
                que é a única resposta útil para quem entendeu errado.
              */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={vazio ? 'Digite o nome antes de adicionar' : `Adicionar ${draft.trim()}`}
                onPress={() => {
                  if (vazio) campoNome.current?.focus();
                  else addPerson();
                }}
                hitSlop={10}
                style={{
                  backgroundColor: vazio ? t.surfaceAlt : t.accent,
                  borderRadius: RADIUS.pill,
                  padding: 9,
                }}
              >
                <IconPlus size={18} color={vazio ? t.textFaint : t.onAccent} />
              </Pressable>
            </Row>
          </Card>

          <Text variant="caption" tone="faint">
            Basta o nome. Ninguém precisa instalar nada para as contas dele já entrarem — o
            convite vem no passo seguinte, para quem também vai lançar gastos.
          </Text>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: SPACING.xl, right: SPACING.xl, bottom: insets.bottom + SPACING.lg }}>
        <Button label="Criar viagem" onPress={save} disabled={!canSave} />
      </View>

      <CurrencyPicker
        visible={picking !== undefined}
        selected={picking === 'base' ? baseCurrency : ''}
        recent={[baseCurrency, ...otherCurrencies]}
        onSelect={(code) => {
          if (picking === 'base') setBaseCurrency(code);
          else if (code !== baseCurrency) setOtherCurrencies((c) => (c.includes(code) ? c : [...c, code]));
        }}
        onClose={() => { setPicking(undefined); }}
      />
    </View>
  );
}
