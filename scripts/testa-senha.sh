#!/usr/bin/env bash
#
# Prova que uma conta entra por senha, e que o servidor está no ar.
#
# A primeira versão disto usava `set -e` e deixava o `curl` abortar o script
# em silêncio quando a rede falhava — justamente o caso mais importante, e o
# que a Apple relatou em 26/10/2026 ("hostname could not be found"). Agora a
# falha de rede é o primeiro diagnóstico, não um fim de linha mudo.
#
#   ./scripts/testa-senha.sh review@rachapila.com.br 'a-senha-de-verdade'
set -uo pipefail
cd "$(dirname "$0")/.."

email="${1:-}"
senha="${2:-}"
if [ -z "$email" ] || [ -z "$senha" ]; then
  echo "uso: $0 <email> <senha>" >&2
  exit 1
fi
if [ "$senha" = "sua-senha" ] || [ "$senha" = "a-senha" ]; then
  echo "✗ você passou o texto de exemplo, não a senha de verdade." >&2
  exit 1
fi

url=$(grep -oE "SUPABASE_URL *= *'[^']+'" src/config/supabase.ts | cut -d"'" -f2 || true)
key=$(grep -oE "SUPABASE_PUBLISHABLE_KEY *= *'[^']+'" src/config/supabase.ts | cut -d"'" -f2 || true)
if [ -z "$url" ] || [ -z "$key" ]; then
  echo "✗ não achei a URL ou a chave em src/config/supabase.ts" >&2
  exit 1
fi
host=${url#https://}; host=${host%%/*}
echo "servidor: $host"

# 1) O nome resolve? É a falha que a Apple relatou, e precisa de diagnóstico
#    próprio: sem isto, todo o resto falha sem explicar por quê.
if ! ips=$(dig +short "$host" A 2>/dev/null) || [ -z "$ips" ]; then
  ips=$(host "$host" 2>/dev/null | head -3 || true)
fi
if [ -z "$ips" ]; then
  echo "✗ o nome NÃO resolve — é o erro que o revisor viu."
  echo "  Causa provável: o projeto do Supabase está pausado (plano gratuito"
  echo "  suspende projeto sem uso). Confira no painel."
  exit 2
fi
echo "resolve para: $(printf '%s' "$ips" | tr '\n' ' ')"

# 2) Tem endereço IPv6? A Apple revisa em rede sem IPv4.
v6=$(dig +short "$host" AAAA 2>/dev/null || true)
if [ -z "$v6" ]; then
  echo "⚠ sem registro IPv6 (AAAA) — numa rede só IPv6, como a da revisão"
  echo "  da Apple, o app não alcança este servidor."
else
  echo "IPv6: $(printf '%s' "$v6" | tr '\n' ' ')"
fi

# 3) A conta entra?
resposta=$(curl -s --max-time 20 -X POST "$url/auth/v1/token?grant_type=password" \
  -H "apikey: $key" -H "Content-Type: application/json" \
  -d "{\"email\":\"$email\",\"password\":\"$senha\"}" 2>&1)
curl_saiu=$?

if [ $curl_saiu -ne 0 ]; then
  echo "✗ não consegui falar com o servidor (curl saiu $curl_saiu)"
  printf '%s\n' "$resposta" | sed 's/^/    /'
  exit 2
fi

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
