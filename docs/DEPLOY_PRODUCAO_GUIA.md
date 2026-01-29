# 🚀 Guia de Deploy para Produção

> **Última atualização:** Janeiro 2026 | **Versão:** 2.0

Este guia documenta o processo de deploy do Backend para produção, utilizando **GitHub Actions** para automação completa.

---

## 📋 Índice

1. [Visão Geral do Fluxo](#1-visão-geral-do-fluxo)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Deploy Automático (Recomendado)](#3-deploy-automático-recomendado)
4. [Versionamento Semântico](#4-versionamento-semântico)
5. [Deploy Manual (Emergência)](#5-deploy-manual-emergência)
6. [Estrutura da VM de Produção](#6-estrutura-da-vm-de-produção)
7. [Migração de Banco de Dados](#7-migração-de-banco-de-dados)
8. [Verificação e Monitoramento](#8-verificação-e-monitoramento)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Visão Geral do Fluxo

### 🔄 Fluxo Automatizado

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE DEPLOY AUTOMÁTICO                        │
└─────────────────────────────────────────────────────────────────────────────┘

  Developer                GitHub Actions                    VM Produção
     │                          │                                │
     │  git push origin main    │                                │
     ├─────────────────────────>│                                │
     │                          │                                │
     │                    ┌─────┴─────┐                          │
     │                    │ auto-tag  │                          │
     │                    │ v2.0.5    │  Cria tag semântica      │
     │                    └─────┬─────┘                          │
     │                          │                                │
     │                    ┌─────┴─────┐                          │
     │                    │  build &  │                          │
     │                    │   push    │──> Docker Hub            │
     │                    └─────┬─────┘    (vitorlohan/liberae)  │
     │                          │                                │
     │                    ┌─────┴─────┐   Self-Hosted Runner     │
     │                    │  deploy   │─────────────────────────>│
     │                    │   prod    │  • Atualiza .env         │
     │                    └─────┬─────┘  • docker compose up     │
     │                          │                                │
     │                    ┌─────┴─────┐                          │
     │                    │  health   │<─────────────────────────│
     │                    │  check    │   ✅ Backend OK          │
     │                    └───────────┘                          │
```

### O que acontece automaticamente:

1. **Auto-tag**: Analisa commits e gera versão semântica (v2.0.5, v2.1.0, etc.)
2. **Build**: Constrói imagem Docker do backend
3. **Push**: Envia imagem para Docker Hub
4. **Deploy**: Atualiza containers na VM de produção
5. **Health Check**: Verifica se aplicação está respondendo

---

## 2. Pré-requisitos

### 2.1 GitHub Secrets Configurados

Acesse: **Settings > Secrets and variables > Actions**

| Secret            | Descrição                     |
| ----------------- | ----------------------------- |
| `DOCKER_USERNAME` | Usuário do Docker Hub         |
| `DOCKER_TOKEN`    | Token de acesso do Docker Hub |

### 2.2 Self-Hosted Runner na VM

O runner deve estar instalado e rodando na VM:

```bash
# Verificar status do runner na VM
cd /home/dev/actions-runner
./svc.sh status
```

### 2.3 Estrutura na VM

```
/home/dev/sistema/prod/
├── .env                      # DOCKER_USERNAME e IMAGE_TAG
├── docker-compose-prod.yml   # Configuração dos containers
├── nginx/
│   ├── nginx.conf
│   └── conf.d/
├── certs/                    # Certificados SSL
└── backup_neondb.sql         # Backup do banco (opcional)
```

---

## 3. Deploy Automático (Recomendado)

### 3.1 Fazer alterações e commit

```bash
cd c:\Users\vitor.lohan\documents\sistema-visitante

# Fazer alterações no código
git add .

# Commit com prefixo semântico
git commit -m "feat: nova funcionalidade de relatórios"
```

### 3.2 Push para main

```bash
git push origin main
```

**Pronto!** O GitHub Actions faz todo o resto automaticamente.

### 3.3 Acompanhar o deploy

1. Acesse a aba **Actions** no GitHub
2. Clique no workflow em execução
3. Acompanhe os jobs: `auto-tag` → `build-and-push` → `deploy-prod`

---

## 4. Versionamento Semântico

O sistema analisa os prefixos dos commits para determinar o tipo de versão.

### 4.1 Tabela de Prefixos

| Prefixo                           | Versão    | Exemplo                 | Resultado       |
| --------------------------------- | --------- | ----------------------- | --------------- |
| `major:` ou `BREAKING CHANGE`     | **Major** | `major: nova API`       | v2.0.0 → v3.0.0 |
| `feat:`                           | **Minor** | `feat: chat de suporte` | v2.0.0 → v2.1.0 |
| `fix:`, `docs:`, `chore:`, outros | **Patch** | `fix: bug no login`     | v2.0.0 → v2.0.1 |

### 4.2 Exemplos de Commits

```bash
# ═══════════════════════════════════════════════════════════════════
# PATCH (0.0.X) - Correções e ajustes
# ═══════════════════════════════════════════════════════════════════
git commit -m "fix: corrigido bug no cronômetro"
git commit -m "docs: atualizado README"
git commit -m "chore: atualizado dependências"
git commit -m "style: formatação do código"
git commit -m "refactor: reorganizado estrutura"

# ═══════════════════════════════════════════════════════════════════
# MINOR (0.X.0) - Novas funcionalidades
# ═══════════════════════════════════════════════════════════════════
git commit -m "feat: filtro de busca no histórico"
git commit -m "feat: sistema de notificações"
git commit -m "feat: página de relatórios"

# ═══════════════════════════════════════════════════════════════════
# MAJOR (X.0.0) - Mudanças que quebram compatibilidade
# ═══════════════════════════════════════════════════════════════════
git commit -m "major: nova estrutura de banco de dados"
git commit -m "BREAKING CHANGE: removido suporte legado"
```

### 4.3 Verificar tags existentes

```bash
git tag -l                    # Lista todas as tags
git describe --tags --abbrev=0  # Última tag
```

---

## 5. Deploy Manual (Emergência)

Use apenas se o deploy automático falhar.

### 5.1 Build local da imagem

```powershell
cd c:\Users\vitor.lohan\documents\sistema-visitante\backend

# Build com a versão desejada
docker build -t vitorlohan/liberae:v2.0.6 .

# Criar tag latest
docker tag vitorlohan/liberae:v2.0.6 vitorlohan/liberae:latest
```

### 5.2 Push para Docker Hub

```powershell
docker login
docker push vitorlohan/liberae:v2.0.6
docker push vitorlohan/liberae:latest
```

### 5.3 Deploy na VM

```bash
# Conectar via SSH
ssh dev@34.225.38.222

# Ir para pasta de produção
cd /home/dev/sistema/prod

# Atualizar .env com nova tag
echo "DOCKER_USERNAME=vitorlohan" > .env
echo "IMAGE_TAG=v2.0.6" >> .env

# Atualizar containers
docker compose -f docker-compose-prod.yml pull backend
docker compose -f docker-compose-prod.yml down
docker compose -f docker-compose-prod.yml up -d

# Verificar
docker ps
docker logs sistema_visitante_backend_prod --tail 50
```

---

## 6. Estrutura da VM de Produção

### 6.1 Arquivo `.env`

```env
DOCKER_USERNAME=vitorlohan
IMAGE_TAG=v2.0.5
```

> ⚠️ Este arquivo é **atualizado automaticamente** pelo GitHub Actions.

### 6.2 Arquivo `docker-compose-prod.yml`

```yaml
services:
  database:
    image: postgres:15
    container_name: sistema_visitante_db_prod
    environment:
      POSTGRES_DB: neondb_prod
      POSTGRES_USER: neondb_owner_prod
      POSTGRES_PASSWORD: npg_prod_senha
    ports:
      - "5786:5432"
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
    networks:
      - app-network-prod

  backend:
    image: "${DOCKER_USERNAME}/liberae:${IMAGE_TAG}"
    container_name: sistema_visitante_backend_prod
    expose:
      - "3707"
    environment:
      - NODE_ENV=production_local
      - DATABASE_URL=postgresql://user:pass@database:5432/neondb_prod
      - DB_HOST=database
      - PORT=3707
      # ... outras variáveis
    depends_on:
      - database
    networks:
      - app-network-prod

  nginx:
    image: nginx:alpine
    container_name: nginx_prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/letsencrypt
    depends_on:
      - backend
    networks:
      - app-network-prod
```

### 6.3 Containers Ativos

| Container                        | Porta Interna | Porta Externa | Descrição           |
| -------------------------------- | ------------- | ------------- | ------------------- |
| `sistema_visitante_db_prod`      | 5432          | 5786          | PostgreSQL          |
| `sistema_visitante_backend_prod` | 3707          | -             | Node.js (via Nginx) |
| `nginx_prod`                     | 80, 443       | 80, 443       | Proxy reverso + SSL |

---

## 7. Migração de Banco de Dados

### 7.1 Quando executar

- Alterações em tabelas (CREATE, ALTER, DROP)
- Novas permissões ou papéis
- Seeds de dados

### 7.2 Backup antes da migração

```bash
pg_dump -h 34.225.38.222 -p 5786 -U neondb_owner_prod -d neondb_prod > backup_$(date +%Y%m%d).sql
```

### 7.3 Executar migração

```powershell
# Windows
$env:PGPASSWORD='SUA_SENHA'
psql -h 34.225.38.222 -p 5786 -U neondb_owner_prod -d neondb_prod -f backend/sql/SCRIPT.sql
```

### 7.4 Scripts disponíveis

| Script                             | Descrição                  |
| ---------------------------------- | -------------------------- |
| `seed_papeis_permissoes.sql`       | Popula permissões e papéis |
| `seed_chat_suporte_permissoes.sql` | Permissões do chat         |
| `migration_v2.0.0_safe.sql`        | Migração completa v2.0     |

---

## 8. Verificação e Monitoramento

### 8.1 Checklist pós-deploy

- [ ] Containers rodando: `docker ps`
- [ ] Backend respondendo: `curl http://localhost:3707/health`
- [ ] Logs sem erros: `docker logs sistema_visitante_backend_prod --tail 50`
- [ ] Login funcionando no frontend
- [ ] WebSocket conectando

### 8.2 Verificar logs

```bash
# Últimas 50 linhas
docker logs sistema_visitante_backend_prod --tail 50

# Tempo real
docker logs -f sistema_visitante_backend_prod

# Apenas erros
docker logs sistema_visitante_backend_prod 2>&1 | grep -i error
```

### 8.3 Health check

```bash
curl http://localhost:3707/health
# Resposta esperada:
# {"status":"OK","timestamp":"2026-01-29T...","version":"2.0.5"}
```

---

## 9. Troubleshooting

### 9.1 Deploy automático não executou

**Verificar:**

1. Self-hosted runner está online? (Settings > Actions > Runners)
2. Push foi feito para branch `main`?
3. Workflow tem erros? (aba Actions)

### 9.2 Imagem não foi atualizada

```bash
# Forçar pull da nova imagem
docker compose -f docker-compose-prod.yml pull backend
docker compose -f docker-compose-prod.yml up -d --force-recreate backend
```

### 9.3 Container não inicia

```bash
# Ver logs detalhados
docker logs sistema_visitante_backend_prod

# Verificar variáveis de ambiente
docker exec sistema_visitante_backend_prod env | grep -E "DB_|NODE_"
```

### 9.4 Banco de dados não conecta

```bash
# Testar conexão do container
docker exec sistema_visitante_backend_prod nc -zv database 5432

# Verificar se database está rodando
docker ps | grep database
```

### 9.5 Rollback para versão anterior

```bash
# Editar .env com versão anterior
echo "IMAGE_TAG=v2.0.4" > /home/dev/sistema/prod/.env
echo "DOCKER_USERNAME=vitorlohan" >> /home/dev/sistema/prod/.env

# Recriar container
docker compose -f docker-compose-prod.yml up -d --force-recreate backend
```

---

## 📝 Resumo de Comandos

```bash
# ═══════════════════════════════════════════════════════════════════
# DEPLOY AUTOMÁTICO (normal)
# ═══════════════════════════════════════════════════════════════════
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
# ✅ GitHub Actions faz o resto!

# ═══════════════════════════════════════════════════════════════════
# VERIFICAÇÃO NA VM
# ═══════════════════════════════════════════════════════════════════
ssh dev@34.225.38.222
cd /home/dev/sistema/prod
docker ps
docker logs sistema_visitante_backend_prod --tail 50
cat .env

# ═══════════════════════════════════════════════════════════════════
# COMANDOS ÚTEIS
# ═══════════════════════════════════════════════════════════════════
docker compose -f docker-compose-prod.yml ps      # Status
docker compose -f docker-compose-prod.yml logs -f # Logs tempo real
docker compose -f docker-compose-prod.yml restart backend  # Reiniciar
docker image prune -f                             # Limpar imagens antigas
```

---

## 📚 Documentos Relacionados

- [COMO_FUNCIONA_AMBIENTES.md](COMO_FUNCIONA_AMBIENTES.md) - Configuração de ambientes
- [BACKEND_ARQUITETURA.md](BACKEND_ARQUITETURA.md) - Arquitetura do sistema
- [GUIA_DASHBOARD_PRODUCAO.md](GUIA_DASHBOARD_PRODUCAO.md) - Monitoramento
