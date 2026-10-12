#!/bin/sh
# IP réelle des visiteurs quand un proxy de l'hébergeur (Render...) est placé devant nginx.
# TRUSTED_PROXIES : adresses ou réseaux de ces proxys, séparés par des espaces ou des virgules
# (Render : 10.0.0.0/8). nginx lit alors l'IP du visiteur dans X-Forwarded-For, en partant de la
# droite et en ignorant ces proxys : une valeur ajoutée par le visiteur lui-même n'est jamais retenue.
# Vide (par défaut) : l'adresse de connexion est l'IP du visiteur, X-Forwarded-For est ignoré.
set -eu

conf=/etc/nginx/conf.d/real-ip.conf
: > "$conf"
[ -n "${TRUSTED_PROXIES:-}" ] || exit 0

for proxy in $(echo "$TRUSTED_PROXIES" | tr ',' ' '); do
    case "$proxy" in
        *[!0-9A-Fa-f.:/]*)
            echo "$0: TRUSTED_PROXIES contient une valeur invalide : $proxy" >&2
            exit 1
            ;;
    esac
    echo "set_real_ip_from $proxy;" >> "$conf"
done
cat >> "$conf" <<'EOF'
real_ip_header X-Forwarded-For;
real_ip_recursive on;
EOF
echo "$0: IP réelle lue dans X-Forwarded-For (proxys de confiance : $TRUSTED_PROXIES)"
