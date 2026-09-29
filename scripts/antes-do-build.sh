#!/usr/bin/env bash
#
# Confere se esta pasta está pronta para virar um build.
#
# Existe porque o projeto é compilado de mais de um computador, e uma pasta
# atrasada não avisa: o `eas build` compila feliz o código velho, e o defeito
# só aparece meia hora depois, no aparelho. Já custou um ciclo inteiro.
#
# Uso:  ./scripts/antes-do-build.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# O remote tem nome diferente em cada máquina — acha pelo endereço.
remote=$(git remote -v | awk '/RachaPila\.git \(fetch\)/ {print $1; exit}')
if [ -z "$remote" ]; then
  echo "✗ nenhum remote aponta para RachaPila.git"; exit 1
fi

falhou=0

if [ -n "$(git status --porcelain)" ]; then
  echo "✗ há mudanças não comitadas — o build sairia com elas"
  git status --short | sed 's/^/    /'
  falhou=1
fi

git fetch --quiet "$remote" main
atras=$(git rev-list --count HEAD.."$remote"/main)
if [ "$atras" -gt 0 ]; then
  echo "✗ esta pasta está $atras commit(s) atrás — falta: git pull $remote main"
  git log --oneline HEAD.."$remote"/main | sed 's/^/    /'
  falhou=1
fi

build=$(grep -o "APP_BUILD = '[^']*'" src/config/app.ts | cut -d"'" -f2)

if [ "$falhou" -eq 1 ]; then
  echo
  echo "NÃO rode o build ainda."
  exit 1
fi

echo "✓ tudo em dia com $remote/main"
echo "✓ este build vai sair como $build — confira na tela Entrar depois de instalar"
