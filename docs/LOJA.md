# Publicar nas lojas — textos prontos e checklist

Tudo que dá para adiantar antes das contas saírem. O que está aqui é para
copiar e colar na App Store Connect e no Google Play Console. O caminho das
contas em si está em `PUBLICAR.md`; o mapa dos serviços, em
`INFRAESTRUTURA.md`.

---

## 1. Textos da listagem (pt-BR)

**Nome:** RachaPila

**Subtítulo (máx. 30 caracteres):**
```
Divida a conta da viagem
```

**Descrição:**
```
Viajar em grupo é ótimo até a hora de acertar as contas. O RachaPila resolve
essa parte.

Cadastre a viagem, coloque quem vai só pelo nome, e comece a lançar. Ninguém
precisa instalar nada para as despesas em nome dele já entrarem na conta.

FUNCIONA SEM INTERNET
Lance a despesa no metrô de Tóquio, no meio da estrada, onde for. Quando a
conexão voltar, tudo se ajusta sozinho entre os celulares do grupo.

VÁRIAS MOEDAS, DO JEITO CERTO
A cotação usada é a do dia do gasto, congelada no lançamento — não a de hoje.
E o IOF entra no rateio, porque ele entra na sua fatura: ignorar isso faz
quem pagou ser reembolsado a menos.

DIVIDIR DE VERDADE
Por cabeça, por valor exato, ou só entre as três pessoas que pegaram aquele
táxi. O app mostra o valor por cabeça mudando enquanto você marca e desmarca.

FECHAR SEM DISCUSSÃO
No fim, o app diz quem paga a quem, no menor número de transferências. Quem
cadastrou chave Pix recebe um código copia e cola com o valor já embutido.

SUAS CONTAS SÃO SUAS
A viagem vive no seu celular. Nada vai para a nuvem até você convidar alguém
para uma viagem específica — e aí só aquela viagem vai. Sem anúncios, sem
rastreadores, sem vender dado de ninguém.
```

**Texto promocional (máx. 170 caracteres):**

Este é o único campo que se troca sem enviar versão nova — serve para avisar
de novidade sem passar por revisão. Vale guardar esse trunfo.

```
Divida os gastos da viagem sem planilha. Funciona sem internet, usa a cotação do dia de cada gasto e, no fim, diz quem paga a quem — com Pix copia e cola.
```

**Palavras-chave (máx. 100 caracteres, separadas por vírgula):**
```
dividir conta,racha,viagem,despesas,amigos,pix,grupo,câmbio,IOF,gastos,rateio
```

**URL de suporte:** `https://eng-toschi.github.io/RachaPila/`
**URL de privacidade:** `https://eng-toschi.github.io/RachaPila/privacidade.html`

**Categoria:** Finanças (primária) · Viagens (secundária)
**Classificação etária:** 4+ (não há conteúdo restrito)

---

## 2. Privacidade do app — passo a passo do formulário

A tela abre dizendo **"Dados não coletados"**. Isso está errado e precisa ser
corrigido: o app manda e-mail e conteúdo para o servidor a partir do momento
em que uma viagem é compartilhada. Declarar a menos é dos problemas mais
sérios que se pode ter com a Apple.

### 2.1 Política de privacidade

Em **Política de privacidade → Editar**, cole a URL da página hospedada
(`.../privacidade.html`). A segunda URL, "opções de privacidade do usuário",
é opcional e não se aplica: a exclusão de conta é feita dentro do app.

### 2.2 Tipos de dados

Em **Tipos de dados → Editar**, marque exatamente estes cinco, e mais nada:

| Categoria | Tipo a marcar | Por que |
|---|---|---|
| Informações de contato | **Endereço de e-mail** | é o que a conta guarda, para mandar o link de entrada |
| Informações financeiras | **Outras informações financeiras** | a chave Pix (ver 2.4) |
| Localização | **Localização precisa** | a coordenada da despesa vai sem arredondamento (`src/services/place.ts`) |
| Conteúdo do usuário | **Outro conteúdo do usuário** | viagens, despesas, valores, nomes dos participantes |
| Identificadores | **ID do usuário** | o id da conta que acompanha cada registro sincronizado |

### 2.3 As três perguntas de cada tipo

A Apple repete as mesmas três para cada item marcado. Para **todos os cinco**,
as respostas são iguais:

1. **Usado para rastrear você?** → **Não.** Não há um único SDK de anúncio,
   análise ou atribuição no projeto, e isso é verificável no `package.json`.
2. **Finalidades** → apenas **Funcionalidade do app**. Nada de publicidade,
   análise ou personalização.
3. **Vinculado à identidade do usuário?** → **Sim**, nos cinco. Tudo que
   sincroniza fica amarrado à conta de quem lançou.

### 2.4 A chave Pix, que não encaixa em lugar nenhum

Ela não tem categoria boa na lista da Apple. "Informações de pagamento" é
pensada para cartão de crédito; uma chave Pix que é CPF está mais perto de
documento de identidade. A escolha mais defensável é **Informações
financeiras → Outras informações financeiras**, descrevendo no campo de texto
o que ela é de fato. Confira a redação vigente das categorias na hora de
preencher: a Apple mexe nelas de tempos em tempos, e declarar a mais é sempre
mais seguro do que declarar a menos.

