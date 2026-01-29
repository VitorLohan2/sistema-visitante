# 📊 Dashboard de Monitoramento - Produção

> **Última atualização:** Janeiro 2026

Este documento explica o sistema de monitoramento do Dashboard, incluindo autenticação, métricas coletadas e configuração.

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Autenticação do Dashboard](#2-autenticação-do-dashboard)
3. [Métricas Coletadas](#3-métricas-coletadas)
4. [Componentes do Dashboard](#4-componentes-do-dashboard)
5. [API de Estatísticas](#5-api-de-estatísticas)
6. [Configuração](#6-configuração)
7. [Segurança](#7-segurança)

---

## 1. Visão Geral

O Dashboard do Sistema de Visitantes inclui um sistema robusto de **monitoramento de requisições** em tempo real via Socket.IO, com proteção por senha.

### Funcionalidades:

- ✅ Monitoramento de requisições em tempo real
- ✅ Autenticação com senha + JWT
- ✅ Estatísticas por método HTTP
- ✅ Top endpoints mais acessados
- ✅ Rastreamento por IP e usuário
- ✅ Taxa de erros e endpoints problemáticos

---

## 2. Autenticação do Dashboard

### 2.1 Como Funciona:

1. Ao acessar o Dashboard, será exibida uma tela de login
2. Após autenticação, um **token JWT** é gerado (válido por 8 horas)
3. Token armazenado no localStorage do navegador
4. Sessão persistente ao recarregar a página

### 2.2 Gerar Senha e Hash (Produção)

**Via Node.js:**

```javascript
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// Gerar senha aleatória segura
const charset =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
let password = "";
const randomBytes = crypto.randomBytes(20);
for (let i = 0; i < 20; i++) {
  password += charset[randomBytes[i] % charset.length];
}

// Gerar hash
const hash = bcrypt.hashSync(password, 12);

console.log("Senha:", password);
console.log("Hash:", hash);
```

### 2.3 Configurar Variáveis de Ambiente

Adicione ao `.env.producao`:

```env
# Senha do Dashboard (hash bcrypt)
DASHBOARD_PASSWORD_HASH=$2b$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Chave secreta para tokens JWT do Dashboard
DASHBOARD_JWT_SECRET=sua_chave_secreta_muito_longa_e_aleatoria_aqui
```

> ⚠️ **IMPORTANTE**: Guarde a senha em local seguro! Ela não é recuperável.

---

## 3. Métricas Coletadas

### 3.1 Dados Monitorados

| Dado                        | Descrição                             |
| --------------------------- | ------------------------------------- |
| **Total de Requisições**    | Contador desde início do servidor     |
| **Requisições por Método**  | GET, POST, PUT, DELETE, PATCH         |
| **Requisições por Hora**    | Distribuição ao longo do dia          |
| **Requisições por IP**      | Identificação de cada cliente         |
| **Requisições por Usuário** | Rastreamento de usuários autenticados |
| **Taxa de Erros**           | Percentual de erros 4xx/5xx           |
| **Endpoints com Erros**     | Lista dos endpoints com mais falhas   |

### 3.2 Dados de IP

- Endereço IP do cliente (considera `x-forwarded-for`)
- Quantidade de requisições por IP
- Última requisição feita
- Principal endpoint acessado

### 3.3 Dados de Usuário

- ID do usuário (do token JWT)
- Nome do usuário
- Quantidade de requisições
- Quantidade de IPs diferentes usados

### 3.4 Requisições Ignoradas

O sistema **NÃO conta**:

- `/socket.io/*` - Polling do Socket.IO
- `/uploads/*` - Arquivos estáticos
- `/static/*` - Assets
- `/api/stats` - Própria rota de estatísticas
- `/api/dashboard/auth` - Autenticação do dashboard
- `OPTIONS` - Preflight CORS

---

## 4. Componentes do Dashboard

### 4.1 Estatísticas Gerais

- Total de requisições
- Quantidade de erros
- Taxa de erro percentual
- Média de requisições por minuto
- Uptime do servidor

### 4.2 Gráfico de Métodos HTTP

Distribuição visual por método (GET, POST, PUT, DELETE).

### 4.3 Top Endpoints

Lista os 10 endpoints mais acessados:

- Badge colorido do método HTTP
- Path do endpoint
- Contador de acessos

### 4.4 Endpoints com Erros

Lista endpoints que retornaram erro:

- Método HTTP
- Path do endpoint
- Status do último erro
- Timestamp da última ocorrência

### 4.5 Top IPs

Lista os 10 IPs mais ativos:

- Endereço IP
- Endpoint mais acessado
- Contador de requisições

### 4.6 Top Usuários

Lista os 10 usuários mais ativos:

- Nome e ID do usuário
- Contador de requisições
- Quantidade de IPs diferentes

### 4.7 Indicador de Consumo

| Nível    | Cor      | Requisições/min |
| -------- | -------- | --------------- |
| 🟢 Baixo | Verde    | 0-20            |
| 🟡 Médio | Amarelo  | 20-50           |
| 🔴 Alto  | Vermelho | 50+             |

---

## 5. API de Estatísticas

### 5.1 Endpoints Disponíveis

| Método | Endpoint                  | Descrição               |
| ------ | ------------------------- | ----------------------- |
| GET    | `/api/stats`              | Estatísticas básicas    |
| GET    | `/api/stats?details=true` | Estatísticas detalhadas |
| POST   | `/api/dashboard/auth`     | Autenticação            |
| GET    | `/api/dashboard/verify`   | Verificar token         |

### 5.2 Exemplo de Resposta

```json
{
  "total": 1523,
  "errors": 45,
  "errorRate": "2.95%",
  "avgPerMinute": 12.5,
  "uptime": "2h 15m",
  "uptimeSeconds": 8100,
  "byMethod": {
    "GET": 1200,
    "POST": 280,
    "PUT": 35,
    "DELETE": 8
  },
  "topEndpoints": [
    { "endpoint": "/visitantes", "method": "GET", "count": 450 }
  ],
  "topIPs": [{ "ip": "192.168.1.100", "count": 500 }],
  "topUsers": [{ "userId": "abc123", "userName": "João", "count": 250 }],
  "consumptionLevel": "baixo"
}
```

---

## 6. Configuração

### 6.1 Variáveis de Ambiente

```env
# Ativar contagem de requisições
COUNT_REQUESTS=true

# Ativar logs detalhados (opcional)
LOG_REQUESTS=false

# Chave de admin para API de estatísticas
ADMIN_STATS_KEY=sua_chave_segura_aqui

# Senha do Dashboard (hash bcrypt)
DASHBOARD_PASSWORD_HASH=$2b$12$xxxxx

# Chave JWT do Dashboard
DASHBOARD_JWT_SECRET=chave_secreta_longa_aqui
```

### 6.2 Acessar o Dashboard

1. Faça login no sistema
2. Navegue até o Dashboard
3. Role até **Monitoramento de Requisições**
4. Dados atualizam em tempo real via Socket.IO

---

## 7. Segurança

### 7.1 Proteções Implementadas

| Proteção                   | Descrição                             |
| -------------------------- | ------------------------------------- |
| Senha do Dashboard         | Acesso requer autenticação específica |
| Token JWT                  | Sessão expira em 8 horas              |
| Bloqueio após 5 tentativas | Previne força bruta                   |
| Hash bcrypt                | Senha com salt round 12               |
| Chave admin separada       | API de stats protegida                |

### 7.2 Recomendações para Produção

1. **Use HTTPS** para todas as conexões
2. **Rotacione a senha** periodicamente
3. **Monitore logs** de tentativas de acesso
4. **Configure firewall** para limitar IPs
5. **Não compartilhe** a senha do Dashboard

### 7.3 Persistência dos Dados

> ⚠️ **ATENÇÃO**: Dados são armazenados em **memória RAM**.

**Os dados PERMANECEM** enquanto o servidor estiver rodando.

**Os dados são PERDIDOS** quando:

- O servidor é reiniciado
- O container Docker é recriado
- Ocorre um deploy com reinício

---

## 📋 Checklist de Deploy

- [ ] `COUNT_REQUESTS=true` configurado
- [ ] `DASHBOARD_PASSWORD_HASH` configurado
- [ ] `DASHBOARD_JWT_SECRET` configurado (chave única!)
- [ ] `ADMIN_STATS_KEY` configurado
- [ ] Senha guardada em local seguro
- [ ] HTTPS habilitado
- [ ] Testado login no Dashboard

---

## 📚 Documentos Relacionados

- [COMO_FUNCIONA_AMBIENTES.md](COMO_FUNCIONA_AMBIENTES.md) - Configuração de ambientes
- [BACKEND_ARQUITETURA.md](BACKEND_ARQUITETURA.md) - Arquitetura do sistema
- [DEPLOY_PRODUCAO_GUIA.md](DEPLOY_PRODUCAO_GUIA.md) - Deploy automatizado
