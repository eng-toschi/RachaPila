# Publicar nas lojas — textos prontos e checklist

Tudo que dá para adiantar antes das contas saírem. O que está aqui é para
copiar e colar na App Store Connect e no Google Play Console.

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

Campo em **Distribuição → versão 1.0 → Informações da revisão do app**. É o
que evita a reprovação mais boba de app com login: o revisor abre, encontra
uma tela de entrada, não consegue passar dela e devolve como "não foi
possível avaliar".

No nosso caso a resposta é boa — o app inteiro funciona sem conta — mas isso
precisa estar escrito, porque o revisor não vai adivinhar.

**Notas (colar no campo "Notas"):**

```
Não é necessária conta para avaliar este app.

Todas as funções principais — criar viagem, cadastrar participantes, lançar
despesas em várias moedas, dividir, ver saldos e fechar as contas — funcionam
sem login e sem internet. Basta abrir o app e criar uma viagem.

O login existe apenas para compartilhar uma viagem com outras pessoas. Ele usa
link mágico enviado por e-mail: na tela "Entrar", digite qualquer endereço de
e-mail ao qual você tenha acesso e o link chegará em segundos.

Exclusão de conta (diretriz 5.1.1(v)): em Entrar → "Excluir minha conta".
Disponível dentro do app, sem precisar falar com o suporte.

A permissão de localização é opcional e pedida apenas ao tocar em "Usar GPS"
dentro do formulário de despesa. O app funciona normalmente se ela for negada.
```

Preencha também nome, sobrenome, e-mail e telefone de contato — é por onde a
Apple liga se travar algo na revisão.

## 2.9 Classificação etária

Em **Informações do app → Classificação etária → Editar**. O app não tem
violência, conteúdo sexual, jogo de azar, álcool nem terror: a resposta é
"nenhum" ou a opção mais branda em todas as perguntas, e o resultado é **4+**.

## 2.10 TestFlight — informações de teste

Campos de **TestFlight → Informações de teste**, exigidos antes de mandar um
build para teste externo.

> **Desmarque "Início de sessão obrigatório".** O app funciona inteiro sem
> conta, e não existe usuário e senha — o login é por link no e-mail. Deixar
> marcado faz a Apple esperar credenciais que não existem, e o Beta App
> Review volta por isso.

**E-mail para comentários:** `contato@rachapila.com.br`

**Descrição da versão beta do app:**

```
O RachaPila divide as contas de uma viagem em grupo: cada um lança o que
pagou, e no fim o app diz quem paga a quem.

O que experimentar:

1. Crie uma viagem e escolha a moeda do acerto. Se vocês forem gastar em
outra moeda, acrescente-a também.

2. Adicione as pessoas pelo nome. Ninguém precisa ter o app para entrar na
divisão das contas.

3. Lance algumas despesas variando quem pagou e entre quem dividiu — por
cabeça, por valor exato, ou só entre algumas pessoas.

4. Abra a aba de saldos e depois "Fechar a viagem": o app calcula o menor
número de transferências para todo mundo zerar.

5. Se alguém cadastrar uma chave Pix, o fechamento gera um código copia e
cola com o valor já embutido.

Não é preciso criar conta para nada disso. A conta só serve para compartilhar
a viagem com outras pessoas, e entrar é por um link enviado ao e-mail — não
há senha.

O app funciona sem internet: dá para lançar despesas offline, e tudo se
ajusta entre os celulares do grupo quando a conexão voltar.

O que mais ajuda saber: se algum valor pareceu errado, se alguma tela
confundiu, e se algo travou.
```

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

## 3. O que ainda falta no App Store Connect

- [x] Privacidade do app — cinco tipos declarados e publicados (21/09/2026).
- [x] URL da política de privacidade.
- [ ] **Informações do app**: subtítulo, categorias, direitos autorais e
      classificação etária (§2.9). Em direitos autorais use `2026 EngToschi`:
      o campo é texto livre, ao contrário do nome do vendedor, que em conta
      Individual é o nome civil (ver `PUBLICAR.md` §1 para trocá-lo).
- [ ] **Versão 1.0**: texto promocional, descrição, palavras-chave (§1),
      URL de suporte, capturas de tela e as notas de revisão (§2.8).
- [ ] **Preços e disponibilidade**: gratuito. É aqui também que se desmarca a
      União Europeia, se não quiser publicar endereço por causa do *trader
      status* — ver `PUBLICAR.md` §1.
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
