#!/bin/bash
# Script d'après-installation du paquet .deb de 68k Trainer.
# Reprend le modèle d'electron-builder 25.1.8 (lien /usr/bin, droits de chrome-sandbox, base MIME et
# menus) et ajoute un profil AppArmor pour Ubuntu 24.04 et ses dérivées (KDE neon, Mint 22…).
#
# Pourquoi : depuis Ubuntu 24.04, AppArmor empêche les programmes ordinaires de créer des espaces de
# noms utilisateur. Le bac à sable de Chromium (donc d'Electron) en a besoin ; sans eux il se rabat
# sur chrome-sandbox en SUID et l'application s'arrête au lancement (issue GitHub du 10/11/2026).
# Le profil ci-dessous autorise ces espaces de noms pour 68k Trainer seulement. C'est ce que font
# aussi les paquets récents d'electron-builder (v26) et l'éditeur Pulsar (PR 1466).

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

# Lien vers l'exécutable
if type update-alternatives >/dev/null 2>&1; then
    # Supprimer un ancien lien qui n'utiliserait pas update-alternatives
    if [ -L "/usr/bin/$EXECUTABLE" ] && [ -e "/usr/bin/$EXECUTABLE" ] && [ "$(readlink "/usr/bin/$EXECUTABLE")" != "/etc/alternatives/$EXECUTABLE" ]; then
        rm -f "/usr/bin/$EXECUTABLE"
    fi
    update-alternatives --install "/usr/bin/$EXECUTABLE" "$EXECUTABLE" "$APP_EXE" 100 || ln -sf "$APP_EXE" "/usr/bin/$EXECUTABLE"
else
    ln -sf "$APP_EXE" "/usr/bin/$EXECUTABLE"
fi

# Profil AppArmor (seulement si AppArmor 4 est présent : Ubuntu 24.04 et suivantes)
APPARMOR_PROFILE="/etc/apparmor.d/$EXECUTABLE"
if [ -d /etc/apparmor.d ] && [ -e /etc/apparmor.d/abi/4.0 ] && command -v apparmor_parser >/dev/null 2>&1; then
    cat > "$APPARMOR_PROFILE" <<APPARMOR
# Profil installé par le paquet 68k Trainer : autorise les espaces de noms utilisateur
# nécessaires au bac à sable d'Electron. Supprimé à la désinstallation.
abi <abi/4.0>,
include <tunables/global>

profile $EXECUTABLE "$APP_EXE" flags=(unconfined) {
  userns,

  include if exists <local/$EXECUTABLE>
}
APPARMOR
    if ! apparmor_parser --replace --write-cache --skip-read-cache "$APPARMOR_PROFILE" 2>/dev/null; then
        echo "68k Trainer : le profil AppArmor n'a pas pu être chargé, passage au bac à sable SUID." >&2
        rm -f "$APPARMOR_PROFILE"
    fi
fi

# Droits de chrome-sandbox : SUID seulement si aucun profil AppArmor n'a été chargé ET que les
# espaces de noms utilisateur sont absents ou bridés par AppArmor (Ubuntu 24.04 sans profil).
USERNS_BRIDE=0
if [ "$(cat /proc/sys/kernel/apparmor_restrict_unprivileged_userns 2>/dev/null)" = "1" ]; then
    USERNS_BRIDE=1
fi
if [ ! -e "$APPARMOR_PROFILE" ] && { [ "$USERNS_BRIDE" = "1" ] || ! { [[ -L /proc/self/ns/user ]] && unshare --user true 2>/dev/null; }; }; then
    chmod 4755 "$APP_DIR/chrome-sandbox" || true
else
    chmod 0755 "$APP_DIR/chrome-sandbox" || true
fi

# Mettre à jour la base MIME et les menus
if hash update-mime-database 2>/dev/null; then
    update-mime-database /usr/share/mime || true
fi
if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications || true
fi
