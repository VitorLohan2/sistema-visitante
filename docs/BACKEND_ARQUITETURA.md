# 🏗️ Arquitetura do Backend

> **Última atualização:** Janeiro 2026 | **Node.js + Express**

Este documento explica a arquitetura do backend, estrutura de pastas, ferramentas utilizadas e o sistema de permissões RBAC.

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura de Pastas](#3-estrutura-de-pastas)
4. [Fluxo de Requisição](#4-fluxo-de-requisição)
5. [Sistema RBAC](#5-sistema-rbac)
6. [Camadas da Aplicação](#6-camadas-da-aplicação)
7. [Banco de Dados](#7-banco-de-dados)
8. [WebSocket (Socket.IO)](#8-websocket-socketio)

---

## 1. Visão Geral

O backend é uma **API RESTful** construída com Node.js e Express, seguindo uma arquitetura em camadas com sistema de permissões **RBAC (Role-Based Access Control)**.

### Características Principais:

- ✅ API RESTful com Express
- ✅ Autenticação JWT
- ✅ Sistema de Permissões RBAC
- ✅ WebSocket para tempo real (Socket.IO)
- ✅ Banco de dados PostgreSQL (Knex.js)
- ✅ Upload de arquivos (Cloudinary)
- ✅ Validação de dados (Celebrate/Joi)
- ✅ Monitoramento de requisições

---

## 2. Stack Tecnológica

### 2.1 Core

| Tecnologia     | Versão | Descrição          |
| -------------- | ------ | ------------------ |
| **Node.js**    | 22.x   | Runtime JavaScript |
| **Express**    | 4.x    | Framework web      |
| **PostgreSQL** | 15.x   | Banco de dados     |
| **Knex.js**    | 3.x    | Query builder SQL  |

### 2.2 Autenticação & Segurança

| Pacote              | Descrição                  |
| ------------------- | -------------------------- |
| `jsonwebtoken`      | Geração e validação de JWT |
| `bcryptjs`          | Hash de senhas             |
| `celebrate` / `joi` | Validação de dados         |
| `cors`              | Controle de CORS           |

### 2.3 Comunicação

| Pacote       | Descrição                 |
| ------------ | ------------------------- |
| `socket.io`  | WebSocket para tempo real |
| `nodemailer` | Envio de e-mails          |
| `axios`      | Requisições HTTP          |

### 2.4 Upload & Mídia

| Pacote       | Descrição                |
| ------------ | ------------------------ |
| `multer`     | Upload de arquivos       |
| `cloudinary` | Armazenamento de imagens |

### 2.5 Utilitários

| Pacote     | Descrição             |
| ---------- | --------------------- |
| `dotenv`   | Variáveis de ambiente |
| `date-fns` | Manipulação de datas  |
| `uuid`     | Geração de IDs únicos |

---

## 3. Estrutura de Pastas

```
backend/
├── src/
│   ├── app.js                 # Configuração do Express
│   ├── server.js              # Inicialização do servidor
│   ├── socket.js              # Configuração Socket.IO
│   │
│   ├── config/                # Configurações
│   │   ├── database.js        # Configuração do Knex
│   │   ├── env.js             # Loader de variáveis de ambiente
│   │   ├── cloudinary.js      # Configuração Cloudinary
│   │   └── multer.js          # Configuração de upload
│   │
│   ├── controllers/           # Lógica de negócio
│   │   ├── AuthController.js
│   │   ├── UsuarioController.js
│   │   ├── VisitanteController.js
│   │   └── ...
│   │
│   ├── routes/                # Definição de rotas
│   │   ├── index.js           # Agregador de rotas
│   │   ├── auth.routes.js
│   │   ├── usuarios.routes.js
│   │   └── ...
│   │
│   ├── middleware/            # Middlewares
│   │   ├── authMiddleware.js      # Autenticação JWT
│   │   ├── permissaoMiddleware.js # Sistema RBAC
│   │   ├── requestMonitor.js      # Monitoramento
│   │   └── dashboardAuth.js       # Auth do Dashboard
│   │
│   ├── services/              # Serviços externos
│   │   ├── emailService.js
│   │   ├── ChatSuporteService.js
│   │   └── ...
│   │
│   ├── database/              # Conexão com banco
│   │   └── connection.js
│   │
│   └── utils/                 # Funções utilitárias
│       ├── generateUniqueId.js
│       ├── password.js
│       └── authHelper.js
│
├── sql/                       # Scripts SQL
│   ├── seed_papeis_permissoes.sql
│   ├── migration_v2.0.0_safe.sql
│   └── ...
│
├── tests/                     # Testes
│   ├── unit/
│   └── integration/
│
├── .env.desenvolvimento       # Variáveis dev
├── .env.producao              # Variáveis prod
├── Dockerfile                 # Build Docker
├── knexfile.js                # Config Knex
└── package.json
```

---

## 4. Fluxo de Requisição

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FLUXO DE REQUISIÇÃO                              │
└─────────────────────────────────────────────────────────────────────────────┘

     Cliente              Middleware               Controller           Database
        │                     │                        │                    │
        │  POST /usuarios     │                        │                    │
        ├────────────────────>│                        │                    │
        │                     │                        │                    │
        │              ┌──────┴──────┐                 │                    │
        │              │ requestMonitor               │                    │
        │              │ (contagem)   │                │                    │
        │              └──────┬──────┘                 │                    │
        │                     │                        │                    │
        │              ┌──────┴──────┐                 │                    │
        │              │ authMiddleware               │                    │
        │              │ (verifica JWT)│               │                    │
        │              └──────┬──────┘                 │                    │
        │                     │                        │                    │
        │              ┌──────┴──────┐                 │                    │
        │              │ requerPermissao              │                    │
        │              │ (verifica RBAC)│              │                    │
        │              └──────┬──────┘                 │                    │
        │                     │                        │                    │
        │              ┌──────┴──────┐                 │                    │
        │              │ celebrate    │                │                    │
        │              │ (validação)  │                │                    │
        │              └──────┬──────┘                 │                    │
        │                     │                        │                    │
        │                     ├───────────────────────>│                    │
        │                     │                        │                    │
        │                     │                 ┌──────┴──────┐             │
        │                     │                 │ Controller   │             │
        │                     │                 │ (lógica)     │             │
        │                     │                 └──────┬──────┘             │
        │                     │                        │                    │
        │                     │                        ├───────────────────>│
        │                     │                        │    Knex query      │
        │                     │                        │<───────────────────│
        │                     │                        │                    │
        │<────────────────────┼────────────────────────│                    │
        │     JSON Response   │                        │                    │
```

---

## 5. Sistema RBAC

O sistema utiliza **Role-Based Access Control** (Controle de Acesso Baseado em Papéis).

### 5.1 Estrutura do Banco

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  usuarios   │     │  usuarios_papeis │     │   papeis    │
├─────────────┤     ├──────────────────┤     ├─────────────┤
│ id          │────<│ usuario_id       │>────│ id          │
│ nome        │     │ papel_id         │     │ nome        │
│ email       │     └──────────────────┘     │ descricao   │
└─────────────┘                              └──────┬──────┘
                                                    │
                                             ┌──────┴───────┐
                                             │papeis_permissoes
                                             ├──────────────┤
                                             │ papel_id     │
                                             │ permissao_id │
                                             └──────┬───────┘
                                                    │
                                             ┌──────┴──────┐
                                             │ permissoes  │
                                             ├─────────────┤
                                             │ id          │
                                             │ chave       │
                                             │ descricao   │
                                             └─────────────┘
```

### 5.2 Exemplo de Permissões

```
papeis:
┌────┬─────────────┬─────────────────────────┐
│ id │ nome        │ descricao               │
├────┼─────────────┼─────────────────────────┤
│ 1  │ ADMIN       │ Administrador           │
│ 2  │ PORTEIRO    │ Porteiro/Recepcionista  │
│ 3  │ SUPERVISOR  │ Supervisor              │
│ 4  │ ATENDENTE   │ Atendente de chat       │
└────┴─────────────┴─────────────────────────┘

permissoes:
┌────┬─────────────────────────┬────────────────────────────┐
│ id │ chave                   │ descricao                  │
├────┼─────────────────────────┼────────────────────────────┤
│ 1  │ usuario_visualizar      │ Visualizar usuários        │
│ 2  │ usuario_criar           │ Criar usuários             │
│ 3  │ usuario_editar          │ Editar usuários            │
│ 4  │ cadastro_bloquear       │ Bloquear cadastros         │
│ 5  │ chat_atendente_acessar  │ Acessar painel de chat     │
└────┴─────────────────────────┴────────────────────────────┘
```

### 5.3 Middleware de Permissão

```javascript
// middleware/permissaoMiddleware.js

/**
 * Middleware para verificar permissões
 * @param {string|string[]} permissoesRequeridas - Permissões necessárias
 * @param {Object} opcoes - { todas: false } = precisa de ao menos UMA
 */
function requerPermissao(permissoesRequeridas, opcoes = { todas: false }) {
  return async (req, res, next) => {
    const usuario_id = getUsuarioId(req);
    const permissoesUsuario = await getPermissoesUsuario(usuario_id);

    let temPermissao;
    if (opcoes.todas) {
      // Precisa ter TODAS as permissões
      temPermissao = permissoes.every((p) => permissoesUsuario.includes(p));
    } else {
      // Precisa ter ao menos UMA permissão
      temPermissao = permissoes.some((p) => permissoesUsuario.includes(p));
    }

    if (!temPermissao) {
      return res.status(403).json({ error: "Sem permissão para esta ação" });
    }

    next();
  };
}
```

### 5.4 Uso nas Rotas

```javascript
// routes/usuarios.routes.js
router.get(
  "/",
  authMiddleware, // 1. Verifica JWT
  requerPermissao("usuario_visualizar"), // 2. Verifica permissão
  UsuarioController.index, // 3. Executa controller
);

router.post(
  "/interno",
  authMiddleware,
  requerPermissao("usuario_criar"), // Precisa de permissão específica
  celebrate({
    /* validação */
  }),
  UsuarioController.createInterno,
);

// Múltiplas permissões (precisa de TODAS)
router.delete(
  "/:id",
  authMiddleware,
  requerPermissao(["usuario_deletar", "usuario_gerenciar"], { todas: true }),
  UsuarioController.delete,
);
```

---

## 6. Camadas da Aplicação

### 6.1 Routes (Rotas)

**Responsabilidade:** Definir endpoints e middlewares.

```javascript
// routes/usuarios.routes.js
router.get('/', authMiddleware, requerPermissao('usuario_visualizar'), UsuarioController.index);
router.post('/', celebrate({...}), UsuarioController.create);
```

### 6.2 Controllers

**Responsabilidade:** Lógica de negócio e interação com banco.

```javascript
// controllers/UsuarioController.js
module.exports = {
  async index(req, res) {
    const usuarios = await connection("usuarios").select("*");
    return res.json(usuarios);
  },

  async create(req, res) {
    const { nome, email } = req.body;
    const [usuario] = await connection("usuarios")
      .insert({ nome, email })
      .returning("*");
    return res.status(201).json(usuario);
  },
};
```

### 6.3 Middleware

**Responsabilidade:** Interceptar e processar requisições.

```javascript
// middleware/authMiddleware.js
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}
```

### 6.4 Services

**Responsabilidade:** Integrações externas e lógica reutilizável.

```javascript
// services/emailService.js
async function enviarEmail(para, assunto, html) {
  const transporter = nodemailer.createTransport({...});
  await transporter.sendMail({ to: para, subject: assunto, html });
}
```

### 6.5 Utils

**Responsabilidade:** Funções utilitárias.

```javascript
// utils/generateUniqueId.js
function generateUniqueId(length = 8) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}
```

---

## 7. Banco de Dados

### 7.1 Conexão com Knex

```javascript
// database/connection.js
const knex = require("knex");
const configuration = require("../../knexfile");

const connection = knex(configuration[process.env.NODE_ENV || "development"]);

module.exports = connection;
```

### 7.2 Configuração Knex

```javascript
// knexfile.js
module.exports = {
  development: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    pool: { min: 2, max: 10 },
  },
  production: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 },
  },
};
```

### 7.3 Principais Tabelas

| Tabela                 | Descrição                       |
| ---------------------- | ------------------------------- |
| `usuarios`             | Usuários do sistema             |
| `papeis`               | Papéis (ADMIN, PORTEIRO, etc.)  |
| `permissoes`           | Permissões granulares           |
| `usuarios_papeis`      | Relação N:N usuário-papel       |
| `papeis_permissoes`    | Relação N:N papel-permissão     |
| `cadastro_visitante`   | Cadastro de visitantes          |
| `visitantes_presentes` | Visitantes atualmente presentes |
| `visitante_historico`  | Histórico de entradas/saídas    |

---

## 8. WebSocket (Socket.IO)

### 8.1 Configuração

```javascript
// socket.js
const { Server } = require("socket.io");

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);
    socket.join("global");

    socket.on("disconnect", () => {
      console.log("Cliente desconectado:", socket.id);
    });
  });

  return io;
}

function getIo() {
  return io;
}

module.exports = { initSocket, getIo };
```

### 8.2 Emitindo Eventos

```javascript
// Nos controllers
const { getIo } = require("../socket");

// Notificar entrada de visitante
const io = getIo();
io.to("global").emit("visitante:entrada", { visitante });

// Notificar estatísticas
io.to("global").emit("request:stats", { total, errors });
```

### 8.3 Eventos Disponíveis

| Evento              | Descrição                   |
| ------------------- | --------------------------- |
| `visitante:entrada` | Novo visitante entrou       |
| `visitante:saida`   | Visitante saiu              |
| `request:stats`     | Estatísticas de requisições |
| `request:error`     | Erro em requisição          |
| `chat:mensagem`     | Nova mensagem no chat       |

---

## 📚 Documentos Relacionados

- [GUIA_CRIAR_FUNCAO_RBAC.md](GUIA_CRIAR_FUNCAO_RBAC.md) - Como criar nova função com RBAC
- [COMO_FUNCIONA_AMBIENTES.md](COMO_FUNCIONA_AMBIENTES.md) - Configuração de ambientes
- [DEPLOY_PRODUCAO_GUIA.md](DEPLOY_PRODUCAO_GUIA.md) - Deploy automatizado
- [GUIA_DASHBOARD_PRODUCAO.md](GUIA_DASHBOARD_PRODUCAO.md) - Monitoramento
