#!/usr/bin/env bash
# Essai d'un programme dans un vrai Amiga émulé (WinUAE + Kickstart AROS), sans rien toucher.
#
#   scripts/essai-winuae.sh programme.s [délai-en-secondes]
#
# Le source est assemblé en exécutable AmigaDOS (npm run asm -- --amiga), copié dans
# winuae-partage/essai/ (le disque PARTAGE: de l'Amiga), puis AROS démarre, lance le programme
# depuis son Shell (S:User-Startup exécute PARTAGE:essai/lancer) et écrit sa sortie et son code de
# retour dans PARTAGE:essai/sortie.txt, affichée ici. Le programme doit se terminer tout seul.
#
# Variables : WINUAE (winuae64.exe) et WINUAE_CONFIG (fichier .uae), par défaut dans ~/Outils/WinUAE.
set -euo pipefail

source="${1:?Usage : scripts/essai-winuae.sh programme.s [délai]}"
delai="${2:-150}"
racine="$(cd "$(dirname "$0")/.." && pwd)"
winuae="${WINUAE:-$HOME/Outils/WinUAE/winuae64.exe}"
config="${WINUAE_CONFIG:-$HOME/Outils/WinUAE/68k-trainer-aros.uae}"
essai="$racine/winuae-partage/essai"
nom="$(basename "${source%.*}")"

mkdir -p "$essai"
cp "$racine/content/fichiers/amiga-systeme.s" "$essai/"
cp "$source" "$essai/$nom.s"
(cd "$racine" && npm run asm --silent -- "winuae-partage/essai/$nom.s" --amiga)
printf 'Echo "== %s" >PARTAGE:essai/sortie.txt\nPARTAGE:essai/%s >>PARTAGE:essai/sortie.txt\nEcho "code de retour : $RC" >>PARTAGE:essai/sortie.txt\nEcho "FIN" >>PARTAGE:essai/sortie.txt\n' "$nom" "$nom" > "$essai/lancer"
rm -f "$essai/sortie.txt"

"$winuae" -f "$(cygpath -w "$config" 2>/dev/null || echo "$config")" >/dev/null 2>&1 &
for ((i = 0; i < delai; i++)); do
  grep -q FIN "$essai/sortie.txt" 2>/dev/null && break
  sleep 1
done
taskkill //F //IM winuae64.exe >/dev/null 2>&1 || true
rm -f "$essai/lancer"
if [ -f "$essai/sortie.txt" ]; then iconv -f ISO-8859-1 -t UTF-8 "$essai/sortie.txt"; else echo "(aucune sortie : le programme ne s'est pas terminé à temps)"; exit 1; fi
grep -q FIN "$essai/sortie.txt" || { echo "(le programme ne s'est pas terminé, ou son code de retour dépasse 20)"; exit 1; }
