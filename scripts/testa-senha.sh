#!/usr/bin/env bash
#
# Prova que uma conta entra por senha, sem precisar de build nem de aparelho.
#
# Existe porque a entrada por senha nasceu para a revisão da Apple, e esperar
# meia hora de build para descobrir que a conta estava mal criada é caro. Isto
# fala com o mesmo endpoint que o app usa.
#
#   ./scripts/testa-senha.sh review@rachapila.com.br 'a-senha'
set -euo pipefail
cd "$(dirname "$0")/.."

email="${1:-}"
senha="${2:-}"
if [ -z "$email" ] || [ -z "$senha" ]; then
  echo "uso: $0 <email> <senha>" >&2
  exit 1
fi

url=$(grep -oE "SUPABASE_URL *= *'[^']+'" src/config/supabase.ts | cut -d"'" -f2)
key=$(grep -oE "SUPABASE_PUBLISHABLE_KEY *= *'[^']+'" src/config/supabase.ts | cut -d"'" -f2)
if [ -z "$url" ] || [ -z "$key" ]; then
  echo "não achei a URL ou a chave em src/config/supabase.ts" >&2
  exit 1
fi

resposta=$(curl -s -X POST "$url/auth/v1/token?grant_type=password" \
  -H "apikey: $key" -H "Content-Type: application/json" \
  -d "{\"email\":\"$email\",\"password\":\"$senha\"}")

if printf '%s' "$resposta" | grep -q '"access_token"'; then
  echo "✓ entrou — a conta serve para a revisão"
  exit 0
fi

echo "✗ não entrou"
printf '%s\n' "$resposta" | sed 's/^/    /'
echo
echo "Causas comuns:"
echo "  'Invalid login credentials'  → senha errada, ou a conta não tem senha"
echo "  'Email not confirmed'        → faltou marcar confirmar automaticamente"
