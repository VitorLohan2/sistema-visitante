# Control iD Integration Service

Microserviço REST independente para integração com equipamentos Control iD - Controle de Acesso.

## 📋 Índice

- [Sobre](#sobre)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Endpoints](#endpoints)
- [Modelos Suportados](#modelos-suportados)
- [Exemplos de Uso](#exemplos-de-uso)
- [Docker](#docker)

## 📖 Sobre

Este microserviço atua como **camada de abstração** entre o sistema principal e os equipamentos Control iD. Ele:

- ✅ **Não contém regras de negócio** - apenas comandos técnicos de integração
- ✅ **Suporta múltiplos equipamentos** Control iD
- ✅ **Trabalha com equipamentos em modo Autônomo (Standalone)**
- ✅ **É stateless** - comunicação via HTTP REST
- ✅ **Possui deploy via Docker**

### Referências Oficiais

- 📚 [Documentação Access API](https://www.controlid.com.br/docs/access-api-pt/)
- 💻 [Exemplos de Código](https://github.com/controlid/integracao/tree/master/Controle%20de%20Acesso)
- 📬 [Postman Collection](https://documenter.getpostman.com/view/10800185/SztHW4xo)

## 🏗 Arquitetura

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│                 │     │                      │     │                 │
│  Backend        │────▶│  ControlID Service   │────▶│  Equipamentos   │
│  Principal      │     │  (Este Microserviço) │     │  Control iD     │
│                 │     │                      │     │                 │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                               │
                               │ SQLite (opcional)
                               ▼
                        ┌──────────────────┐
                        │  Cache/Logs/     │
                        │  Status          │
                        └──────────────────┘
```

### Regras Importantes

- 🔒 **RBAC e permissões** NÃO pertencem a este microserviço
- 🚫 O microserviço **NÃO acessa** o banco de dados do sistema principal
- 💾 Possui banco próprio (SQLite) apenas para: cache, status, logs técnicos

## 🚀 Instalação

### Pré-requisitos

- Node.js >= 18.0.0
- npm ou yarn

### Instalação Local

```bash
# Clonar/acessar o diretório
cd controlid-service

# Instalar dependências
npm install

# Copiar arquivo de configuração
cp .env.example .env

# Editar configurações
# nano .env

# Iniciar em desenvolvimento
npm run dev

# Iniciar em produção
npm start
```

## ⚙️ Configuração

Edite o arquivo `.env`:

```env
# Ambiente
NODE_ENV=development

# Servidor
PORT=3050
HOST=0.0.0.0

# API Key (OBRIGATÓRIA - para autenticação do backend principal)
API_KEY=sua-chave-secreta-aqui

# Banco de dados SQLite
DATABASE_PATH=./data/controlid.db

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/controlid-service.log

# Comunicação com equipamentos
DEVICE_TIMEOUT=10000
STATUS_CHECK_INTERVAL=60000
MAX_RETRIES=3
RETRY_DELAY=1000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📡 Endpoints

### Autenticação

Todas as rotas `/api/*` requerem header `x-api-key`:

```bash
curl -H "x-api-key: sua-api-key" http://localhost:3050/api/devices
```

### Health Check

| Método | Endpoint  | Descrição         |
| ------ | --------- | ----------------- |
| GET    | `/health` | Status do serviço |
| GET    | `/`       | Informações       |

### Dispositivos

| Método | Endpoint                         | Descrição              |
| ------ | -------------------------------- | ---------------------- |
| GET    | `/api/devices`                   | Listar dispositivos    |
| POST   | `/api/devices`                   | Cadastrar dispositivo  |
| GET    | `/api/devices/:id`               | Buscar dispositivo     |
| PUT    | `/api/devices/:id`               | Atualizar dispositivo  |
| DELETE | `/api/devices/:id`               | Remover dispositivo    |
| POST   | `/api/devices/:id/check-status`  | Verificar status       |
| GET    | `/api/devices/:id/system-info`   | Informações do sistema |
| GET    | `/api/devices/:id/configuration` | Configurações          |
| GET    | `/api/devices/:id/doors-state`   | Estado das portas      |
| GET    | `/api/devices/models`            | Modelos suportados     |
| GET    | `/api/devices/status-summary`    | Resumo de status       |

### Usuários no Dispositivo

| Método | Endpoint                                            | Descrição            |
| ------ | --------------------------------------------------- | -------------------- |
| GET    | `/api/devices/:id/users`                            | Listar usuários      |
| POST   | `/api/devices/:id/users`                            | Criar usuário        |
| GET    | `/api/devices/:id/users/:userId`                    | Buscar usuário       |
| GET    | `/api/devices/:id/users/registration/:registration` | Buscar por matrícula |
| PUT    | `/api/devices/:id/users/:userId`                    | Atualizar usuário    |
| DELETE | `/api/devices/:id/users/:userId`                    | Deletar usuário      |

### Credenciais (Cartões, Tags UHF, QR Codes)

| Método | Endpoint                           | Descrição       |
| ------ | ---------------------------------- | --------------- |
| GET    | `/api/devices/:id/cards`           | Listar cartões  |
| POST   | `/api/devices/:id/cards`           | Criar cartão    |
| DELETE | `/api/devices/:id/cards/:cardId`   | Deletar cartão  |
| GET    | `/api/devices/:id/uhf-tags`        | Listar tags UHF |
| POST   | `/api/devices/:id/uhf-tags`        | Criar tag UHF   |
| DELETE | `/api/devices/:id/uhf-tags/:tagId` | Deletar tag UHF |
| GET    | `/api/devices/:id/qr-codes`        | Listar QR Codes |
| POST   | `/api/devices/:id/qr-codes`        | Criar QR Code   |
| DELETE | `/api/devices/:id/qr-codes/:qrId`  | Deletar QR Code |

### Grupos e Regras de Acesso

| Método | Endpoint                                                | Descrição                  |
| ------ | ------------------------------------------------------- | -------------------------- |
| GET    | `/api/devices/:id/groups`                               | Listar grupos              |
| POST   | `/api/devices/:id/groups`                               | Criar grupo                |
| POST   | `/api/devices/:id/groups/:groupId/users/:userId`        | Adicionar usuário ao grupo |
| DELETE | `/api/devices/:id/groups/:groupId/users/:userId`        | Remover usuário do grupo   |
| GET    | `/api/devices/:id/access-rules`                         | Listar regras de acesso    |
| POST   | `/api/devices/:id/access-rules`                         | Criar regra de acesso      |
| POST   | `/api/devices/:id/access-rules/:ruleId/groups/:groupId` | Vincular grupo à regra     |

### Horários e Feriados

| Método | Endpoint                                       | Descrição         |
| ------ | ---------------------------------------------- | ----------------- |
| GET    | `/api/devices/:id/time-zones`                  | Listar horários   |
| POST   | `/api/devices/:id/time-zones`                  | Criar horário     |
| GET    | `/api/devices/:id/time-zones/:tzId/time-spans` | Listar intervalos |
| POST   | `/api/devices/:id/time-zones/:tzId/time-spans` | Criar intervalo   |
| GET    | `/api/devices/:id/holidays`                    | Listar feriados   |
| POST   | `/api/devices/:id/holidays`                    | Criar feriado     |

### Logs de Acesso

| Método | Endpoint                       | Descrição       |
| ------ | ------------------------------ | --------------- |
| GET    | `/api/devices/:id/access-logs` | Logs de acesso  |
| GET    | `/api/devices/:id/alarm-logs`  | Logs de alarme  |
| GET    | `/api/devices/:id/alarm-zones` | Zonas de alarme |

### Ações de Controle

| Método | Endpoint                                     | Descrição            |
| ------ | -------------------------------------------- | -------------------- |
| POST   | `/api/devices/:id/actions/open-door`         | Abrir porta/relé     |
| POST   | `/api/devices/:id/actions/open-sec-box`      | Abrir via SecBox     |
| POST   | `/api/devices/:id/actions/release-turnstile` | Liberar catraca      |
| POST   | `/api/devices/:id/actions/execute`           | Ações personalizadas |
| GET    | `/api/devices/:id/actions/doors-state`       | Estado das portas    |

### Logs do Sistema

| Método | Endpoint                     | Descrição            |
| ------ | ---------------------------- | -------------------- |
| GET    | `/api/logs`                  | Logs recentes        |
| GET    | `/api/logs/errors`           | Logs de erro         |
| GET    | `/api/logs/stats`            | Estatísticas         |
| GET    | `/api/logs/device/:deviceId` | Logs por dispositivo |
| DELETE | `/api/logs/cleanup`          | Limpar logs antigos  |

## 📱 Modelos Suportados

| Modelo        | Identificador   |
| ------------- | --------------- |
| iDUHF         | `iDUHF`         |
| iDFace        | `iDFace`        |
| iDFace Max    | `iDFace Max`    |
| iDBlock       | `iDBlock`       |
| iDBlock Next  | `iDBlock Next`  |
| iDFlex        | `iDFlex`        |
| iDAccess      | `iDAccess`      |
| iDAccess Pro  | `iDAccess Pro`  |
| iDAccess Nano | `iDAccess Nano` |
| iDBox         | `iDBox`         |
| iDFit         | `iDFit`         |

## 💡 Exemplos de Uso

### Cadastrar Dispositivo

```bash
curl -X POST http://localhost:3050/api/devices \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-api-key" \
  -d '{
    "name": "Entrada Principal",
    "ip": "192.168.1.100",
    "port": 80,
    "login": "admin",
    "password": "admin",
    "model": "iDUHF",
    "description": "Leitor UHF da entrada principal"
  }'
```

### Criar Usuário no Dispositivo

```bash
curl -X POST http://localhost:3050/api/devices/{deviceId}/users \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-api-key" \
  -d '{
    "registration": "12345",
    "name": "João Silva",
    "user_type_id": 0
  }'
```

### Vincular Tag UHF ao Usuário

```bash
curl -X POST http://localhost:3050/api/devices/{deviceId}/uhf-tags \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-api-key" \
  -d '{
    "user_id": 1,
    "value": "E2003412010080190000050B"
  }'
```

### Abrir Porta

```bash
curl -X POST http://localhost:3050/api/devices/{deviceId}/actions/open-door \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-api-key" \
  -d '{
    "door_id": 1
  }'
```

### Liberar Catraca

```bash
curl -X POST http://localhost:3050/api/devices/{deviceId}/actions/release-turnstile \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-api-key" \
  -d '{
    "direction": "clockwise"
  }'
```

### Buscar Logs de Acesso

```bash
curl "http://localhost:3050/api/devices/{deviceId}/access-logs?start_time=1700000000&end_time=1700100000&limit=100" \
  -H "x-api-key: sua-api-key"
```

## 🐳 Docker

### Build e Execução

```bash
# Build da imagem
docker build -t controlid-service .

# Executar container
docker run -d \
  --name controlid-service \
  -p 3050:3050 \
  -e API_KEY=sua-api-key-segura \
  -v controlid-data:/app/data \
  -v controlid-logs:/app/logs \
  controlid-service
```

### Docker Compose

```bash
# Criar rede (se necessário)
docker network create sistema-visitante-network

# Subir serviço
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

## 🔒 Segurança

- Todas as rotas `/api/*` são protegidas por **API Key**
- O serviço deve ser acessado **apenas pelo backend principal**
- **Frontend e Mobile NUNCA devem acessar este serviço diretamente**
- Use HTTPS em produção (via proxy reverso como Nginx)

## 📊 Monitoramento

O serviço possui monitoramento automático de dispositivos:

- Verificação periódica de status (configurável via `STATUS_CHECK_INTERVAL`)
- Histórico de status dos equipamentos
- Logs de todas as operações
- Estatísticas de sucesso/erro

### Endpoints de Monitoramento

```bash
# Health check
curl http://localhost:3050/health

# Resumo de status dos dispositivos
curl -H "x-api-key: sua-api-key" http://localhost:3050/api/devices/status-summary

# Estatísticas de operações
curl -H "x-api-key: sua-api-key" http://localhost:3050/api/logs/stats
```

## 📝 Licença

MIT

## 🤝 Suporte

- Documentação Control iD: https://www.controlid.com.br/docs/access-api-pt/
- Integração Control iD: integracao@controlid.com.br
