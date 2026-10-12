#!/bin/sh
# Applique les migrations avant de démarrer l'API (idempotent : ne fait rien si la base est à jour).
set -e

# Disque monté sur le dossier des fichiers envoyés (Render, volume Docker) : il doit être accessible en écriture
upload_dir="${UPLOAD_DIR:-uploads}"
if [ -d "$upload_dir" ] && [ ! -w "$upload_dir" ]; then
    echo "ATTENTION : le dossier $upload_dir (dans $(pwd)) n'est pas accessible en écriture par l'utilisateur $(id -un) (uid $(id -u))." >&2
    echo "            L'envoi d'images et de documents échouera tant que ses droits ne sont pas corrigés." >&2
fi

alembic upgrade head
exec "$@"
