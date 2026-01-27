# 🚀 Guia de Deploy para Produção

> **Documento criado em:** Janeiro de 2026  
> **Última atualização:** v2.0.1

Este guia documenta o processo completo de deploy do Sistema Visitante para produção, desde o merge de branches até a atualização dos containers.

---

## 📋 Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Merge de Branch para Main](#2-merge-de-branch-para-main)
3. [Versionamento com Tags](#3-versionamento-com-tags)
4. [Build da Imagem Docker](#4-build-da-imagem-docker)
5. [Push para Docker Hub](#5-push-para-docker-hub)
6. [Deploy na VM de Produção](#6-deploy-na-vm-de-produção)
7. [Migração do Banco de Dados](#7-migração-do-banco-de-dados)
8. [Deploy do Frontend no Vercel](#8-deploy-do-frontend-no-vercel)
9. [Verificação Final](#9-verificação-final)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Pré-requisitos

### 1.1 Ferramentas necessárias na máquina local

- **Git** instalado e configurado
- **Docker Desktop** instalado e **em execução**
- **Conta no Docker Hub** com login realizado
- **Acesso SSH** à VM de produção
- **psql** (cliente PostgreSQL) para migrações

### 1.2 Credenciais necessárias

| Item                       | Descrição                                               |
| -------------------------- | ------------------------------------------------------- |
| Docker Hub                 | `vitorlohan` (usuário)                                  |
| VM Produção                | SSH para `dev@34.225.38.222`                            |
| PostgreSQL Produção        | Host: `34.225.38.222`, Porta: `5786`, DB: `neondb_prod` |
| PostgreSQL Desenvolvimento | Host: `34.225.38.222`, Porta: `5432`, DB: `neondb`      |

### 1.3 Verificar Docker Desktop

Antes de começar, certifique-se que o Docker Desktop está em execução:

```powershell
# Verificar se Docker está rodando
docker info
```

Se não estiver rodando, abra o Docker Desktop e aguarde inicializar.

---

## 2. Merge de Branch para Main

### 2.1 Preparação

```bash
# Navegar para o diretório do projeto
cd c:\Users\vitor.lohan\documents\sistema-visitante

# Verificar status atual
git status

# Verificar branch atual
git branch
```

### 2.2 Atualizar branches

```bash
# Buscar atualizações do remoto
git fetch origin

# Mudar para a branch main
git checkout main

# Atualizar main com o remoto
git pull origin main
```

### 2.3 Realizar o merge

```bash
# Fazer merge da branch de desenvolvimento para main
# Substitua 'aplicativo' pelo nome da sua branch de feature
git merge aplicativo -m "Merge branch 'aplicativo' into main - versão X.X.X"

# Se houver conflitos, resolva-os e depois:
git add .
git commit -m "Resolve conflitos do merge"
```

### 2.4 Enviar para o repositório remoto

```bash
git push origin main
```

> ⚠️ **ATENÇÃO:** O push para `main` dispara automaticamente o GitHub Actions que cria uma nova tag de versão baseada no prefixo do commit (Conventional Commits).

---

## 3. Versionamento com Tags (Conventional Commits)

O projeto utiliza **Conventional Commits** para versionamento semântico automático. O GitHub Actions analisa os prefixos das mensagens de commit para determinar o tipo de versão.

### 3.1 Tabela de Prefixos de Commit

| Prefixo do Commit                                                   | Tipo de Versão | Incremento | Exemplo                              |
| ------------------------------------------------------------------- | -------------- | ---------- | ------------------------------------ |
| `major:` ou `BREAKING CHANGE`                                       | **Major**      | X.0.0      | `major: nova arquitetura do sistema` |
| `feat:`                                                             | **Minor**      | 0.X.0      | `feat: adicionado chat de suporte`   |
| `fix:`, `docs:`, `style:`, `refactor:`, `chore:`, ou qualquer outro | **Patch**      | 0.0.X      | `fix: corrigido bug no cronômetro`   |

### 3.2 Exemplos de Commits

```bash
# ══════════════════════════════════════════════════════════════════
# PATCH (0.0.X) - Correções de bugs, ajustes menores
# ══════════════════════════════════════════════════════════════════
git commit -m "fix: corrigido bug no cronômetro"
git commit -m "fix: ajustado layout do modal de confirmação"
git commit -m "docs: atualizado README com instruções de instalação"
git commit -m "style: formatação do código"
git commit -m "refactor: reorganizado estrutura de pastas"
git commit -m "chore: atualizado dependências"

# ══════════════════════════════════════════════════════════════════
# MINOR (0.X.0) - Novas funcionalidades (sem quebrar compatibilidade)
# ══════════════════════════════════════════════════════════════════
git commit -m "feat: adicionado filtro de busca no histórico"
git commit -m "feat: implementado sistema de notificações"
git commit -m "feat: nova página de relatórios"

# ══════════════════════════════════════════════════════════════════
# MAJOR (X.0.0) - Mudanças que quebram compatibilidade
# ══════════════════════════════════════════════════════════════════
git commit -m "major: nova estrutura de banco de dados"
git commit -m "major: API v2 com endpoints reestruturados"
git commit -m "BREAKING CHANGE: removido suporte a autenticação legada"
```

### 3.3 Como funciona o versionamento automático

Quando você faz `git push origin main`, o GitHub Actions:

1. **Busca a última tag** existente (ex: `v2.0.1`)
2. **Analisa os commits** desde a última tag
3. **Determina o incremento** baseado nos prefixos encontrados:
   - Se encontrar `major:` ou `BREAKING CHANGE` → incrementa Major
   - Se encontrar `feat:` → incrementa Minor
   - Caso contrário → incrementa Patch
4. **Cria a nova tag** automaticamente (ex: `v2.0.2`)
5. **Faz build e push** da imagem Docker com a nova tag
6. **Deploya** na VM de produção

### 3.4 Criar tag manualmente (se necessário)

Em casos especiais, você pode criar tags manualmente:

```bash
# Criar tag manualmente
git tag -a v2.0.0 -m "Major version 2.0.0 - Descrição das mudanças"

# Enviar a tag para o remoto
git push origin v2.0.0
```

### 3.5 Verificar tags existentes

```bash
# Listar todas as tags
git tag -l

# Ver a última tag
git describe --tags --abbrev=0
```

### 3.3 Verificar tags existentes

```bash
# Listar todas as tags
git tag -l

# Ver a última tag
git describe --tags --abbrev=0
```

---

## 4. Build da Imagem Docker

### 4.1 Navegar para pasta do backend

```powershell
cd c:\Users\vitor.lohan\documents\sistema-visitante\backend
```

### 4.2 Build da imagem com tag de versão

```powershell
# Substituir vX.X.X pela versão atual (ex: v2.0.1)
docker build -t vitorlohan/liberae:v2.0.1 .
```

### 4.3 Criar tag latest

```powershell
docker tag vitorlohan/liberae:v2.0.1 vitorlohan/liberae:latest
```

### 4.4 Verificar imagens criadas

```powershell
docker images | Select-String "liberae"
```

---

## 5. Push para Docker Hub

### 5.1 Login no Docker Hub (se necessário)

```powershell
docker login
# Inserir usuário: vitorlohan
# Inserir senha/token
```

### 5.2 Enviar imagem versionada

```powershell
docker push vitorlohan/liberae:v2.0.1
```

### 5.3 Enviar imagem latest

```powershell
docker push vitorlohan/liberae:latest
```

### 5.4 Verificar no Docker Hub

Acesse https://hub.docker.com/r/vitorlohan/liberae/tags para confirmar as imagens.

---

## 6. Deploy na VM de Produção

### 6.1 Conectar via SSH

```bash
ssh dev@34.225.38.222
```

### 6.2 Navegar para pasta de produção

```bash
cd /home/dev/sistema/prod
```

### 6.3 Configurar variáveis de ambiente

Criar/editar arquivo `.env` na pasta prod:

```bash
nano .env
```

Conteúdo do `.env`:

```env
DOCKER_USERNAME=vitorlohan
IMAGE_TAG=v2.0.1
```

### 6.4 Verificar docker-compose.yml

O arquivo deve usar as variáveis de ambiente:

```yaml
services:
  backend:
    image: ${DOCKER_USERNAME}/liberae:${IMAGE_TAG}
    # ... resto da configuração
```

### 6.5 Pull da nova imagem

```bash
docker pull vitorlohan/liberae:v2.0.1
```

### 6.6 Parar containers antigos

```bash
docker compose down
```

### 6.7 Iniciar novos containers

```bash
docker compose up -d
```

### 6.8 Verificar containers rodando

```bash
docker ps
```

Containers esperados:

- `sistema_visitante_db_prod`
- `sistema_visitante_backend_prod`
- `nginx_prod`

### 6.9 Verificar logs do backend

```bash
docker logs sistema_visitante_backend_prod --tail 50
```

### 6.10 Verificar logs em tempo real

```bash
docker logs -f sistema_visitante_backend_prod
```

---

## 7. Migração do Banco de Dados

### 7.1 Quando executar migração

Execute migração SQL quando houver alterações em:

- Estrutura de tabelas (CREATE, ALTER, DROP)
- Renomeação de colunas ou tabelas
- Novas constraints ou índices
- Dados de seed (permissões, papéis, etc.)

### 7.2 Backup antes da migração (IMPORTANTE!)

```bash
# Na VM de produção ou máquina local com acesso ao banco
pg_dump -h 34.225.38.222 -p 5786 -U neondb_owner_prod -d neondb_prod > backup_antes_migracao_$(date +%Y%m%d_%H%M%S).sql
```

### 7.3 Executar script de migração

Da máquina local:

```powershell
# Definir senha como variável de ambiente
$env:PGPASSWORD='SUA_SENHA_AQUI'

# Executar migração
psql -h 34.225.38.222 -p 5786 -U neondb_owner_prod -d neondb_prod -f backend/sql/NOME_DO_SCRIPT.sql
```

### 7.4 Verificar migração

```powershell
# Verificar se tabelas foram criadas/alteradas
$env:PGPASSWORD='SUA_SENHA_AQUI'
psql -h 34.225.38.222 -p 5786 -U neondb_owner_prod -d neondb_prod -c "\dt"
```

### 7.5 Scripts de migração comuns

| Script                             | Descrição                                              |
| ---------------------------------- | ------------------------------------------------------ |
| `migration_v2.0.0_safe.sql`        | Migração completa v2.0.0 (renomeia tabelas, cria RBAC) |
| `seed_papeis_permissoes.sql`       | Popula permissões e papéis                             |
| `seed_chat_suporte_permissoes.sql` | Permissões do chat de suporte                          |

---

## 8. Deploy do Frontend no Vercel

### 8.1 Deploy automático

O Vercel faz deploy automático quando há push para a branch configurada (geralmente `main`).

### 8.2 Variáveis de ambiente necessárias

No painel do Vercel (Settings → Environment Variables):

| Variável            | Valor                                     |
| ------------------- | ----------------------------------------- |
| `CI`                | `false`                                   |
| `REACT_APP_API_URL` | `https://visitante.dimeexperience.com.br` |

### 8.3 Redeploy manual (se necessário)

1. Acesse o dashboard do Vercel
2. Vá em **Deployments**
3. Clique nos **3 pontos** do último deploy
4. Selecione **Redeploy**

### 8.4 Verificar build logs

Se o deploy falhar, verifique os logs de build no Vercel para identificar erros de ESLint ou compilação.

> 💡 **Dica:** A variável `CI=false` faz com que warnings do ESLint não falhem o build.

---

## 9. Verificação Final

### 9.1 Checklist de verificação

- [ ] Containers rodando na VM (`docker ps`)
- [ ] Backend respondendo: `https://visitante.dimeexperience.com.br/api/health`
- [ ] Frontend carregando: `https://seu-dominio-vercel.vercel.app`
- [ ] Login funcionando
- [ ] WebSocket conectando (verificar console do navegador)
- [ ] Funcionalidades principais testadas

### 9.2 Testar WebSocket

No console do navegador (F12):

```javascript
// Verificar conexão socket
// Deve aparecer logs de conexão socket.io
```

### 9.3 Verificar logs de erro

```bash
# Na VM
docker logs sistema_visitante_backend_prod --tail 100 | grep -i error
```

---

## 10. Troubleshooting

### 10.1 Docker Desktop não está rodando

**Erro:** `error during connect: ... Is the docker daemon running?`

**Solução:** Abrir Docker Desktop e aguardar inicialização completa.

### 10.2 Falha no push para Docker Hub

**Erro:** `denied: requested access to the resource is denied`

**Solução:**

```powershell
docker logout
docker login
# Inserir credenciais novamente
```

### 10.3 Variáveis de ambiente não definidas na VM

**Erro:** `DOCKER_USERNAME variable is not set`

**Solução:** Criar arquivo `.env` na pasta do docker-compose:

```bash
echo "DOCKER_USERNAME=vitorlohan" >> .env
echo "IMAGE_TAG=vX.X.X" >> .env
```

### 10.4 Erro de sintaxe SQL

**Erro:** `ERROR: syntax error at or near "NOT"` (para IF NOT EXISTS em constraints)

**Solução:** PostgreSQL não suporta `IF NOT EXISTS` em `ADD CONSTRAINT`. Usar bloco condicional:

```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nome_constraint') THEN
        ALTER TABLE tabela ADD CONSTRAINT nome_constraint ...;
    END IF;
END $$;
```

### 10.5 Build do Vercel falhando por ESLint

**Erro:** `Treating warnings as errors because process.env.CI = true`

**Solução:** Adicionar variável de ambiente `CI=false` no Vercel.

### 10.6 WebSocket não conecta

**Verificar:**

1. CORS configurado corretamente no backend
2. URL do socket no frontend aponta para produção
3. Nginx configurado para proxy de WebSocket

---

## 📝 Resumo dos Comandos Principais

```bash
# ═══════════════════════════════════════════════════════════════════════════
# 1. MERGE COM CONVENTIONAL COMMITS
# ═══════════════════════════════════════════════════════════════════════════
git checkout main
git merge aplicativo

# Escolha o prefixo conforme o tipo de mudança:
git commit -m "fix: corrigido bug X"      # → Patch (0.0.X)
git commit -m "feat: nova funcionalidade" # → Minor (0.X.0)
git commit -m "major: mudança breaking"   # → Major (X.0.0)

git push origin main
# ✅ GitHub Actions cria tag automaticamente e faz deploy!

# ═══════════════════════════════════════════════════════════════════════════
# 2. DEPLOY MANUAL (se necessário)
# ═══════════════════════════════════════════════════════════════════════════

# BUILD DOCKER (local)
cd backend
docker build -t vitorlohan/liberae:vX.X.X .
docker tag vitorlohan/liberae:vX.X.X vitorlohan/liberae:latest

# PUSH DOCKER (local)
docker push vitorlohan/liberae:vX.X.X
docker push vitorlohan/liberae:latest

# DEPLOY VM (via SSH)
ssh dev@34.225.38.222
cd /home/dev/sistema/prod
docker pull vitorlohan/liberae:vX.X.X
docker compose down
docker compose up -d

# ═══════════════════════════════════════════════════════════════════════════
# 3. MIGRAÇÃO SQL (se necessário)
# ═══════════════════════════════════════════════════════════════════════════
$env:PGPASSWORD='SENHA'; psql -h 34.225.38.222 -p 5786 -U neondb_owner_prod -d neondb_prod -f script.sql

# ═══════════════════════════════════════════════════════════════════════════
# 4. VERCEL - Automático ou redeploy manual pelo dashboard
# ═══════════════════════════════════════════════════════════════════════════
```

### 📋 Referência Rápida de Conventional Commits

| Prefixo     | Versão | Quando usar                              |
| ----------- | ------ | ---------------------------------------- |
| `fix:`      | Patch  | Correção de bugs                         |
| `feat:`     | Minor  | Nova funcionalidade                      |
| `major:`    | Major  | Mudança que quebra compatibilidade       |
| `docs:`     | Patch  | Apenas documentação                      |
| `style:`    | Patch  | Formatação, sem mudança de código        |
| `refactor:` | Patch  | Refatoração sem mudança de comportamento |
| `chore:`    | Patch  | Tarefas de manutenção                    |

---

## 🔗 Links Úteis

- **Docker Hub:** https://hub.docker.com/r/vitorlohan/liberae
- **Vercel Dashboard:** https://vercel.com/dashboard
- **GitHub Actions:** Ver aba "Actions" no repositório

---

> 📅 **Próxima atualização:** Adicionar seção de rollback em caso de falha
