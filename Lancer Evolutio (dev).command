#!/bin/bash
# Lance le site Evolutio en mode développement sur ce Mac : http://localhost:3000
cd "$(dirname "$0")" || exit 1
if [ ! -d node_modules/next ]; then
  echo "  Installation des dépendances (la première fois peut prendre quelques minutes)…"
  npm install --no-audit --no-fund || { read -r -p "npm install a échoué. Entrée pour fermer"; exit 1; }
fi
SWC="swc-darwin-$( [ "$(uname -m)" = arm64 ] && echo arm64 || echo x64 )"
if [ ! -d "node_modules/@next/$SWC" ]; then
  echo "  Ajout du compilateur Next.js pour ce Mac…"
  npm install --no-save --no-audit --no-fund "@next/$SWC@$(node -p "require('next/package.json').version")"
fi
echo ""
echo "  Evolutio démarre : http://localhost:3000   (pour arrêter : Ctrl + C)"
echo ""
(for i in $(seq 1 90); do sleep 2; if curl -s -o /dev/null http://127.0.0.1:3000; then open "http://localhost:3000"; break; fi; done) &
npm run dev
