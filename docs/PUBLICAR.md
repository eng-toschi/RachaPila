# Publicar: conta Apple, conta Google e a esteira de build

O que está aqui é a parte de *contas e configuração*. Os textos da listagem
estão em `LOJA.md`.

---

## Ordem de execução

Muita coisa correu em paralelo e é fácil perder o fio. Esta é a ordem, e o
princípio que a define: **o que tem espera embutida começa primeiro**, porque
relógio parado não anda enquanto se faz outra coisa.

### Já feito (21/09/2026)

Inscrição Apple Individual aprovada · app criado no App Store Connect ·
build de iOS compilado, enviado e processado (está no TestFlight) · build de
Android compilado · site no ar pelo GitHub Pages · privacidade do app
declarada e publicada · `eas.json` fechado com Team ID e ASC App ID.

### Etapa 0 — começar agora, porque são esperas

| | Espera | Por quê agora |
|---|---|---|
| **Criar a conta do Google Play** (US$ 25) | dias + **14 dias de teste fechado com 12 pessoas** | é o relógio mais longo do projeto e ele só começa depois da conta aprovada |
| **Registros MX do `contato@`** | horas de propagação de DNS | a Apple costuma testar o canal de suporte antes de aprovar |

Nenhuma das duas atrapalha as etapas seguintes. Só disparar e seguir.

### Etapa 1 — validar o app no TestFlight

Instalar no iPhone e testar as três coisas que o Expo Go nunca permitiu:
link mágico do e-mail, deep link do convite, e a sessão sobrevivendo ao
fechar e reabrir.

**Vem antes da ficha de propósito:** se algo estiver quebrado, o conserto
gera build novo — e capturas de tela e textos feitos antes teriam de ser
refeitos.

### Etapa 2 — capturas de tela

Com o app instalado e funcionando, tirar as quatro. Detalhes de tamanho e
quais telas escolher em `LOJA.md` §3.

### Etapa 3 — preencher a ficha de uma vez só

Tudo em `LOJA.md`: textos (§1), notas de revisão (§2.8), classificação
etária (§2.9), e o que falta listado em §3. Uma sentada, com o arquivo
aberto ao lado.

### Etapa 4 — conferir e enviar

Escolher o build, definir preço e países, e **Adicionar para revisão**.

### Depois

Android: subir o `.aab`, montar o teste fechado e esperar os 14 dias. E, se
quiser trocar o nome do vendedor, o caminho está em §1 — não precisa
atrasar nada disto.

---

> **Situação resolvida (set/2026):** o Apple ID `eng.toschi@icloud.com` é
> pessoal e tem papel de **Admin** no time "Goawake real estate ltda" — não é
> o titular. Logo a inscrição própria estava livre: **mesmo Apple ID,
> inscrição Individual**, sem criar conta nova. **Aprovada em 21/09/2026.**
> O raciocínio que levou aí fica abaixo, porque a situação muda se um dia
> virar titular de algum time.

> **Com dois times no mesmo Apple ID, todo comando e toda tela pedem
> conferência do time antes do clique.** É o erro mais caro desta fase.

## 1. A conta Apple: o nó a desatar primeiro

A regra que importa: **um Apple ID pode ter uma única inscrição própria no
Apple Developer Program, mas pode ser membro de quantos times alheios
quiser.** São coisas separadas. Ser Admin do time da consultoria não consome
a sua inscrição.

Então a pergunta não é "posso ter duas contas", é **qual o seu papel no time
da consultoria**. Veja em developer.apple.com → Account → People (ou no
seletor de time no topo da página):

| Seu papel lá | O que fazer |
|---|---|
| **Member** ou **Admin** | Dá para inscrever o *mesmo* Apple ID como Individual. Depois de inscrito, aparece um seletor de time no topo, e você alterna entre "Consultoria X" e o seu. |
| **Account Holder** | Esse Apple ID já está gasto. Precisa de um Apple ID novo. |

**Independente do papel, use um Apple ID novo se o atual for um e-mail da
consultoria** (`voce@consultoria.com.br`). No dia que o contrato acabar você
perde o e-mail — e com ele o acesso de recuperação da conta que publica o seu
app. Não vale o risco.

Se for criar um Apple ID novo, o endereço natural é
`contato@rachapila.com.br` — que de qualquer forma precisa passar a receber
e-mail (a Apple testa o canal de suporte).

### Individual ou Organization?

| | Individual | Organization |
|---|---|---|
| Custo | US$ 99/ano | US$ 99/ano |
| Exige | só você | CNPJ + número **D-U-N-S** |
| Nome público na loja | **seu nome civil** | o nome da empresa |
| Prazo | costuma sair em 24–48h | o D-U-N-S sozinho leva de 5 a 15 dias úteis |

Você disse que quer velocidade: **Individual**. E isso não é porta sem volta
— a Apple permite *App Transfer* de um app já publicado para uma conta
Organization depois, sem perder avaliações nem usuários. O RachaPila não usa
nada do que bloqueia transferência (iCloud, Apple Pay, Sign in with Apple).

