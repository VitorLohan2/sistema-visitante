# Usa Node oficial
FROM node:20-alpine

# Define diretório dentro do container
WORKDIR app

# Copia apenas package.json e package-lock.json
COPY package*.json ./

# Instala dependências
RUN npm install

COPY . .

# Copia todo o restante do código

COPY src ./src

# Variáveis padrão
ENV NODE_ENV=production
ENV PORT=3001

# Expõe porta do backend
EXPOSE 3001

# Comando que roda o backend
CMD ["node", "src/server.js"]
