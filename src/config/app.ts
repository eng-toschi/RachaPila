import Constants from 'expo-constants';

export const APP_NAME = 'RachaPila';

/**
 * Marca de versão, mostrada na tela "Entrar".
 *
 * Existe por um motivo prático: duas vezes uma correção pareceu não funcionar
 * quando na verdade o aparelho rodava código antigo. Com ela à mão, dá para
 * saber em um segundo qual versão está rodando, sem conferir hash no terminal.
 *
 * Ficava na tela inicial até a véspera do lançamento, e saiu de lá porque
 * quem instala pela loja veria "b45" sem fazer ideia do que é. Esconder só na
 * loja não era opção: o binário do TestFlight e o da App Store são o mesmo.
 *
 * Suba este número a cada correção enviada para teste.
 */
export const APP_BUILD = 'b51';

/**
 * Onde a página pública do app está hospedada, sem barra no fim.
 *
 * Existe como constante porque o endereço é provisório: hoje é o GitHub
 * Pages, e um dia será `rachapila.com.br`. Quando mudar, muda aqui — e não
 * em cada lugar que monta um link.
 */
export const WEB_BASE_URL = 'https://eng-toschi.github.io/RachaPila';

/**
 * A versão que a loja mostra. Lida do `app.json` pelo `expo-constants` em vez
 * de repetida aqui: dois lugares com o mesmo número é um lugar a mais para
 * eles discordarem.
 */
export const APP_VERSION = (Constants.expoConfig?.version ?? '1.0.0');
