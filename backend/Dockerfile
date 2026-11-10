# Estágio 1: compila o TypeScript
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Estágio 2: imagem final enxuta, só com dependências de produção
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Pasta dos PDFs das contestações: pertence ao usuário "node" (o volume nomeado herda essa permissão).
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
