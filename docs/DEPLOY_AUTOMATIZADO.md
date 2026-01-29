# 🚀 Guia de Deploy Automatizado - Sistema Visitante

## 📊 Visão Geral da Nova Arquitetura

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
     │                    │ v2.0.5    │                          │
     │                    └─────┬─────┘                          │
     │                          │                                │
     │                    ┌─────┴─────┐                          │
     │                    │  build &  │                          │
     │                    │   push    │──> Docker Hub            │
     │                    └─────┬─────┘                          │
     │                          │                                │
     │                    ┌─────┴─────┐   Self-Hosted Runner     │
     │                    │  deploy   │─────────────────────────>│
     │                    │   prod    │  • Gera .env completo    │
     │                    └─────┬─────┘  • Copia compose file    │
     │                          │        • docker compose up     │
     │                          │                                │
     │                    ┌─────┴─────┐                          │
     │                    │  health   │<─────────────────────────│
     │                    │  check    │   Verifica se está OK    │
     │                    └───────────┘                          │
```

## ✅ O Que Mudou

### Antes (Problemático)

- ❌ Arquivo `.env` na VM precisava ser atualizado **manualmente**
- ❌ `IMAGE_TAG=v2.0.4` tinha que ser editado a cada deploy
- ❌ Variáveis de ambiente hardcoded no `docker-compose.yml`
- ❌ Dois arquivos diferentes: repo vs VM
- ❌ Senhas expostas no compose file

### Agora (Automatizado)

- ✅ GitHub Actions gera o `.env` **automaticamente** com a nova tag
- ✅ `docker-compose-prod.yml` é copiado do repo para a VM
- ✅ Todas as variáveis sensíveis vêm dos **GitHub Secrets**
- ✅ Uma única fonte de verdade
- ✅ Zero intervenção manual

---

## 🔐 Configuração dos Secrets no GitHub

Acesse: **Settings > Secrets and variables > Actions**

### Secrets Obrigatórios

| Secret            | Descrição             | Exemplo                                                                        |
| ----------------- | --------------------- | ------------------------------------------------------------------------------ |
| `DOCKER_USERNAME` | Usuário Docker Hub    | `vitorlohan`                                                                   |
| `DOCKER_TOKEN`    | Token do Docker Hub   | `dckr_pat_xxx`                                                                 |
| `DB_NAME`         | Nome do banco         | `neondb_prod`                                                                  |
| `DB_USER`         | Usuário do banco      | `neondb_owner_prod`                                                            |
| `DB_PASSWORD`     | Senha do banco        | `npg_prod_senha`                                                               |
| `JWT_SECRET`      | Chave JWT (64+ chars) | `gere_uma_chave_forte...`                                                      |
| `ENCRYPTION_KEY`  | Chave de criptografia | `gere_outra_chave_forte...`                                                    |
| `CORS_ORIGIN`     | Origem CORS principal | `https://visitante.dimeexperience.com.br`                                      |
| `ALLOWED_ORIGINS` | Origens permitidas    | `https://visitante.dimeexperience.com.br,https://sistema-visitante.vercel.app` |

### Secrets Cloudinary

| Secret                  | Valor                         |
| ----------------------- | ----------------------------- |
| `CLOUDINARY_CLOUD_NAME` | `dtfqvrhqo`                   |
| `CLOUDINARY_API_KEY`    | `655269355194556`             |
| `CLOUDINARY_API_SECRET` | `yU5XnoMurLk0HZfcJ7WhxqW5MXs` |

### Secrets E-mail

| Secret        | Valor                                             |
| ------------- | ------------------------------------------------- |
| `SMTP_HOST`   | `smtp.gmail.com`                                  |
| `SMTP_PORT`   | `587`                                             |
| `SMTP_SECURE` | `false`                                           |
| `SMTP_USER`   | `vitorlohanrj@gmail.com`                          |
| `SMTP_PASS`   | `iynr uvys yeeb geaz`                             |
| `SMTP_FROM`   | `Sistema Liberaê - DIME <vitorlohanrj@gmail.com>` |

### Secrets Dashboard

| Secret                    | Valor                               |
| ------------------------- | ----------------------------------- |
| `DASHBOARD_PASSWORD_HASH` | `$2b$12$daPfflQEq460xs44WMJ3V...`   |
| `DASHBOARD_JWT_SECRET`    | `f8a05b007d214c9bc839eb4168...`     |
| `ADMIN_STATS_KEY`         | `seu_admin_key_producao_forte_aqui` |

---

## 🛠️ Como Usar

### Deploy Automático (Recomendado)

```bash
# Qualquer commit na main dispara o deploy
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

### Deploy Manual de Tag Específica

1. Vá em **Actions > Deploy to Production > Run workflow**
2. Informe a tag desejada (ex: `v2.0.3`)
3. Clique em **Run workflow**

### Redeploy sem Build (usar imagem existente)

1. Vá em **Actions > Deploy to Production > Run workflow**
2. Informe a tag
3. Marque **skip_build: true**
4. Clique em **Run workflow**

---

## 📁 Estrutura na VM

```
/home/dev/sistema/prod/
├── .env                      # Gerado automaticamente pelo GitHub Actions
├── docker-compose-prod.yml   # Copiado do repo automaticamente
├── nginx/
│   ├── nginx.conf
│   └── conf.d/
│       └── default.conf
└── certs/                    # Certificados SSL (se houver)
```

---

## 🔧 Troubleshooting

### O deploy não está atualizando a versão

1. Verifique se o Self-Hosted Runner está online
2. Vá em **Settings > Actions > Runners**

### Variáveis de ambiente não estão funcionando

1. Verifique os Secrets no GitHub
2. Confira os logs do workflow em **Actions**

### Container não sobe

```bash
# Na VM, execute:
cd /home/dev/sistema/prod
docker compose -f docker-compose-prod.yml logs -f
```

### Verificar se .env está correto

```bash
# Na VM:
cat /home/dev/sistema/prod/.env
```

---

## 🔄 Migração do Sistema Antigo

### Passo 1: Configure os Secrets no GitHub

Copie todas as variáveis do seu `.env.producao` para GitHub Secrets.

### Passo 2: Execute o setup na VM (apenas uma vez)

```bash
# Clone ou baixe o script
curl -o setup.sh https://raw.githubusercontent.com/seu-repo/main/scripts/setup-vm-prod.sh
chmod +x setup.sh
./setup.sh
```

### Passo 3: Faça um push para main

```bash
git add .
git commit -m "chore: migração para deploy automatizado"
git push origin main
```

### Passo 4: Verifique o deploy

Acompanhe em **Actions** no GitHub.

---

## ⚠️ Importante

1. **Nunca edite o `.env` manualmente na VM** - ele será sobrescrito
2. **Todas as variáveis devem estar nos GitHub Secrets**
3. **O `docker-compose-prod.yml` do repo é a fonte de verdade**
4. **Mantenha o Self-Hosted Runner sempre online**

---

## 📈 Versionamento Semântico

O sistema gera tags automaticamente baseado nos commits:

| Tipo de Commit  | Exemplo                                | Resultado       |
| --------------- | -------------------------------------- | --------------- |
| Breaking Change | `BREAKING CHANGE: ...` ou `major: ...` | v2.0.0 → v3.0.0 |
| Nova Feature    | `feat: nova funcionalidade`            | v2.0.0 → v2.1.0 |
| Qualquer outro  | `fix: corrige bug`                     | v2.0.0 → v2.0.1 |
