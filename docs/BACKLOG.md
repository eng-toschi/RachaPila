# Depois da 1.0

O que foi adiado de propósito, com o motivo. Cada item aqui já foi discutido
e decidido — não são ideias soltas, são coisas que caberiam no app e não
couberam no prazo.

## v1.1

### Reordenar os cards de viagem
Pedido no teste com usuários (28/09/2026): arrastar os cards em "Minhas
viagens" para a ordem que a pessoa quiser.

Adiado não por ser difícil, mas por ser **caro no momento errado**: precisa
de coluna `position` nas viagens, migração local, campo novo no schema do
Supabase, uma biblioteca de arrastar-e-soltar, e regra de desempate para
quando dois celulares reordenam offline — o mesmo problema de conflito já
resolvido para despesas, de novo. Horas de trabalho e um caminho de
sincronização novo para testar, na véspera do envio.

A dor hoje é pequena: as viagens saem por data, que é a ordem que a maioria
quer.

### Espanhol e inglês
Perguntado em 28/09/2026, na véspera do envio, e adiado com dois usuários
reais já identificados — não é item especulativo:

- **espanhol**: o convidado estrangeiro. Brasileiro cria a viagem, convida um
  argentino ou chileno, e essa pessoa recebe um app 100% em português só para
  ver quanto deve. Ela não precisa de Pix — precisa entender a lista.
- **inglês**: irmã do dono do projeto, moradora do Reino Unido.

São 136 strings em 19 telas e nenhuma infraestrutura de i18n hoje. Isso é meio
dia de trabalho e **não** é o motivo do adiamento. O motivo é este:

**O parser de dinheiro depende do locale.** Está documentado em
`src/domain/money.ts:196`: em pt-BR `"10,999"` é dez inteiros e 999 milésimos,
portanto ERRO para BRL; em en-US é dez mil novecentos e noventa e nove. O
locale hoje está pinado em `'pt-BR'` em quatro lugares — `src/state/format.ts:9`,
`src/ui/components.tsx:38`, `src/features/expenses/ExpenseForm.tsx:67` e
`src/features/report/dossierHtml.ts:13`. Tornar isso dinâmico muda como o app
**lê números digitados pelo usuário**, e é o único ponto do app onde um defeito
corrompe dinheiro em silêncio, sem erro na tela.

Portanto, a regra de projeto para quando isso for feito: **o idioma da interface
e o locale de números são coisas separadas.** O idioma segue o aparelho; a
leitura e a escrita de valores continuam presas à moeda da viagem, nunca à
língua do telefone. Quem inverter isso vai receber relatos de despesa com
valor errado e não vai encontrar a causa.

Também é maior que o app: as 4 páginas de `web/`, os templates de e-mail do
Supabase, a política de privacidade, o dossiê exportado e a ficha da loja
inteira por idioma, com prints separados para cada uma.

Traduzir também não faz o app funcionar fora do Brasil: o fecho de contas
termina em Pix copia e cola, e 17 arquivos dependem de Pix/BRL. Tradução
resolve a interface, não o produto — o caso legítimo é o **convidado**, que só
precisa ler a divisão.

### Vitrines da UE e o status de negociante
Registrado junto com o item acima, porque foi a dúvida que o levantou.

O DSA obriga quem distribui nas vitrines dos 27 países da UE a publicar nome,
endereço e telefone na ficha da loja, e a Apple remove o app de quem não
declara. Para conta Individual isso significa endereço residencial público —
recusado pela mesma razão que o nome civil na loja (ver *Nome do vendedor*).

Nenhum dos três idiomas que interessam passa por essa exigência:

| Idioma | Mercado | Exige declarar negociante? |
|---|---|---|
| pt-BR | Brasil | não |
| es | Argentina, Chile, México | não — só a **Espanha** |
| en | **Reino Unido**, EUA, Canadá, Austrália | não |

O Reino Unido saiu da UE e tem vitrine própria: a irmã instala sem nenhuma
declaração. Espanha, Portugal e Alemanha ficariam de fora até haver CNPJ.

