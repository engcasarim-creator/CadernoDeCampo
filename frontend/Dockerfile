# Estágio 1: build do React (Vite)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Chave PÚBLICA do Google Maps (o navegador precisa dela). Restrinja-a por HTTP referrer no Google Cloud.
ARG VITE_GOOGLE_MAPS_API_KEY=
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
RUN npm run build

# Estágio 2: serve os arquivos estáticos com nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
