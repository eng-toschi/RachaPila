#!/bin/bash
# Converte capturas de tela de um iPhone Pro para o tamanho que a App Store
# pede (1284×2778, o slot de 6,5 pol.).
#
# Existe porque a ficha só aceita tamanho de Max/Plus e o aparelho na mão é um
# Pro. A proporção dos dois é quase a mesma — 0,460 contra 0,462 — então
# ampliar até a largura certa e aparar a sobra de altura sai visualmente
# idêntico, e evita instalar o Xcode inteiro só para rodar um simulador.
#
#   ./scripts/capturas.sh ~/Desktop/prints
#
# Lê todo PNG da pasta e escreve em <pasta>/appstore/.
set -euo pipefail

LARGURA=1284
ALTURA=2778

origem="${1:-}"
if [ -z "$origem" ] || [ ! -d "$origem" ]; then
  echo "uso: $0 <pasta-com-os-prints>" >&2
  exit 1
fi

if ! command -v sips >/dev/null; then
  echo "erro: 'sips' não encontrado — este script é para macOS." >&2
  exit 1
fi

destino="$origem/appstore"
mkdir -p "$destino"

achou=0
for arquivo in "$origem"/*.[pP][nN][gG]; do
  [ -e "$arquivo" ] || continue
  achou=1
  nome=$(basename "$arquivo")
  saida="$destino/$nome"

  # Amplia até a largura exigida; a altura acompanha a proporção original.
  sips --resampleWidth "$LARGURA" "$arquivo" --out "$saida" >/dev/null
  # Apara a sobra de altura a partir do centro — some alguns pixels em cima e
  # embaixo, onde há barra de status e área de gesto, não conteúdo.
  sips -c "$ALTURA" "$LARGURA" "$saida" >/dev/null

  dim=$(sips -g pixelWidth -g pixelHeight "$saida" | awk '/pixel/ {printf "%s ", $2}')
  echo "  $nome → ${dim% }"
done

if [ "$achou" = 0 ]; then
  echo "nenhum PNG encontrado em $origem" >&2
  exit 1
fi

echo
echo "prontas em: $destino"
