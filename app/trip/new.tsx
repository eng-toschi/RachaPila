import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addParticipant, createTrip, setTripCurrencies } from '@/commands';
import { localActorId } from '@/db/repositories';
import { CurrencyPicker } from '@/features/expenses/CurrencyPicker';
import { useAuth } from '@/state/auth';
import { useMutate } from '@/state/database';
import { Avatar, Button, Card, Chip, Divider, Field, Row, Text } from '@/ui/components';
import { IconPlus, IconTrash } from '@/ui/icons';
import { useTheme } from '@/ui/theme';
import { FONT, RADIUS, SPACING } from '@/ui/tokens';

export default function NewTripScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const mutate = useMutate();
  const { session } = useAuth();

  const [name, setName] = useState('');
  const [baseCurrency, setBaseCurrency] = useState<string>('BRL');
  const [otherCurrencies, setOtherCurrencies] = useState<string[]>([]);
  const [picking, setPicking] = useState<'base' | 'other' | undefined>(undefined);
  const [people, setPeople] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  const addPerson = (): void => {
    const trimmed = draft.trim();
    if (trimmed === '') return;
    setPeople((current) => [...current, trimmed]);
    setDraft('');
  };

  const canSave = name.trim() !== '';

  const save = (): void => {
    mutate((database, ctx) => {
      const tripId = createTrip(database, ctx, { name: name.trim(), baseCurrency });
      setTripCurrencies(database, ctx, tripId, otherCurrencies);
      // Quem cria a viagem é "você" — identificado pela conta, se já existir
      // sessão, ou pelo aparelho enquanto não existir (Fase 6). Usar o id do
      // aparelho mesmo já logado deixaria essa viagem nova sem dono de
      // verdade até o próximo login, e a sincronização falharia com
      // violação de chave estrangeira (ver DECISIONS.md, 19/09).
      addParticipant(database, ctx, {
        tripId,
        displayName: 'Você',
        userId: session === null ? localActorId(database) : session.user.id,
      });
      for (const person of people) {
        addParticipant(database, ctx, { tripId, displayName: person });
      }
      router.replace(`/trip/${tripId}`);
    });
  };

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
          {/* Caixa de 56 para uma fonte de display de 20: o `minHeight: 34`
              que havia aqui era menor do que a fonte precisa desenhar, e
              cortava as letras em cima e embaixo. */}
          <Field
            containerStyle={{ height: 56 }}
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
            <Row style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }}>
              <Avatar name="Você" seed="me" size={32} />
              <Text variant="body" strong style={{ flex: 1 }}>
                Você
              </Text>
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adicionar participante"
                onPress={addPerson}
                hitSlop={10}
                style={{ backgroundColor: t.accentSoft, borderRadius: RADIUS.pill, padding: 8 }}
              >
                <IconPlus size={18} color={t.accent} />
              </Pressable>
            </Row>
          </Card>

          <Text variant="caption" tone="faint">
            Basta o nome. Ninguém precisa instalar nada para as contas dele já entrarem.
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