### 2.5 O que deliberadamente NÃO se marca

- **Nome** (Informações de contato) — o app nunca pede o nome de quem usa. Os
  nomes que aparecem são rótulos que a pessoa digita para os participantes, e
  isso é conteúdo, já coberto por "Outro conteúdo do usuário".
- **Contatos** — a agenda do aparelho nunca é lida.
- **Dados de uso, Diagnóstico, Histórico de navegação ou pesquisa** — não
  existe coleta nenhuma desse tipo.

### 2.6 Publicar

O botão **Publicar**, no alto à direita, é o que vale — preencher sem
publicar deixa a ficha incompleta e trava o envio. Esses rótulos podem ser
editados depois, sem enviar versão nova.

### 2.7 Google Play (Data Safety)

Mesmas respostas. Marcar ainda que os dados são **criptografados em trânsito**
(são, é HTTPS) e que o usuário **pode pedir a exclusão** (pode, dentro do
app, em Entrar → "Excluir minha conta").

---

## 2.8 Informações para revisão do app

Campo em **Distribuição → versão 1.0 → Informações da revisão do app**.

Reescrito em 13/10/2026, depois de duas reprovações seguidas na mesma coisa:
o revisor não conseguiu entrar. O texto antigo dizia que não era preciso
conta e parava aí — correto, mas insuficiente, porque a parte de compartilhar
viagem precisa, e era essa que ele tentava.

Três decisões que o texto novo carrega:

**Em inglês, nomeando os rótulos em português.** O app é só em pt-BR e quem
revisa lê inglês. Traduzir o app seria desproporcional; dizer "toque em
`Entrar com senha` (Sign in with password)" resolve, e é o que revisor
espera encontrar.

**Com conta de demonstração e senha.** Enquanto a única porta dependia de
e-mail chegar, a revisão dependia de algo fora do nosso alcance — e foi
assim duas vezes. A conta `review@rachapila.com.br` entra sem e-mail nenhum.

**Sem marcar "Início de sessão obrigatório".** Marcar significa que o app
exige login para funcionar, o que não é verdade aqui e contradiz o primeiro
parágrafo das notas. As credenciais vão nos campos de usuário e senha, que
existem independentemente dessa marcação.

**Notas (colar no campo "Notas", trocando `<SENHA>`):**

```
No account is required to evaluate this app. The interface is in Portuguese
(Brazil); the step-by-step below gives the exact on-screen labels.

WHAT WORKS WITHOUT SIGNING IN (most of the app)

Tap "+ Nova viagem" (New trip) on the home screen. You can create a trip, add
people by name, enter expenses in several currencies, split them, see balances
and settle up — all with no account and no internet connection. Sign-in is only
needed to share a trip with another person.

HOW TO SIGN IN (demo account, no email needed)

1. On the home screen, tap the round person icon in the top-right corner.
2. The sign-in screen opens, titled "Entrar" (Sign in).
3. Type the email address below in the field showing "seu@email.com".
4. Below the green button, tap the text link "Entrar com senha"
   (Sign in with password).
5. A second field appears, showing "Senha" (Password). Type the password below.
6. Tap the green button "Entrar" (Sign in).

   Email: review@rachapila.com.br
   Password: <SENHA>

This password option is available to every user, not only to reviewers.

ALTERNATIVE: SIGN IN BY EMAIL CODE

Typing any email address and tapping the green button
"Receber link por e-mail" (Receive link by email) sends a message containing a
six-digit code. Enter it in the field shown and tap "Entrar com o código"
(Sign in with the code). The email is written in both Portuguese and English.

OTHER NOTES

Account deletion (guideline 5.1.1(v)): once signed in, the same screen shows
"Excluir minha conta" (Delete my account). No support contact required.

Location permission is optional and only requested when tapping "Usar GPS"
inside the expense form. The app works normally if it is denied.
```

Os rótulos acima foram conferidos em `app/login.tsx` no b57. Se algum texto
da tela mudar, estas notas mudam junto — instrução que nomeia um botão
inexistente é pior que instrução nenhuma.

**Informações de contato:** nome, sobrenome, telefone e e-mail de verdade —
é por onde a Apple liga se algo travar na revisão.

### "O que testar" — é por build, e muda a cada um

Aparece para o testador dentro do TestFlight, ao lado do botão de instalar.
A descrição acima diz o que o app é; esta diz **onde olhar nesta versão**.
Pedido genérico devolve "parece ok", que não vale nada.

Para o primeiro build aberto a amigos:

