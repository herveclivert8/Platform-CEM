#!/bin/sh
# Applique les migrations avant de démarrer l'API (idempotent : ne fait rien si la base est à jour).
set -e
alembic upgrade head
exec "$@"
