# 🌍 Gerenciamento de Ambientes - Sistema Liberaê

Este documento explica como o sistema de ambientes está configurado e funcionando no **Backend** e **Frontend**.

---

## 📋 Visão Geral

O sistema utiliza **arquivos de ambiente separados** para facilitar a alternância entre desenvolvimento e produção, sem necessidade de editar configurações manualmente.

### ✅ Arquivos Utilizados

| Localização | Arquivo            | Uso             | Versionado no Git? |
| ----------- | ------------------ | --------------- | ------------------ |
| `backend/`  | `.env.development` | Desenvolvimento | ❌ Não             |
| `backend/`  | `.env.production`  | Produção        | ❌ Não             |
| `frontend/` | `.env.development` | Desenvolvimento | ❌ Não             |
| `frontend/` | `.env.production`  | Produção        | ❌ Não             |

---

## 🖥️ Backend - Node.js / Express

### 📁 Estrutura de Arquivos

```
backend/
├── .env.development        # Config de desenvolvimento (porta 3001)
├── .env.production         # Config de produção (porta 3707)
├── .gitignore              # Ignora arquivos .env
├── src/
│   ├── config/
│   │   └── env.js          # Loader inteligente de variáveis
│   └── server.js           # Servidor com indicadores visuais
└── package.json            # Scripts npm
```

### ⚙️ Como Funciona

O backend usa o arquivo [src/config/env.js](backend/src/config/env.js) que:

1. **Detecta o ambiente** via variável `NODE_ENV`
2. **Carrega o arquivo correto**:
   - `NODE_ENV=docker` → carrega `.env.development`
   - `NODE_ENV=production_local` → carrega `.env.production`
3. **Exibe no console** qual arquivo foi carregado

### 🚀 Scripts Disponíveis

```bash
cd backend

# Desenvolvimento (porta 3001)
npm run dev

# Produção (porta 3707)
npm run prod

# Produção com auto-reload (monitoramento)
npm run prod:watch
```

### 📊 Indicador Visual

Ao iniciar, o servidor exibe:

**Desenvolvimento:**

```
══════════════════════════════════════════════════════════════════════
🐳  SERVIDOR BACKEND - DESENVOLVIMENTO (DOCKER)
══════════════════════════════════════════════════════════════════════
📡 Porta interna:  3001
🌍 Acesso externo: http://localhost:3001
⚙️  Ambiente:       docker
🗄️  Banco de dados: neondb
══════════════════════════════════════════════════════════════════════
```

**Produção:**

```
══════════════════════════════════════════════════════════════════════
🏢  SERVIDOR BACKEND - PRODUÇÃO (LOCAL)
══════════════════════════════════════════════════════════════════════
📡 Porta interna:  3707
🌍 Acesso externo: http://localhost:3707
⚙️  Ambiente:       production_local
🗄️  Banco de dados: neondb_prod
══════════════════════════════════════════════════════════════════════
```

### 🔧 Configurações por Ambiente

#### `.env.development` (Desenvolvimento)

```env
NODE_ENV=docker
PORT=3001
DB_HOST_DOCKER=34.225.38.222
DB_PORT_DOCKER=5432
DB_NAME_DOCKER=neondb
CORS_ORIGIN=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3002
```

#### `.env.production` (Produção)

```env
NODE_ENV=production_local
PORT=3707
DB_HOST=34.225.38.222
DB_PORT=5786
DB_NAME=neondb_prod
CORS_ORIGIN=https://visitante.dimeexperience.com.br
ALLOWED_ORIGINS=https://visitante.dimeexperience.com.br
```

---

## 💻 Frontend - React

### 📁 Estrutura de Arquivos

```
frontend/
├── .env.development        # Config de desenvolvimento
├── .env.production         # Config de produção
├── .gitignore              # Ignora arquivos .env
├── src/
│   └── services/
│       └── api.js          # Axios com baseURL dinâmica
└── package.json            # Scripts npm
```

### ⚙️ Como Funciona

O React detecta **automaticamente** qual arquivo `.env` usar:

- **`npm start`** → usa `.env.development`
- **`npm run build`** → usa `.env.production`

Não precisa de configuração adicional! O React lê as variáveis `REACT_APP_*` automaticamente.

### 🚀 Scripts Disponíveis

```bash
cd frontend

# Desenvolvimento (conecta em localhost:3001)
npm start

# Build de produção (conecta em visitante.dimeexperience.com.br)
npm run build

# Testar produção localmente
npm run start:prod
```

### 🔧 Configurações por Ambiente

#### `.env.development` (Desenvolvimento)

```env
REACT_APP_ENV=development
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SOCKET_URL=http://localhost:3001
REACT_APP_DEBUG=true
```

#### `.env.production` (Produção)

```env
REACT_APP_ENV=production
REACT_APP_API_URL=https://visitante.dimeexperience.com.br
REACT_APP_SOCKET_URL=https://visitante.dimeexperience.com.br
REACT_APP_DEBUG=false
```

### 📡 Integração com Backend

O arquivo [frontend/src/services/api.js](frontend/src/services/api.js) usa:

```javascript
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3001",
});
```

A variável `REACT_APP_API_URL` muda automaticamente conforme o ambiente!

---

## 🔄 Fluxo de Trabalho Completo

