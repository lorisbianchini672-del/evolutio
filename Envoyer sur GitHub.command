#!/bin/sh
# Envoie le travail enregistré sur GitHub (branche main).
cd "$(dirname "$0")" || exit 1
git push origin main
echo ""
echo "Terminé. Vous pouvez fermer cette fenêtre."
