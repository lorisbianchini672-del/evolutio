#!/bin/sh
# Lance Evolutio sur cet ordinateur, sans installation : http://localhost:3000
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js est nécessaire. Installez-le depuis https://nodejs.org puis relancez."
  exit 1
fi
MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$MAJOR" -lt 20 ]; then
  echo "Node.js 20 ou plus récent est nécessaire (version actuelle : $(node -v))."
  exit 1
fi
if [ ! -f lancer/server.js ]; then
  echo "Version prête à lancer absente. Utilisez : npm install && npm run dev"
  exit 1
fi
export EVOLUTIO_LOCAL=1
export EVOLUTIO_ENV_FILE="$PWD/.env.local"
export HOSTNAME=127.0.0.1
export PORT="${PORT:-3000}"
echo ""
echo "  Evolutio démarre : http://localhost:$PORT"
echo "  Pour arrêter : Ctrl + C"
echo ""
(sleep 2; command -v open >/dev/null 2>&1 && open "http://localhost:$PORT") &
cd lancer && exec node server.js
