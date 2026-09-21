export const APP_NAME = 'RachaPila';

/**
 * Marca de versão visível na home.
 *
 * Existe por um motivo prático: duas vezes uma correção pareceu não funcionar
 * quando na verdade o aparelho rodava código antigo. Com isto na tela, dá para
 * saber em um segundo qual versão está rodando, sem conferir hash no terminal.
 *
 * Suba este número a cada correção enviada para teste.
 */
export const APP_BUILD = 'b44';

/**
 * Onde a página pública do app está hospedada, sem barra no fim.
 *
 * Existe como constante porque o endereço é provisório: hoje é o GitHub
 * Pages, e um dia será `rachapila.com.br`. Quando mudar, muda aqui — e não
 * em cada lugar que monta um link.
 */
export const WEB_BASE_URL = 'https://eng-toschi.github.io/RachaPila';
