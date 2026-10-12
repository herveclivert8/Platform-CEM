# Site React — build statique servi par nginx, qui relaie /api et /uploads vers le backend
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.29-alpine
# Modèle rempli au démarrage avec les variables ci-dessous (voir nginx.conf.template)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 real-ip.sh /docker-entrypoint.d/25-real-ip.sh
COPY --from=build /app/dist /usr/share/nginx/html
# PORT : imposé par l'hébergeur (Render : 10000). BACKEND_ADDRESS : hôte:port du backend
# (Render : adresse interne du service privé, fournie par render.yaml).
# NGINX_ENTRYPOINT_LOCAL_RESOLVERS : fournit au modèle le DNS du conteneur (NGINX_LOCAL_RESOLVERS).
# TRUSTED_PROXIES : proxys de l'hébergeur placés devant nginx (Render : 10.0.0.0/8), voir real-ip.sh.
ENV PORT=80 \
    BACKEND_ADDRESS=backend:8000 \
    TRUSTED_PROXIES="" \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null || exit 1
