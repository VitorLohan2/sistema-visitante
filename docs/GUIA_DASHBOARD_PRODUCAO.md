# 📊 Guia de Monitoramento do Dashboard

## Visão Geral

O Dashboard do Sistema de Visitantes agora inclui um sistema robusto de monitoramento de requisições e segurança extra com senha de acesso.

---

## 🔐 Sistema de Autenticação do Dashboard

### Como Funciona

1. **Ao acessar o Dashboard**, será exibida uma tela de login solicitando senha
2. **Após autenticação**, um token JWT é gerado válido por **8 horas**
3. **O token é armazenado** no localStorage do navegador
4. **Sessão persistente**: Ao recarregar a página, o token é verificado automaticamente

### Configuração da Senha (PRODUÇÃO)

#### Passo 1: Gerar a senha e hash

**Opção A - Via API (apenas em desenvolvimento):**

```bash
curl http://localhost:3001/api/dashboard/generate-password
```

**Opção B - Via Node.js:**

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

#### Passo 2: Configurar variáveis de ambiente

Adicione ao seu `.env` de produção:

```env
# Senha do Dashboard (hash bcrypt)
DASHBOARD_PASSWORD_HASH=$2a$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Chave secreta para tokens JWT do Dashboard (gere uma chave única!)
DASHBOARD_JWT_SECRET=sua_chave_secreta_muito_longa_e_aleatoria_aqui
```

#### Passo 3: Guardar a senha em local seguro

⚠️ **IMPORTANTE**: A senha gerada NÃO fica armazenada em nenhum lugar. Guarde-a em um gerenciador de senhas seguro (1Password, Bitwarden, etc.)

---

## 📈 Monitoramento de Requisições

### Dados Coletados

O sistema monitora automaticamente:

| Dado                        | Descrição                                 |
| --------------------------- | ----------------------------------------- |
| **Total de Requisições**    | Contador geral desde o início do servidor |
| **Requisições por Método**  | GET, POST, PUT, DELETE, PATCH             |
| **Requisições por Hora**    | Distribuição ao longo do dia              |
| **Requisições por IP**      | Identificação de cada cliente             |
| **Requisições por Usuário** | Rastreamento de usuários autenticados     |
| **Taxa de Erros**           | Percentual de erros 4xx/5xx               |
| **Endpoints com Erros**     | Lista dos endpoints com mais falhas       |

### Dados de IP Coletados

- **Endereço IP** do cliente (considera headers de proxy como `x-forwarded-for`)
- **Quantidade de requisições** por IP
- **Última requisição** feita
- **Principal endpoint** acessado por aquele IP

### Dados de Usuário Coletados

- **ID do usuário** (extraído do token JWT)
- **Nome do usuário** (se disponível no token)
- **Quantidade de requisições**
- **Quantidade de IPs diferentes** usados (útil para detectar compartilhamento de conta)

---

## 🔄 Persistência dos Dados

### ⚠️ IMPORTANTE: Dados em Memória

Os dados de monitoramento são armazenados **em memória RAM** do servidor Node.js.

**Isso significa que:**

✅ **Os dados PERMANECEM** enquanto o servidor estiver rodando
✅ **Os dados são atualizados** em tempo real via Socket.IO
✅ **Ao sair da página Dashboard**, os dados continuam sendo coletados no backend

❌ **Os dados são PERDIDOS** quando:

- O servidor é reiniciado
- O container Docker é recriado
- Ocorre um deploy com reinício

### Como manter dados após reinício?

Para persistência em produção, você pode implementar:

1. **Salvar em Redis** (recomendado para dados temporários)
2. **Salvar em PostgreSQL** (para histórico completo)
3. **Exportar para arquivo** antes de reiniciar

---

## 🖥️ Componentes do Dashboard

### 1. Estatísticas Gerais

- Total de requisições
- Quantidade de erros
- Taxa de erro percentual
- Média de requisições por minuto
- Uptime do servidor

### 2. Gráfico de Métodos HTTP

Mostra a distribuição visual de requisições por método (GET, POST, PUT, DELETE).

### 3. Top Endpoints

Lista os 10 endpoints mais acessados com:

- Badge colorido do método HTTP
- Path do endpoint
- Contador de acessos

