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

**Palavras-chave (máx. 100 caracteres, separadas por vírgula):**
```
dividir conta,racha,viagem,despesas,amigos,pix,grupo,câmbio,IOF,gastos,rateio
```

**URL de suporte:** a página hospedada (ver §3)
**URL de privacidade:** a mesma página + `/privacidade.html`

**Categoria:** Finanças (primária) · Viagens (secundária)
**Classificação etária:** 4+ (não há conteúdo restrito)

---

## 2. Rótulos de privacidade

O app **não rastreia ninguém**: em "Data Used to Track You", a resposta é
**nenhum dado**. Não há SDK de anúncio, análise ou atribuição no projeto —
isso é verificável no `package.json`.

O que é coletado (no sentido da Apple: sai do aparelho), tudo **vinculado à
identidade** e tudo com a finalidade **"App Functionality"** apenas:

| Dado | Categoria da Apple | Quando sai do aparelho |
|---|---|---|
| E-mail | Contact Info → Email Address | Ao criar a conta |
| Viagens, despesas, valores, participantes | User Content → Other User Content | Só ao compartilhar a viagem |
| Coordenada de onde a despesa aconteceu | Location → Precise Location | Só ao compartilhar a viagem, e só se a permissão foi dada |
| Chave Pix (pode ser um CPF) | ver observação abaixo | Só ao compartilhar a viagem, e só se a pessoa cadastrou |

**Observação sobre a chave Pix:** ela não encaixa bem em nenhuma categoria da
Apple. "Payment Info" é pensado para cartão de crédito; um CPF é mais próximo
de identificador nacional. A escolha mais defensável é declarar em
**Financial Info → Other Financial Info** e descrever honestamente no campo
de texto. Vale conferir a redação atual das categorias na hora de preencher,
porque a Apple mexe nelas de tempos em tempos — e declarar a mais é sempre
mais seguro do que declarar a menos.

**Google Play (Data Safety):** mesmas respostas. Marcar que os dados são
criptografados em trânsito (são, é HTTPS) e que o usuário pode pedir a
exclusão (pode, dentro do app).

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
- [ ] **Capturas de tela** — a Apple pede pelo menos as de 6,7"/6,9"
      (1290×2796). Dá para tirar do simulador do iPhone ou do aparelho.
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
