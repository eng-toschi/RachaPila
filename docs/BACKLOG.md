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