O único preço real do Individual é o seu nome civil aparecer como vendedor
na ficha do app.

### Trocar o nome exibido por "EngToschi"

Não dá para só digitar outro: em conta Individual o vendedor é você, e a
Apple exibe o nome civil. Três saídas, em ordem de esforço:

1. **Pedir um DBA** (nome fantasia) ao Apple Developer Support. A Apple
   concede a pessoa física desde que se **comprove direito legal sobre o
   nome** — no Brasil, CNPJ com nome fantasia ou marca no INPI. Sem
   documento, é negado. Custa um chamado; vale tentar se o documento existir.
2. **Virar conta Organization e transferir o app.** CNPJ + D-U-N-S → conta
   nova → *App Transfer*, que preserva avaliações, usuários e histórico. No
   Brasil o atalho é o **MEI**: abre online, de graça, no mesmo dia, e já dá
   CNPJ com nome fantasia; o D-U-N-S depois leva de uma a duas semanas.
3. **Lançar assim e resolver depois** — o que se recomenda. O nome grande na
   ficha é *RachaPila*; o do vendedor aparece pequeno, embaixo. Segurar o
   lançamento duas semanas por uma linha de texto sai caro, e o caminho 2
   continua aberto a qualquer momento.

Enquanto isso, o campo **Direitos autorais** (Informações do app) é texto
livre e não tem essa amarra: `2026 EngToschi` em vez do nome civil.

### Duas burocracias que você *não* precisa enfrentar

- **Contratos de app pago / dados bancários / formulário fiscal.** O
  RachaPila é gratuito e não tem compra dentro do app. O contrato de apps
  gratuitos é aceito com um clique e pronto — nada de conta bancária, nada de
  W-8BEN.
- **Sign in with Apple.** A exigência vale para quem oferece login social de
  terceiros (Google, Facebook). O nosso é link mágico por e-mail próprio.

### Uma que talvez você precise

Desde 2025 a Apple exige declaração de **trader status** (DSA) para
distribuir na União Europeia, e quem declara "trader" tem endereço e telefone
exibidos publicamente na ficha do app. Como pessoa física, isso significa
publicar seu endereço.

Saída: em App Store Connect → o app → *Pricing and Availability*, desmarque
os países da UE e publique no Brasil e no resto do mundo. Dá para incluir a
UE depois, quando houver CNPJ. **Confirme a redação vigente na hora** — a
Apple mexeu nessa regra mais de uma vez.

---

## 2. Ordem das coisas (Apple)

1. Resolver o Apple ID conforme a tabela acima e ativar 2FA nele.
2. Inscrever-se como Individual, US$ 99. **Pelo app Apple Developer no
   iPhone costuma ser mais rápido que pelo site**: a verificação de
   identidade sai pelo próprio aparelho, e às vezes aprova no mesmo dia.
   O iPhone precisa estar logado com o Apple ID certo.
3. Aceitar o contrato de apps gratuitos em App Store Connect → Business.

   > São **dois sites diferentes**, e é fácil procurar um dentro do outro:
   > `developer.apple.com` é a conta de desenvolvedor (assinatura, membros,
   > certificados, identificadores); `appstoreconnect.apple.com` são os apps
   > (ficha da loja, builds, TestFlight, preços, envio para revisão). O
   > segundo também está no menu lateral do primeiro.
4. Criar o registro do app em App Store Connect → Apps → **+** — **confira o
   seletor de time antes de clicar**, que agora são dois e criar o RachaPila
   dentro da Goawake dá um trabalho enorme para desfazer:
   - Plataforma: iOS
   - Nome: `RachaPila`
   - Idioma principal: Português (Brasil)
   - Bundle ID: **`app.rachapila.mobile`** (tem que bater com o `app.json`)
   - SKU: `rachapila-ios` (só para você, nunca aparece)
5. Preencher a ficha com os textos de `LOJA.md`, os rótulos de privacidade e
   as URLs de suporte e privacidade (depende de hospedar a pasta `web/`).

> **O Bundle ID é permanente.** Depois do primeiro envio não muda mais. O
> nosso é `app.rachapila.mobile`, já gravado no `app.json` nas duas
> plataformas. Se quiser outro, é agora.

---

## 3. A esteira de build (EAS)

```bash
npm install -g eas-cli
eas login
eas init
eas build --profile production --platform ios
```

`eas login` é a conta **Expo**, não a Apple — são coisas diferentes e é a
Expo que vem primeiro. `eas init` vincula o projeto e grava o `projectId` no
`app.json`. Quando ele perguntar de quem é o projeto, escolha a conta
**pessoal**; uma conta de time só faz sentido havendo mais gente publicando.

> Comandos aqui vão sem comentário na mesma linha de propósito: colados no
> terminal, o `#` e o que vem depois chegam na CLI como argumento e o comando
> falha com "Unexpected arguments".

No primeiro build a CLI pede as credenciais Apple. **É aqui que se erra o
time:** ela lista todos os times do seu Apple ID e o padrão pode ser o da
consultoria. Escolha o seu. Se errar, conserta com:

```bash
eas credentials          # iOS → selecione o perfil → remova e refaça
```

