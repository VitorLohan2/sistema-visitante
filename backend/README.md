# 🖥️ Backend - Sistema Liberaê

Backend do sistema de controle de visitantes desenvolvido com Node.js, Express e PostgreSQL.

---

## 🚀 Início Rápido

### 1️⃣ Instalação

```bash
cd backend
npm install
```

### 2️⃣ Configurar Ambiente

```bash
# Copiar template de configuração
cp .env.example .env.development

# Editar com suas credenciais
code .env.development
```

### 3️⃣ Executar

**Desenvolvimento:**

```bash
npm run dev
```

**Produção:**

```bash
npm run prod
```

---

## 📜 Scripts Disponíveis

| Script               | Descrição                             |
| -------------------- | ------------------------------------- |
| `npm run dev`        | ⭐ Desenvolvimento (porta 3001)       |
| `npm run prod`       | 🚀 Produção (porta 3707)              |
| `npm run prod:watch` | 🔍 Produção com auto-reload           |
| `npm test`           | 🧪 Executar testes                    |
| `npm start`          | ⚠️ Modo legado (usar `dev` ou `prod`) |

---

## 🌍 Ambientes

O sistema suporta múltiplos ambientes. Veja mais detalhes em: [docs/ENVIRONMENT.md](../docs/ENVIRONMENT.md)

### Desenvolvimento (🐳 Docker)

```bash
npm run dev
```

- ✅ Porta: **3001**
- ✅ Auto-reload ativo
- ✅ CORS liberado
- ✅ Banco de dados: desenvolvimento

### Produção (🏢 Local)

```bash
npm run prod
```

- ✅ Porta: **3707**
- ⚠️ Sem auto-reload
- ⚠️ CORS restrito
- ✅ Banco de dados: produção

---

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── app.js                 # Configuração do Express
│   ├── server.js              # Inicialização do servidor
│   ├── socket.js              # Configuração Socket.IO
│   ├── config/                # Configurações (DB, Cloudinary, etc)
│   ├── controllers/           # Lógica de negócio
│   ├── routes/                # Rotas da API
│   ├── middleware/            # Middlewares (auth, etc)
│   ├── services/              # Serviços auxiliares
│   └── utils/                 # Utilitários
├── tests/                     # Testes automatizados
├── sql/                       # Scripts SQL
├── .env.example               # ✅ Template de configuração
├── .env.development           # 🐳 Config desenvolvimento (não versionar!)
├── .env.production            # 🏢 Config produção (não versionar!)
└── package.json
```

---

## 🔌 Principais Endpoints

### Autenticação

- `POST /auth/login` - Login com email/senha
- `POST /auth/criar-senha` - Criar senha (primeiro acesso)
- `POST /auth/esqueci-senha` - Recuperar senha
- `PUT /auth/alterar-senha` - Alterar senha (autenticado)

### Visitantes

- `GET /visitantes` - Listar visitantes ativos
- `POST /visitantes` - Registrar entrada
- `PUT /visitantes/:id/saida` - Registrar saída
- `GET /history` - Histórico de visitas

### Agendamentos

- `GET /agendamentos` - Listar agendamentos
- `POST /agendamentos` - Criar agendamento
- `PUT /agendamentos/:id` - Atualizar agendamento

### Tickets

- `GET /tickets` - Listar tickets
- `POST /tickets` - Criar ticket
- `PUT /tickets/:id` - Atualizar ticket

### Dashboard

- `GET /dashboard/stats` - Estatísticas gerais
- `GET /dashboard/visitas-periodo` - Visitas por período

### Utilitários

- `GET /health` - Health check da API

---

## 🗄️ Banco de Dados

### Configuração

O sistema usa **PostgreSQL** com Knex.js como query builder.

Configurações em: [src/config/database.js](src/config/database.js)

### Conexão

| Ambiente            | Configuração                                          |
| ------------------- | ----------------------------------------------------- |
| **Desenvolvimento** | Usa variáveis `DB_HOST_DOCKER`, `DB_USER_DOCKER`, etc |
| **Produção**        | Usa variáveis `DB_HOST`, `DB_USER` ou `DATABASE_URL`  |

### Migrations (se implementadas)

```bash
# Executar migrations
npx knex migrate:latest

# Rollback
npx knex migrate:rollback
```

---

## 🔒 Segurança

### Variáveis Sensíveis

⚠️ **NUNCA commitar:**

- Senhas de banco de dados
- Chaves JWT
- Credenciais de APIs externas
- Arquivos `.env.*` com valores reais

✅ **Sempre versionar:**

- `.env.example` (template sem valores sensíveis)

### Gerar Chaves Fortes

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Executar com coverage
npm test -- --coverage

# Executar testes específicos
npm test -- AuthController
```

---

## 📊 Monitoramento

### Estatísticas de Requisições

Ative no `.env`:

```env
COUNT_REQUESTS=true
ADMIN_STATS_KEY=sua_chave_admin
```

Acesse:

```bash
curl -H "X-Admin-Key: sua_chave_admin" http://localhost:3001/api/stats
```

---

## 🐛 Troubleshooting

### Erro: "Porta já em uso"

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti :3001 | xargs kill -9
```

### Erro: "Cannot connect to database"

1. Verifique as credenciais no `.env.development` ou `.env.production`
2. Confirme que o banco está acessível
3. Teste a conexão:

```bash
# PostgreSQL
psql -h HOST -U USER -d DATABASE
```

### Erro: "Module not found"

```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Documentação Adicional

- [Guia de Ambientes](../docs/ENVIRONMENT.md)
- [Chat de Suporte](../docs/CHAT_SUPORTE_GUIA.md)
- [Configuração de Ambientes](../docs/AMBIENTES.md)

---

## 🛠️ Tecnologias

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **PostgreSQL** - Banco de dados
- **Knex.js** - Query builder
- **Socket.IO** - WebSockets (tempo real)
- **JWT** - Autenticação
- **Nodemailer** - Envio de e-mails
- **Cloudinary** - Upload de imagens
- **Celebrate/Joi** - Validação de dados

---

## 👨‍💻 Desenvolvedor

**Vitor Lohan**

---

## 📄 Licença

MIT