Duas ressalvas: o campo fica em *Informações do app → status de negociante* e
deve ser conferido na hora, porque regra de conformidade muda; e não declarar
não trava o envio, só restringe as vitrines da UE.

Consequência já aplicada na 1.0: **disponibilidade mundial, não restrita ao
Brasil.** A tentação era limitar ao Brasil por ser app só em português, mas a
disponibilidade é pela região da conta Apple — e o convidado chileno não
conseguiria instalar para entrar na viagem. Restringir quebraria o convite
entre países, que é justamente o que o app faz.

### Campo de texto cortado no `Field`

Aberto em 29/09/2026, ainda vivo no b53. O placeholder é desenhado abaixo do
cursor e some cortado pela borda da caixa. Visível em "Adicionar alguém pelo
nome" (`trip/[id]/participants.tsx`) e, em alguns builds, no nome da viagem
(`trip/new.tsx`).

Não impede usar o app: dá para digitar e adicionar gente normalmente. Impede
usar a tela numa captura de loja.

**Três hipóteses testadas e descartadas** — quem pegar isto não precisa
repetir:

1. *`flex: 1` no `TextInput` atrapalhando a centralização do pai.* Errado, e
   ao contrário: tirar o `flex` faz o campo colapsar e o texto desenhar
   inteiramente fora da caixa. Foi regressão introduzida no b52 e desfeita no
   b53. O `flex` precisa ficar.
2. *Tamanho de texto do sistema aumentado nos Ajustes.* O aparelho estava no
   padrão. O `PixelRatio.getFontScale()` ficou no código porque protege de um
   caso real, mas não é a causa — no padrão o fator é 1.
3. *Caixa sem folga vertical.* O piso subiu de 44 para 52 no b53 e o corte
   continuou igual.

**O que se sabe de concreto:** o texto aparece cerca de 26pt abaixo do cursor,
e o cursor está onde deveria. Ou seja, cursor e texto discordam de posição
dentro do mesmo campo — não é a caixa que está pequena, é o texto que desce.

**Como atacar:** as três tentativas foram feitas por leitura de código, sem
rodar o app, e todas falharam. A próxima precisa ser com `npx expo start` e o
inspetor de layout aberto sobre o campo, para ver a caixa real do `TextInput`
e onde o texto está sendo desenhado. Sem isso é chute.

### Notificações push
Avisar o grupo a cada despesa lançada. Exige build próprio (já temos),
certificado de push e uma função no servidor. Não é exigência de loja
nenhuma, e o app sincroniza sozinho ao abrir.

## Sem data

### Nome do vendedor na App Store
Hoje aparece o nome civil, porque a conta é Individual. Trocar para
"EngToschi" exige DBA com comprovação de direito sobre o nome, ou conta
Organization com CNPJ e D-U-N-S. O *App Transfer* faz a migração depois sem
perder avaliações nem usuários — ver `PUBLICAR.md` §1.

### Android
Adiado por decisão de 21/09/2026: uma loja de cada vez. O `.aab` já compila;
falta escolher entre conta pessoal (14 dias de teste fechado) e organização
(CNPJ + D-U-N-S). Ver `PUBLICAR.md`, seção *Android, adiado*.

### `rachapila.com.br` apontando para o site
Hoje o site vive no GitHub Pages e o domínio só serve para e-mail. Apontar é
um CNAME no Registro.br, sem trocar servidores de nome — portanto sem risco
para o Resend. A URL `github.io` já cumpre o papel na ficha da loja.

### Notificação por WhatsApp
Cortado ainda na fase de ideia: exige WhatsApp Business API, empresa
verificada e custo por mensagem. Desproporcional para avisar que alguém
lançou um jantar.

## Descartado

### Sincronização em tempo real (Supabase Realtime)
O app já puxa ao abrir e ao voltar do segundo plano. Manter uma conexão viva
gastaria bateria para ganhar segundos num app onde ninguém está olhando a
tela junto.

### `trip_subgroups` na sincronização
A tabela existe nos dois lados, mas os subgrupos não sincronizam. São um
atalho de lançamento, não um dado do fechamento: quem recebe a viagem vê as
despesas certas mesmo sem eles.
