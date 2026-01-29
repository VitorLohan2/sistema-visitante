# 🌍 Gerenciamento de Ambientes - Backend

Este documento explica como o sistema de ambientes está configurado e funcionando no **Backend**.

---

## 📋 Visão Geral

O sistema utiliza **arquivos de ambiente separados** para facilitar a alternância entre desenvolvimento e produção, sem necessidade de editar configurações manualmente.

### ✅ Arquivos de Ambiente

| Arquivo                | Uso                   | NODE_ENV           | Porta |
| ---------------------- | --------------------- | ------------------ | ----- |
| `.env.desenvolvimento` | Desenvolvimento local | `docker`           | 3001  |
| `.env.producao`        | Produção (VM/Docker)  | `production_local` | 3707  |
| `.env.teste`           | Testes automatizados  | `teste`            | 3002  |

> ⚠️ **Importante:** Nenhum arquivo `.env` é versionado no Git por segurança.

---

## 📁 Estrutura de Arquivos

```
backend/
├── .env.desenvolvimento    # Config de desenvolvimento (porta 3001)
├── .env.producao           # Config de produção (porta 3707)
├── .env.teste              # Config de testes
├── .gitignore              # Ignora arquivos .env
├── src/
│   ├── config/
│   │   └── env.js          # Loader inteligente de variáveis
│   └── server.js           # Servidor com indicadores visuais
└── package.json            # Scripts npm
```

---

## ⚙️ Como Funciona o Carregamento

O backend usa o arquivo `src/config/env.js` que:

1. **Detecta o ambiente** via variável `NODE_ENV`
2. **Carrega o arquivo correto**:
   - `NODE_ENV=docker` → carrega `.env.desenvolvimento`
   - `NODE_ENV=production_local` → carrega `.env.producao`
   - `NODE_ENV=teste` → carrega `.env.teste`
3. **Exibe no console** qual arquivo foi carregado

---

## 🚀 Scripts Disponíveis

```bash
cd backend

# Desenvolvimento (porta 3001)
npm run dev

# Produção (porta 3707)
npm run prod

# Produção com auto-reload
npm run prod:watch

# Testes
npm test
```

---

## 📊 Indicador Visual no Console

### Desenvolvimento:

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

### Produção:

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

---

## 🔧 Variáveis de Ambiente por Arquivo

### `.env.desenvolvimento`

```env
NODE_ENV=docker
PORT=3001

# Banco de Dados (Desenvolvimento)
DB_CLIENT=pg
DB_HOST=34.225.38.222
DB_PORT=5432
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=sua_senha_dev

# CORS
CORS_ORIGIN=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3002

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# JWT
JWT_SECRET=chave_desenvolvimento
JWT_EXPIRES_IN=7d
```

### `.env.producao`

```env
NODE_ENV=production_local
PORT=3707

# Banco de Dados (Produção)
DB_CLIENT=pg
DB_HOST=database              # Nome do container no Docker
DB_PORT=5432
DB_NAME=neondb_prod
DB_USER=neondb_owner_prod
DB_PASSWORD=sua_senha_prod

# CORS
CORS_ORIGIN=https://visitante.dimeexperience.com.br
ALLOWED_ORIGINS=https://visitante.dimeexperience.com.br,https://sistema-visitante.vercel.app

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# JWT (GERE CHAVES FORTES!)
JWT_SECRET=chave_producao_muito_forte_64_caracteres
JWT_EXPIRES_IN=7d

# Dashboard
DASHBOARD_PASSWORD_HASH=$2b$12$xxx
DASHBOARD_JWT_SECRET=chave_jwt_dashboard

# Monitoramento
COUNT_REQUESTS=true
LOG_REQUESTS=false
ADMIN_STATS_KEY=chave_admin_stats
```

---

## 🐳 Ambiente no Docker (Produção - VM)

Na VM de produção, as variáveis são passadas via `docker-compose-prod.yml`:

```yaml
backend:
  image: "${DOCKER_USERNAME}/liberae:${IMAGE_TAG}"
  environment:
    - NODE_ENV=production_local
    - DATABASE_URL=postgresql://user:pass@database:5432/neondb_prod
    - DB_HOST=database # Container interno
    - PORT=3707
    # ... outras variáveis
```

O arquivo `.env` da VM contém apenas:

```env
DOCKER_USERNAME=vitorlohan
IMAGE_TAG=v2.0.5
```

> 📖 Veja [DEPLOY_PRODUCAO_GUIA.md](DEPLOY_PRODUCAO_GUIA.md) para detalhes do deploy automatizado.

---

## 🔄 Fluxo de Trabalho

### Desenvolvimento Local

```bash
# Terminal - Backend
cd backend
npm run dev
# Servidor rodando em http://localhost:3001
# Conectando ao banco de desenvolvimento (neondb)
```

### Produção (Deploy Automatizado)

```bash
# Fazer commit e push
git add .
git commit -m "feat: nova funcionalidade"
git push origin main

# GitHub Actions automaticamente:
# 1. Cria nova tag (v2.0.x)
# 2. Build da imagem Docker
# 3. Push para Docker Hub
# 4. Deploy na VM
```

---

## 🔒 Segurança

### ⚠️ O que NÃO é versionado:

```gitignore
# Backend
.env
.env.desenvolvimento
.env.producao
.env.teste
```

### ✅ Boas Práticas:

- Nunca commit arquivos `.env` com dados reais
- Use chaves diferentes para dev e prod
- Gere chaves fortes para produção:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🛠️ Troubleshooting

### Backend não conecta ao banco

1. Verifique o arquivo `.env.desenvolvimento` ou `.env.producao`
2. Confirme as credenciais do banco
3. Teste a conexão:
   ```bash
   curl http://localhost:3001/health
   ```

### Erro: "Porta já em uso"

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti :3001 | xargs kill -9
```

### Verificar ambiente ativo

```bash
# Ver qual ambiente está configurado
cat backend/.env.desenvolvimento | grep NODE_ENV
```

---

## 📊 Tabela Resumo

| Comando        | Ambiente        | Porta | Arquivo Carregado      | Banco        |
| -------------- | --------------- | ----- | ---------------------- | ------------ |
| `npm run dev`  | Desenvolvimento | 3001  | `.env.desenvolvimento` | neondb       |
| `npm run prod` | Produção        | 3707  | `.env.producao`        | neondb_prod  |
| `npm test`     | Teste           | 3002  | `.env.teste`           | neondb_teste |

---

## 📚 Documentos Relacionados

- [DEPLOY_PRODUCAO_GUIA.md](DEPLOY_PRODUCAO_GUIA.md) - Deploy automatizado
- [BACKEND_ARQUITETURA.md](BACKEND_ARQUITETURA.md) - Arquitetura do backend
- [GUIA_DASHBOARD_PRODUCAO.md](GUIA_DASHBOARD_PRODUCAO.md) - Dashboard de monitoramento