### 4. Endpoints com Erros

Lista endpoints que retornaram erro com:

- Método HTTP
- Path do endpoint
- Status do último erro
- Timestamp da última ocorrência
- Contador de erros

### 5. Top IPs (NOVO!)

Lista os 10 IPs mais ativos com:

- Ranking
- Endereço IP
- Endpoint mais acessado
- Contador de requisições
- Horário da última requisição

### 6. Top Usuários (NOVO!)

Lista os 10 usuários mais ativos com:

- Ranking
- Nome do usuário
- ID do usuário
- Contador de requisições
- Quantidade de IPs diferentes usados

### 7. Indicador de Consumo

Barra visual mostrando nível de consumo:

- 🟢 **Baixo**: 0-20 req/min
- 🟡 **Médio**: 20-50 req/min
- 🔴 **Alto**: 50+ req/min

---

## ⚙️ Configuração de Ambiente

### Variáveis de Ambiente Necessárias

```env
# Ativar contagem de requisições
COUNT_REQUESTS=true

# Ativar logs detalhados de requisições (opcional)
LOG_REQUESTS=false

# Chave de admin para API de estatísticas (produção)
ADMIN_STATS_KEY=sua_chave_segura_aqui

# Senha do Dashboard (hash bcrypt)
DASHBOARD_PASSWORD_HASH=$2a$12$xxxxx

# Chave JWT do Dashboard
DASHBOARD_JWT_SECRET=chave_secreta_longa_aqui
```

### Requisições Ignoradas

O sistema NÃO conta as seguintes requisições:

- `/socket.io/*` - Polling do Socket.IO
- `/uploads/*` - Arquivos estáticos
- `/static/*` - Assets
- `/api/stats` - Própria rota de estatísticas
- `/api/dashboard/auth` - Autenticação do dashboard
- `OPTIONS` - Preflight CORS

---

## 🔒 Segurança

### Proteções Implementadas

1. **Senha do Dashboard**: Acesso requer autenticação específica
2. **Token JWT**: Sessão expira em 8 horas
3. **Bloqueio após 5 tentativas**: Previne força bruta
4. **Hash bcrypt**: Senha armazenada com salt round 12
5. **Chave admin separada**: API de stats protegida

### Recomendações para Produção

1. **Use HTTPS** para todas as conexões
2. **Rotacione a senha** periodicamente
3. **Monitore logs** de tentativas de acesso
4. **Configure firewall** para limitar IPs de acesso ao admin
5. **Não compartilhe** a senha do Dashboard

---

## 📝 API de Estatísticas

### Endpoints Disponíveis

| Método | Endpoint                           | Descrição                             |
| ------ | ---------------------------------- | ------------------------------------- |
| GET    | `/api/stats`                       | Estatísticas básicas                  |
| GET    | `/api/stats?details=true`          | Estatísticas com requisições recentes |
| POST   | `/api/dashboard/auth`              | Autenticação do Dashboard             |
| GET    | `/api/dashboard/verify`            | Verificar token                       |
| GET    | `/api/dashboard/generate-password` | Gerar nova senha (só dev)             |

### Exemplo de Resposta `/api/stats`

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
    { "endpoint": "/visitantes", "method": "GET", "count": 450 },
    { "endpoint": "/historico", "method": "GET", "count": 320 }
  ],
  "topIPs": [
    {
      "ip": "192.168.1.100",
      "count": 500,
      "lastRequest": "2024-01-15T10:30:00Z"
    }
  ],
  "topUsers": [
    {
      "userId": "abc123",
      "userName": "João Silva",
      "count": 250,
      "ipsCount": 1
    }
  ],
  "consumptionLevel": "baixo",
  "uniqueIPs": 15,
  "uniqueUsers": 8
}
```

---

## 🚀 Checklist de Deploy

- [ ] `COUNT_REQUESTS=true` configurado
- [ ] `DASHBOARD_PASSWORD_HASH` configurado
- [ ] `DASHBOARD_JWT_SECRET` configurado (chave única!)
- [ ] `ADMIN_STATS_KEY` configurado
- [ ] Senha guardada em local seguro
- [ ] HTTPS habilitado
- [ ] Testado login no Dashboard
- [ ] Monitoramento aparecendo dados corretos