```
Primeira versão aberta para teste.

Onde olhar com mais atenção:

• CONVITE — gere um convite e mande para alguém pelo WhatsApp. O link deve
abrir o app direto em quem já tem, e levar para baixá-lo em quem não tem.

• VÁRIAS MOEDAS — lance despesas em duas moedas diferentes e confira se o
total da viagem e os saldos batem com o que você esperava. A cotação usada é
a do dia do gasto, não a de hoje, e o IOF entra no rateio.

• FECHAMENTO — ao encerrar a viagem, veja se o "quem paga a quem" faz
sentido. O app tenta o menor número possível de transferências, então pode
aparecer você pagando a alguém com quem não dividiu nada diretamente.

• SEM INTERNET — ative o modo avião, lance uma despesa, e depois reconecte.
Nada pode se perder no caminho.

Se algo parecer errado, o mais útil é dizer o que você esperava e o que
aconteceu.
```

Nos builds seguintes, troque por uma lista curta do que mudou — é o que faz o
testador reabrir o app em vez de ignorar a notificação.

### Distribuição automática: existe, mas não para grupo externo

Anotado em 29/09/2026 depois de eu afirmar o contrário duas vezes e mandar
procurar botão que não existe. A regra da Apple:

| | Grupo interno | Grupo externo |
|---|---|---|
| Build chega sozinho | sim | **não, sempre manual** |
| Espera revisão de beta | nunca | 1º build de cada versão |
| Exige conta na App Store Connect | **sim, por pessoa** | não |

E a distribuição automática do grupo interno **só pode ser escolhida quando o
grupo é criado** — não há como ligar depois num grupo que já existe.

Ou seja, é uma troca real: automação custa dar acesso à conta de
desenvolvedor a cada testador. Para família e amigos, o grupo externo com
link público continua sendo a escolha certa — o custo é adicionar o build ao
grupo, na aba *Compilações* do grupo, a cada versão. As pessoas não são
reconfiguradas: o link público cuida disso.

Se um dia o passo manual incomodar, ele é automatizável pela API da App Store
Connect (o `fastlane pilot` distribui para grupo externo por linha de
comando). Montar isso dá mais trabalho do que os dois cliques.

**Do lado de quem testa, o TestFlight avisa mas não instala.** Cada pessoa
abre o TestFlight, toca no RachaPila e liga *Atualizações automáticas*. É uma
vez por pessoa, não dá para fazer por elas, e vale mandar a instrução junto
do convite — sem isso, ligar qualquer coisa do lado de cá não adianta.

Fonte: App Store Connect Help, *Add internal testers* e *Invite external
testers*.

## 3. O que ainda falta no App Store Connect

- [x] Privacidade do app — cinco tipos declarados e publicados (21/09/2026).
- [x] URL da política de privacidade.
- [ ] **Informações do app**: subtítulo, categorias, direitos autorais e
      classificação etária (§2.9). Em direitos autorais use `2026 EngToschi`:
      o campo é texto livre, ao contrário do nome do vendedor, que em conta
      Individual é o nome civil (ver `PUBLICAR.md` §1 para trocá-lo).
- [ ] **Versão 1.0**: texto promocional, descrição, palavras-chave (§1),
      URL de suporte, capturas de tela e as notas de revisão (§2.8).
- [ ] **Preços e disponibilidade**: gratuito, e **disponibilidade mundial**.
      Duas coisas diferentes se confundem aqui:
      - **Desmarcar a União Europeia** faz sentido: o DSA obriga conta
        Individual a publicar endereço residencial na ficha (*trader status*) —
        ver `PUBLICAR.md` §1. Perde-se Espanha, Portugal e Alemanha.
      - **Restringir ao Brasil não faz.** A tentação é grande, por ser app só
        em português, mas a disponibilidade é pela região da conta Apple: o
        convidado chileno não conseguiria instalar para entrar na viagem, e o
        convite entre países é o que o app faz. O **Reino Unido** também fica:
        saiu da UE, tem vitrine própria e não exige declaração nenhuma.
- [ ] **Escolher o build** que o `eas submit` enviou, depois que a Apple
      terminar de processar.
- [ ] **Versão de lançamento**: "liberar automaticamente após aprovação" é o
      caminho mais rápido. Só vale o manual se quiser soltar iOS e Android no
      mesmo dia — e, com o teste fechado de 14 dias do Google, isso significa
      segurar o iOS por duas semanas.

## 4. Riscos conhecidos de reprovação

- **Exclusão de conta** (diretriz 5.1.1(v)) — já implementada, em
  Entrar → "Excluir minha conta". É o motivo de reprovação mais comum em app
  com login.
- **"Sign in with Apple"** (diretriz 4.8) — a regra vale para login social de
  terceiros (Google, Facebook). O nosso é e-mail próprio via Supabase, que não
  se encaixa. É o ponto a reler no texto vigente da diretriz antes de enviar.
- **Permissão de localização** — o texto exibido já explica o uso e o app
  funciona se a pessoa negar, que é o que a Apple verifica.
- **Permissão declarada sem uso** — o `app.json` pedia câmera e galeria, que
  o app nunca abre. Foram removidas. Vale reconferir a cada dependência nova:
  é reprovação fácil de evitar e cara de levar.
- **App incompleto** — evitar enviar com funcionalidade obviamente pela
  metade. A sincronização automática já entrou; notificação push fica para
  depois do lançamento e não é exigência.
