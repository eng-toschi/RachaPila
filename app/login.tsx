/**
 * Entrada por link mágico (Fase 6 — spec §3, §11).
 *
 * Sem senha: a pessoa digita o e-mail, recebe um link, toca nele e volta pro
 * app já com sessão. Esta tela não bloqueia nada do app local — quem nunca
 * abrir ela continua lançando despesa offline como sempre (§17 "não peça
 * login antes de entregar valor").
 */
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_BUILD, APP_NAME, APP_VERSION } from '@/config/app';
import { renameMeInAllTrips } from '@/commands';
import { getMyName, nameFromEmail, setMyName } from '@/db/repositories';
import { deleteAccount } from '@/services/account';
import { useAuth } from '@/state/auth';
import { useDatabase } from '@/state/database';
import { Button, Card, Field, Row, Text } from '@/ui/components';
import { IconCheck, IconUser } from '@/ui/icons';
import { useTheme } from '@/ui/theme';
import { FONT, MIN_TOUCH, RADIUS, SPACING } from '@/ui/tokens';

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/u;

export default function LoginScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { session, loading, signInWithEmail, signInWithCode, signOut, linkError, clearLinkError } = useAuth();
  const { db, mutate } = useDatabase();

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [code, setCode] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  /**
   * O nome com que a pessoa aparece para os outros.
   *
   * Fica aqui além da criação de viagem porque quem já tem viagens não passa
   * mais por aquela tela — e sem um lugar para informar o nome, as viagens
   * antigas ficariam com "Você" para sempre.
   */
  const [myName, setMyNameDraft] = useState(() => getMyName(db) ?? '');
  const [nomeTocado, setNomeTocado] = useState(false);

  /** Mesmo motivo de `trip/new.tsx`: a sessão chega depois da primeira pintura. */
  useEffect(() => {
    if (nomeTocado || myName !== '') return;
    const palpite = nameFromEmail(session?.user.email);
    if (palpite !== undefined) setMyNameDraft(palpite);
  }, [session, nomeTocado, myName]);
  const [renamed, setRenamed] = useState<number | undefined>(undefined);

  const saveMyName = (): void => {
    const nome = myName.trim();
    if (nome === '' || nome === getMyName(db)) return;
    mutate((database, ctx) => {
      setMyName(database, nome);
      setRenamed(renameMeInAllTrips(database, ctx, nome));
    });
  };

  const validEmail = EMAIL_RE.test(email.trim());

  const enterWithCode = (): void => {
    const digits = code.replace(/\D/gu, '');
    if (digits.length < 6) return;
    setCheckingCode(true);
    setCodeError(undefined);
    void signInWithCode(email.trim(), digits).then((result) => {
      setCheckingCode(false);
      if (result.ok) {
        clearLinkError();
        return;
      }
      setCodeError(
        /expired|invalid/iu.test(result.message)
          ? 'Código inválido ou vencido. Peça um e-mail novo.'
          : result.message,
      );
    });
  };

  const send = (): void => {
    if (!validEmail) return;
    setStatus('sending');
    void signInWithEmail(email.trim()).then((result) => {
      if (result.ok) {
        setStatus('sent');
      } else {
        setStatus('error');
        setErrorMessage(result.message);
      }
    });
  };

  /**
   * Aceita tanto o link completo (`rachapila://join/<token>`) quanto só o
   * código — o convite compartilhado (`createInvite`) manda os dois juntos
   * justamente porque, sem build de verdade, o link ainda não abre sozinho.
   */
  /**
   * Excluir conta pede confirmação em duas etapas de propósito: é
   * irreversível, e a pessoa precisa entender antes que isto NÃO apaga as
   * viagens dela nem as despesas que o grupo já lançou.
   */
  const confirmDelete = (): void => {
    Alert.alert(
      'Excluir sua conta?',
      'Sua conta e seus convites são apagados. Suas viagens continuam neste celular, e as despesas que você já lançou continuam com o grupo — você volta a aparecer lá só pelo nome.\n\nIsto não pode ser desfeito.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir conta',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            void deleteAccount(db).then((result) => {
              setDeleting(false);
              if (result.ok) {
                mutate(() => undefined);
                router.back();
              } else {
                Alert.alert('Não consegui excluir', result.message);
              }
            });
          },
        },
      ],
    );
  };

  const openInvite = (): void => {
    const raw = inviteInput.trim();
    if (raw === '') return;
    const token = raw.includes('join/') ? raw.slice(raw.lastIndexOf('join/') + 'join/'.length) : raw;
    router.push(`/join/${token}`);
    setShowInvite(false);
    setInviteInput('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/*
        Sem isto o teclado subia por cima do campo: a tela era um `View`
        centralizado e fixo, então o conteúdo continuava no meio da tela —
        atrás do teclado — e não havia como rolar até ele. Apareceu na hora de
        colar o código do convite, que é justamente quando o campo precisa
        estar visível para conferir o que se colou.

        `flexGrow: 1` com `justifyContent: 'center'` mantém o conteúdo
        centralizado enquanto couber, e libera a rolagem quando não couber.
      */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + SPACING.lg,
            paddingHorizontal: SPACING.xl,
            paddingBottom: insets.bottom + SPACING.xl,
            flexGrow: 1,
            justifyContent: 'center',
            gap: SPACING.xl,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
        <Row style={{ justifyContent: 'flex-end', position: 'absolute', top: insets.top + SPACING.lg, right: SPACING.xl }}>
          <Pressable accessibilityRole="button" onPress={() => { router.back(); }} hitSlop={10}>
            <Text variant="label" tone="muted">
              Fechar
            </Text>
          </Pressable>
        </Row>

        {loading ? (
          <ActivityIndicator color={t.textFaint} />
        ) : session !== null ? (
          <View style={{ alignItems: 'center', gap: SPACING.lg }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: RADIUS.pill,
                backgroundColor: t.positiveSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconCheck size={28} color={t.positive} />
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text variant="title">Conectado</Text>
              <Text variant="caption" tone="muted">
                {session.user.email}
              </Text>
            </View>

            <Card style={{ alignSelf: 'stretch', gap: SPACING.xs }}>
              <Text variant="overline" tone="faint">
                Seu nome
              </Text>
              <Field
                value={myName}
                onChangeText={(text) => {
                  setNomeTocado(true);
                  setMyNameDraft(text);
                  setRenamed(undefined);
                }}
                onBlur={saveMyName}
                onSubmitEditing={saveMyName}
                returnKeyType="done"
                placeholder="Como você aparece para os outros"
                placeholderTextColor={t.textFaint}
                accessibilityLabel="Seu nome nas viagens"
                style={{ color: t.text }}
              />
              <Text variant="caption" tone={renamed === undefined ? 'faint' : 'positive'}>
                {renamed === undefined
                  ? 'É o que o grupo vê nas viagens que você cria.'
                  : renamed === 0
                    ? 'Nome guardado.'
                    : renamed === 1
                      ? 'Nome guardado, e uma viagem que dizia "Você" foi corrigida.'
                      : `Nome guardado, e ${String(renamed)} viagens que diziam "Você" foram corrigidas.`}
              </Text>
            </Card>
            <Button
              label="Sair da conta"
              variant="secondary"
              onPress={() => { void signOut(); }}
            />

            <Pressable
              accessibilityRole="button"
              onPress={confirmDelete}
              disabled={deleting}
              hitSlop={8}
            >
              <Text variant="caption" tone="negative">
                {deleting ? 'Excluindo…' : 'Excluir minha conta'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={{ alignItems: 'center', gap: SPACING.md }}>
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
                <Text variant="title">Entrar</Text>
                <Text variant="caption" tone="muted" style={{ textAlign: 'center', maxWidth: 280 }}>
                  Só é preciso para convidar alguém pra viagem, ou aceitar um convite. Sem
                  isso, o app continua funcionando 100% no aparelho.
                </Text>
              </View>
            </View>

            {/*
              O aviso do link que falhou aparece nos dois estados da tela: quem
              volta do e-mail com o app reaberto cai no estado inicial, e era
              justamente aí que antes não havia pista nenhuma do que deu errado.
            */}
            {linkError === undefined ? null : (
              <Card style={{ gap: SPACING.sm }}>
                <Text variant="body" strong>
                  Não consegui entrar com esse link
                </Text>
                <Text variant="caption" tone="muted">
                  {linkError}
                </Text>
                <Pressable accessibilityRole="button" onPress={clearLinkError} hitSlop={8}>
                  <Text variant="caption" tone="accent">
                    Entendi
                  </Text>
                </Pressable>
              </Card>
            )}

            {status === 'sent' ? (
              <Card>
                <View style={{ alignItems: 'center', gap: SPACING.sm }}>
                  <IconCheck size={22} color={t.positive} />
                  <Text variant="body" strong style={{ textAlign: 'center' }}>
                    Verifique seu e-mail
                  </Text>
                  <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
                    Mandamos para {email.trim()} um link e um código de seis dígitos.
                    Toque no link neste mesmo aparelho, ou digite o código abaixo.
                  </Text>

                  {/*
                    O código existe porque o link sozinho não basta: ele vale uma
                    vez só, e morre antes da pessoa se um filtro de segurança de
                    e-mail o abrir para checar, ou se o e-mail for lido num
                    aparelho diferente do que pediu. Foi o que reprovou a versão
                    1.0 na Apple em 06/10/2026. O código não tem nenhum desses
                    problemas.
                  */}
                  <Field
                    containerStyle={{ alignSelf: 'stretch' }}
                    value={code}
                    onChangeText={(text) => {
                      setCode(text.replace(/\D/gu, '').slice(0, 6));
                      setCodeError(undefined);
                    }}
                    onSubmitEditing={enterWithCode}
                    placeholder="Código de seis dígitos"
                    placeholderTextColor={t.textFaint}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    returnKeyType="done"
                    accessibilityLabel="Código recebido por e-mail"
                    style={{ fontSize: 22, fontFamily: FONT.semi, color: t.text, textAlign: 'center', letterSpacing: 6 }}
                  />

                  {codeError === undefined ? null : (
                    <Text variant="caption" tone="negative" style={{ textAlign: 'center' }}>
                      {codeError}
                    </Text>
                  )}

                  <Button
                    label={checkingCode ? 'Conferindo…' : 'Entrar com o código'}
                    onPress={enterWithCode}
                    disabled={code.length < 6 || checkingCode}
                  />

                  <Pressable accessibilityRole="button" onPress={() => { setStatus('idle'); setCode(''); }} hitSlop={8}>
                    <Text variant="caption" tone="accent">
                      Usar outro e-mail
                    </Text>
                  </Pressable>
                </View>
              </Card>
            ) : (
              <View style={{ gap: SPACING.sm }}>
                <Card style={{ paddingVertical: SPACING.md }}>
                  <TextInput
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (status === 'error') setStatus('idle');
                    }}
                    placeholder="seu@email.com"
                    placeholderTextColor={t.textFaint}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    accessibilityLabel="E-mail"
                    style={{ fontSize: 16, fontFamily: FONT.semi, color: t.text, minHeight: MIN_TOUCH - 12 }}
                  />
                </Card>

                {status === 'error' ? (
                  <Text variant="caption" tone="negative">
                    Não consegui enviar o link: {errorMessage}
                  </Text>
                ) : null}

                <Button
                  label={status === 'sending' ? 'Enviando…' : 'Receber link por e-mail'}
                  onPress={send}
                  disabled={!validEmail || status === 'sending'}
                />
              </View>
            )}
          </>
        )}

        {/* Fora das duas condições acima de propósito: quem recebe um convite
            quase nunca está logado ainda — esconder isto de quem está de fora
            é esconder justamente de quem precisa. A tela `/join/[token]` pede
            o login sozinha e continua de onde parou quando a sessão chega. */}
        {loading ? null : showInvite ? (
          <View style={{ gap: SPACING.sm }}>
            <Card style={{ paddingVertical: SPACING.md }}>
              <TextInput
                value={inviteInput}
                onChangeText={setInviteInput}
                placeholder="Cole o código do convite"
                placeholderTextColor={t.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                accessibilityLabel="Código do convite"
                style={{ fontSize: 15, fontFamily: FONT.semi, color: t.text, minHeight: MIN_TOUCH - 12 }}
              />
            </Card>
            <Button
              label="Entrar na viagem"
              onPress={openInvite}
              disabled={inviteInput.trim() === ''}
            />
            <Pressable accessibilityRole="button" onPress={() => { setShowInvite(false); }} hitSlop={8}>
              <Text variant="label" tone="muted" style={{ textAlign: 'center' }}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => { setShowInvite(true); }} hitSlop={8}>
            <Text variant="label" tone="accent" style={{ textAlign: 'center' }}>
              Tenho um convite
            </Text>
          </Pressable>
        )}

        {/*
          A marca de versão saiu da tela inicial e veio parar aqui.
          Na home ela resolvia um problema real — saber num segundo se o
          aparelho roda código velho —, mas quem instalar pela loja veria
          "b45" sem fazer ideia do que é, e não dá para escondê-la só na
          loja: o binário do TestFlight e o da App Store são o mesmo.

          Aqui continua a um toque de distância para quem testa, e fora do
          caminho de quem só quer dividir a conta do jantar.
        */}
        <Text variant="micro" tone="faint" style={{ textAlign: 'center' }}>
          {APP_NAME} {APP_VERSION} · {APP_BUILD}
        </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
