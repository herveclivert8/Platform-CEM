#!/bin/sh
set -e

# Met la base à jour avant de démarrer (sans effet si elle l'est déjà)
alembic upgrade head

exec "$@"
