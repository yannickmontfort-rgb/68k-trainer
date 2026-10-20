"""
Fabrique le paquet AROS réduit livré avec 68k Trainer, à partir du système extrait de l'ISO
officielle « AROS-<date>-amiga-m68k-boot-iso » (licence publique AROS, redistribuable).

    python scripts/paquet-aros.py <dossier du système AROS extrait> <paquet.zip>

Le dossier Developer (outils et en-têtes pour développer AROS lui-même, 278 Mo), les démos et la
disquette de secours sont retirés : il reste la ROM (boot/amiga/aros-rom.bin et aros-ext.bin) et
le système (Shell, bibliothèques, bureau). Tout est rangé sous « aros/ » dans le zip.
"""
import os
import sys
import zipfile

source, paquet = sys.argv[1], sys.argv[2]
EXCLUS = {'Developer', 'Developer.info', 'Demos', 'Demos.info', 'Emergency-Boot', 'Emergency-Boot.adf', 'Emergency-Boot.info'}
n = 0
with zipfile.ZipFile(paquet, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for dossier, sous, fichiers in os.walk(source):
        rel = os.path.relpath(dossier, source)
        if rel == '.':
            sous[:] = [d for d in sous if d not in EXCLUS]
            fichiers = [f for f in fichiers if f not in EXCLUS]
        for f in fichiers:
            if rel == 'S' and f == 'User-Startup':
                continue  # ajouté par 68k Trainer à l'installation
            chemin = os.path.join(dossier, f)
            z.write(chemin, '/'.join(['aros', *os.path.relpath(chemin, source).split(os.sep)]))
            n += 1
print(n, 'fichiers,', os.path.getsize(paquet) // 1000000, 'Mo')
