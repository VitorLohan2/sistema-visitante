# Production stage - sql.js é JavaScript puro, não precisa de compilação
FROM node:18-alpine

WORKDIR /app

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S controlid -u 1001

# Criar diretórios necessários
RUN mkdir -p /app/data /app/logs && \
    chown -R controlid:nodejs /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY --chown=controlid:nodejs . .

# Definir variáveis de ambiente
ENV NODE_ENV=production \
    PORT=3050

# Expor porta
EXPOSE 3050

# Usar usuário não-root
USER controlid

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3050/health || exit 1

# Comando de inicialização
CMD ["node", "src/server.js"]
