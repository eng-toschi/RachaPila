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

## 3. O que ainda falta

- [ ] **Hospedar `web/`** — qualquer URL pública serve. O caminho mais rápido
      é o Cloudflare Pages: cria um projeto, arrasta a pasta `web/`, e ele
      devolve um endereço `*.pages.dev` na hora, de graça, sem mexer em DNS.
      Apontar para `rachapila.com.br` depois é um registro CNAME, sem trocar
      os servidores de nome (e portanto sem risco para o e-mail do Resend).
- [ ] **Fazer `contato@rachapila.com.br` receber de verdade.** As duas páginas
      publicam esse endereço, a Apple costuma testar o canal de suporte, e a
      LGPD exige que ele funcione. Hoje o domínio só envia (Resend), não recebe.
- [ ] **Contas de desenvolvedor** (Apple US$ 99/ano, Google US$ 25 uma vez).
      O caminho completo — qual Apple ID usar quando o atual está preso ao
      time de um cliente, Individual x Organization, e a esteira da EAS —
      está em `PUBLICAR.md`.
- [ ] **Capturas de tela** — o campo da ficha pede o tamanho de 6,5 pol., e
      aceita 1242×2688 ou **1284×2778**. O segundo é o que sai de um simulador
      de **iPhone 14 Pro Max** — mire nele e não há conversão para fazer.
      Boas candidatas: lista de despesas de uma viagem cheia, a divisão de uma
      despesa com o valor por cabeça, a aba de saldos, o fechamento com Pix.
- [ ] **Build e envio:** `eas build --profile production --platform ios` e
      `--platform android`.

---

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