A partir daí a EAS cria e guarda certificado e provisioning profile sozinha.

Para enviar:

```bash
eas submit --profile production --platform ios --latest
```

Na primeira vez o `eas submit` oferece gerar a chave de API do App Store
Connect por você ("Generate a new App Store Connect API Key?"). Aceite: ela
nasce dentro do time escolhido, a EAS guarda, e daí em diante o envio não
pede login nenhum. Só vale fazer à mão — App Store Connect → Users and Access
→ Integrations, papel **App Manager** — se precisar de uma chave separada
para CI. A chave é por time; uma da consultoria não serve.

### Identificadores desta conta

| | |
|---|---|
| Apple Team ID (Individual) | `48C8FNA4NN` |
| ASC App ID | `6814317296` |
| Provider ID | `129487094` |
| Bundle ID | `app.rachapila.mobile` |
| Projeto EAS | `16b03173-1765-4355-afa7-c4eb23576d71` |

Team ID e ASC App ID estão fixados no `eas.json` de propósito. O primeiro
porque, com dois times no mesmo Apple ID, deixar a escolha para um menu
interativo é convite a errar um dia com pressa; o segundo porque dispensa a
etapa de conferir se o app existe no App Store Connect. Com os dois no
perfil, o envio inteiro cabe em:

```
eas build --profile production --platform ios
eas submit --profile production --platform ios --latest
```

O `eas.json` já está com `appVersionSource: "remote"` e `autoIncrement` no
perfil de produção: o número de build sobe sozinho a cada envio, que é a
causa mais comum de envio recusado.

---

## 4. Android, em paralelo

Faça os dois ao mesmo tempo; um não espera o outro.

- Google Play Console, US$ 25, pagamento único.
- **Conta pessoal criada hoje precisa de 12 testadores por 14 dias seguidos
  em teste fechado antes de liberar produção.** Esse relógio só começa depois
  do cadastro aprovado, então crie a conta *hoje* mesmo que o app demore.
- Conta **organização** (também com D-U-N-S) é dispensada dessa regra. Se
  você tem CNPJ, os ~10 dias do D-U-N-S podem sair mais baratos que os 14
  dias de teste fechado — e ainda resolvem o nome público na App Store.

```bash
eas build --profile production --platform android
eas submit --profile production --platform android --latest
```

---

## 5. O que dá para fazer enquanto a inscrição não sai

O build de **Android não depende de conta nenhuma**. `eas build --profile
production --platform android` roda hoje e já entrega o `.aab` — a conta do
Google só é necessária na hora de enviar. Vale rodar antes, porque é no
primeiro build que aparecem os erros de configuração nativa, e descobrir isso
com a fila da Apple já vencida é perder o dia.

- [x] **GitHub Pages ligado** (21/09/2026). O workflow
      `.github/workflows/pages.yml` publica `web/` a cada mudança nela, então
      a página no ar é sempre a do repositório — nunca uma cópia velha.

      | Campo do App Store Connect | URL |
      |---|---|
      | URL de suporte | `https://eng-toschi.github.io/RachaPila/` |
      | URL da Política de privacidade | `https://eng-toschi.github.io/RachaPila/privacidade.html` |

- [ ] **`contato@rachapila.com.br` receber de verdade — agora é o risco
      maior.** As duas páginas no ar publicam esse endereço, a Apple costuma
      testar o canal de suporte antes de aprovar, e a LGPD exige que ele
      funcione. Hoje o domínio só envia, via Resend.

      Zoho Mail no plano gratuito resolve com registros MX no Registro.br,
      sem trocar os servidores de nome — e portanto sem encostar no que o
      Resend criou. Enquanto isso não acontece, a alternativa honesta é
      trocar o endereço nas páginas por um que já receba: uma linha em cada
      arquivo de `web/`, e o próprio workflow republica.
- [x] `eas init` e o primeiro build de Android. Feito em 20/09/2026: projeto
      `@fernando.toschi/rachapila`, keystore gerada e guardada na EAS,
      `versionCode` passa a ser controlado pelo servidor. O valor do build não
      é o `.aab` em si — é a prova de que a configuração nativa compila.
- [ ] Capturas de tela **1284×2778** (o campo da ficha pede 6,5 pol.) — ver
      `LOJA.md`. É a resolução de um **iPhone 14 Pro Max**; se o aparelho na
      mão não for esse, use o simulador do Mac:

      ```
      eas build --profile simulator --platform ios
      ```

      O perfil `simulator` existe para isso. Baixe o `.app`, arraste para um
      simulador de iPhone 14 Pro Max e tire as capturas de lá — saem
      exatamente em 1284×2778, sem conversão nenhuma.

### `.aab` não instala no celular

O que o perfil `production` gera é um *bundle* para a loja, e nenhum Android
instala isso direto. Para pôr a build num aparelho e testar de verdade, o
perfil `preview` entrega um `.apk`:

```
eas build --profile preview --platform android
```

Não vale guardar o `.aab`: quando a conta do Google sair, o build é refeito de
qualquer jeito, já com o que tiver mudado até lá.
