# ═══════════════════════════════════════════════════════════════════════════════

# INSTRUÇÕES PARA ADICIONAR CONTROL iD NO DOCKER-COMPOSE-PROD.YML

# ═══════════════════════════════════════════════════════════════════════════════

## 1. Adicione este serviço APÓS o serviço backend:

```yaml
# ═══════════════════════════════════════════════════════════════════
# MICROSERVIÇO CONTROL iD - Integração com Equipamentos de Acesso
# ═══════════════════════════════════════════════════════════════════
controlid-service:
  image: "${DOCKER_USERNAME}/controlid-service:${CONTROLID_TAG:-latest}"
  container_name: controlid_service_prod
  hostname: controlid-service
  expose:
    - "3050"
  volumes:
    - controlid_data:/app/data
    - controlid_logs:/app/logs
  environment:
    - NODE_ENV=production
    - PORT=3050
    - HOST=0.0.0.0
    - API_KEY=${CONTROLID_API_KEY}
    - DATABASE_PATH=/app/data/controlid.db
    - LOG_LEVEL=info
    - LOG_FILE=/app/logs/controlid-service.log
    - DEVICE_TIMEOUT=10000
    - STATUS_CHECK_INTERVAL=60000
    - MAX_RETRIES=3
    - RETRY_DELAY=1000
    - RATE_LIMIT_WINDOW_MS=60000
    - RATE_LIMIT_MAX_REQUESTS=100
  restart: always
  networks:
    - app-network-prod
  healthcheck:
    test: ["CMD", "wget", "-q", "--spider", "http://127.0.0.1:3050/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 10s
```

## 2. Adicione estas variáveis NO SERVIÇO BACKEND (environment):

```yaml
# INTEGRAÇÃO CONTROL iD
- CONTROLID_SERVICE_URL=http://controlid-service:3050/api
- CONTROLID_SERVICE_API_KEY=${CONTROLID_API_KEY}
- CONTROLID_SERVICE_TIMEOUT=15000
```

## 3. Adicione estes volumes NA SEÇÃO volumes:

```yaml
volumes:
  postgres_data_prod:
  controlid_data:
  controlid_logs:
```

## 4. Crie um arquivo .env na pasta prod com:

```env
DOCKER_USERNAME=seu_usuario_docker
IMAGE_TAG=latest
CONTROLID_TAG=latest
CONTROLID_API_KEY=gere_uma_chave_com_node_crypto_randomBytes_32
```

## 5. Execute o SQL de permissões no banco:

```bash
psql -h localhost -p 5786 -U neondb_owner_prod -d neondb_prod -f seed_controlid_permissoes.sql
```
