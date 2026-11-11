#!/bin/bash
# Script d'après-désinstallation du paquet .deb de 68k Trainer.
# Reprend le modèle d'electron-builder et retire le profil AppArmor posé par after-install.sh.

# Noms en clair, sans accolades : on ne dépend pas de la substitution des modèles d'electron-builder.
EXECUTABLE='trainer-68k-2'          # champ "name" de package.json
APP_DIR='/opt/68k Trainer 2'        # /opt/<productName>
if [ ! -x "$APP_DIR/$EXECUTABLE" ]; then
    # Filet de sécurité si le dossier d'installation porte un autre nom
    for d in /opt/*; do
        if [ -x "$d/$EXECUTABLE" ]; then APP_DIR="$d"; break; fi
    done
fi
APP_EXE="$APP_DIR/$EXECUTABLE"

# Supprimer le lien vers l'exécutable
if type update-alternatives >/dev/null 2>&1; then
    update-alternatives --remove "$EXECUTABLE" "$APP_EXE"
else
    rm -f "/usr/bin/$EXECUTABLE"
fi

# Retirer le profil AppArmor
APPARMOR_PROFILE="/etc/apparmor.d/$EXECUTABLE"
if [ -f "$APPARMOR_PROFILE" ]; then
    if command -v apparmor_parser >/dev/null 2>&1; then
        apparmor_parser --remove "$APPARMOR_PROFILE" 2>/dev/null || true
    fi
    rm -f "$APPARMOR_PROFILE"
fi