### 1️⃣ Desenvolvimento Local

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Servidor rodando em http://localhost:3001

# Terminal 2 - Frontend
cd frontend
npm start
# Aplicação rodando em http://localhost:3000
```

✅ **Resultado:**

- Frontend conecta automaticamente em `http://localhost:3001`
- Banco de dados de desenvolvimento (`neondb`)
- CORS liberado para localhost
- Auto-reload ativo em ambos

---

### 2️⃣ Produção

```bash
# Backend (no servidor)
cd backend
npm run prod
# Servidor rodando em http://localhost:3707

# Frontend (build local)
cd frontend
npm run build
# Gera pasta build/ otimizada
```

✅ **Resultado:**

- Frontend aponta para `https://visitante.dimeexperience.com.br`
- Banco de dados de produção (`neondb_prod`)
- CORS restrito
- Código otimizado

---

## 🔒 Segurança e Git

### ⚠️ O que NÃO é versionado:

```bash
# Backend
.env
.env.development
.env.production

# Frontend
.env
.env.development
.env.production
```

Estes arquivos estão no `.gitignore` de cada projeto!

### ✅ O que PODE ser versionado:

- ❌ Nenhum arquivo `.env` com dados reais
- ✅ Apenas templates vazios (removidos neste projeto)

---

## 🛠️ Troubleshooting

### Backend não está conectando ao banco

1. Verifique o arquivo `.env.development` ou `.env.production`
2. Confirme as credenciais do banco de dados
3. Teste a conexão:
   ```bash
   curl http://localhost:3001/health
   ```

### Frontend não está conectando ao Backend

1. Verifique se o backend está rodando:

   ```bash
   curl http://localhost:3001/health
   ```

2. Confirme o `.env.development`:

   ```env
   REACT_APP_API_URL=http://localhost:3001
   ```

3. **Reinicie o frontend** após alterar `.env`:
   ```bash
   # Ctrl+C no terminal
   npm start
   ```

### Erro: "Porta já em uso"

**Solução:**

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti :3001 | xargs kill -9
```

---

## 📊 Tabela Resumida

### Backend

| Comando        | Ambiente        | Porta | Arquivo Carregado  | Banco de Dados |
| -------------- | --------------- | ----- | ------------------ | -------------- |
| `npm run dev`  | Desenvolvimento | 3001  | `.env.development` | neondb (dev)   |
| `npm run prod` | Produção        | 3707  | `.env.production`  | neondb_prod    |

### Frontend

| Comando              | Ambiente        | API URL                                 | Arquivo Carregado  |
| -------------------- | --------------- | --------------------------------------- | ------------------ |
| `npm start`          | Desenvolvimento | http://localhost:3001                   | `.env.development` |
| `npm run build`      | Produção        | https://visitante.dimeexperience.com.br | `.env.production`  |
| `npm run start:prod` | Teste Produção  | https://visitante.dimeexperience.com.br | `.env.production`  |

---

## 🎯 Checklist Rápido

### ✅ Antes de Iniciar Desenvolvimento

- [ ] Backend: `.env.development` existe e está configurado
- [ ] Frontend: `.env.development` existe e está configurado
- [ ] Porta 3001 está livre
- [ ] Porta 3000 está livre

### ✅ Antes de Deploy em Produção

- [ ] Backend: `.env.production` existe e está configurado corretamente
- [ ] Frontend: `.env.production` aponta para URL de produção
- [ ] Banco de dados de produção está acessível
- [ ] CORS configurado corretamente
- [ ] Chaves JWT e secrets são diferentes de desenvolvimento

---

## 💡 Dicas Profissionais

### 1. Verificar ambiente ativo

**Backend:**

```bash
cd backend
cat .env.development | grep NODE_ENV
```

**Frontend:**

```bash
cd frontend
cat .env.development | grep REACT_APP_ENV
```

### 2. Testar integração

```bash
# Backend rodando?
curl http://localhost:3001/health

# Resposta esperada:
# {"status":"OK","timestamp":"2026-01-27T15:44:36.532Z","version":"2.0.0"}
```

### 3. Gerar chaves seguras

```bash
# Para JWT_SECRET e ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📚 Documentação Relacionada

- [ENVIRONMENT.md](ENVIRONMENT.md) - Guia completo de configuração
- [QUICK_START.md](QUICK_START.md) - Guia rápido de início
- [backend/README.md](../backend/README.md) - Documentação do backend

---

## 🎉 Resumo

### Sistema Atual:

✅ **Backend:** Usa `.env.development` e `.env.production` com scripts `npm run dev` e `npm run prod`  
✅ **Frontend:** Usa `.env.development` e `.env.production` automaticamente  
✅ **Git:** Não versiona arquivos `.env` com dados sensíveis  
✅ **Profissional:** Indicadores visuais claros de qual ambiente está ativo

### Execução Simples:

```bash
# Desenvolvimento
cd backend && npm run dev     # Backend porta 3001
cd frontend && npm start      # Frontend porta 3000

# Produção
cd backend && npm run prod    # Backend porta 3707
cd frontend && npm run build  # Build otimizado
```

**Tudo funcionando de forma limpa, organizada e profissional!** 🚀

---

**Desenvolvido por Vitor Lohan**
