# 🎯 Sistema de Chat de Suporte - Guia de Implementação

## 📋 Visão Geral

Sistema de chat híbrido (IA + Humano) implementado com:

- **Widget flutuante** para usuários e visitantes
- **Painel de atendente** para suporte humano
- **Integração com IA** (Grok) para FAQ automático
- **Fila FIFO** para atendimento humano
- **Auditoria completa** de todas as ações

---

## 🗃️ 1. Executar Scripts SQL

### 1.1 Criar Tabelas

Execute o script de criação das tabelas:

```bash
# No PostgreSQL
psql -U seu_usuario -d sua_database -f backend/sql/create_chat_suporte_tables.sql
```

**Tabelas criadas:**

- `chat_conversas` - Conversas de suporte
- `chat_mensagens` - Mensagens das conversas
- `chat_fila` - Fila de atendimento FIFO
- `chat_auditoria` - Logs de auditoria
- `chat_faq` - Base de conhecimento para IA
- `chat_avaliacoes` - Avaliações pós-atendimento

### 1.2 Seed de Permissões

Execute o seed de permissões:

```bash
psql -U seu_usuario -d sua_database -f backend/sql/seed_chat_suporte_permissoes.sql
```

**Permissões criadas:**

- `chat_visualizar` - Ver próprias conversas
- `chat_criar` - Iniciar conversas
- `chat_atendente_acessar_painel` - Acessar painel de atendente
- `chat_atendente_aceitar` - Aceitar conversas da fila
- `chat_atendente_visualizar_fila` - Ver fila de atendimento
- `chat_admin_estatisticas` - Ver estatísticas do chat
- `chat_admin_auditoria` - Ver logs de auditoria
- `chat_admin_faq` - Gerenciar FAQ

---

## ⚙️ 2. Configurar Variáveis de Ambiente

### Backend (.env)

```env
# Grok API (x.ai) - Para respostas de IA
GROK_API_KEY=sua_chave_api_grok
GROK_API_URL=https://api.x.ai/v1/chat/completions
GROK_MODEL=grok-2-1212

# OU use OpenAI como alternativa
# OPENAI_API_KEY=sua_chave_openai
# OPENAI_MODEL=gpt-4o-mini
```

### Frontend (.env)

```env
# URL do backend (para API e Socket.IO)
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SOCKET_URL=http://localhost:3001
```

---

## 📁 3. Arquivos Criados

### Backend

| Arquivo                                    | Descrição                  |
| ------------------------------------------ | -------------------------- |
| `sql/create_chat_suporte_tables.sql`       | Schema das tabelas         |
| `sql/seed_chat_suporte_permissoes.sql`     | Permissões RBAC            |
| `src/services/ChatAuditoriaService.js`     | Serviço de auditoria       |
| `src/services/ChatFilaService.js`          | Gerenciamento de fila FIFO |
| `src/services/ChatIAService.js`            | Integração com Grok/IA     |
| `src/services/ChatSuporteService.js`       | Serviço principal          |
| `src/controllers/ChatSuporteController.js` | Controller HTTP            |
| `src/routes/chatSuporte.routes.js`         | Rotas com validação        |

### Frontend

| Arquivo                                         | Descrição           |
| ----------------------------------------------- | ------------------- |
| `src/components/ChatWidget/index.js`            | Widget flutuante    |
| `src/components/ChatWidget/ChatWidget.css`      | Estilos do widget   |
| `src/pages/PainelAtendente/index.js`            | Painel de atendente |
| `src/pages/PainelAtendente/PainelAtendente.css` | Estilos do painel   |

### Arquivos Modificados

| Arquivo                                  | Modificação                               |
| ---------------------------------------- | ----------------------------------------- |
| `backend/src/routes/index.js`            | Adicionada rota `/chat-suporte`           |
| `backend/src/socket.js`                  | Adicionados handlers do chat              |
| `frontend/src/App.js`                    | Adicionado `<ChatWidget />` global        |
| `frontend/src/routes/routes.js`          | Adicionada rota `/chat-suporte/atendente` |
| `frontend/src/services/socketService.js` | Adicionados eventos do chat               |

---

## 🔐 4. Atribuir Permissões aos Papéis

Execute no PostgreSQL para atribuir permissões:

```sql
-- Permissões para ADMIN (todas)
INSERT INTO papel_permissao (papel_id, permissao_id)
SELECT
  (SELECT id FROM papeis WHERE nome = 'ADMIN'),
  id
FROM permissoes
WHERE codigo LIKE 'chat_%'
ON CONFLICT DO NOTHING;

-- Permissões para atendentes
INSERT INTO papel_permissao (papel_id, permissao_id)
SELECT
  (SELECT id FROM papeis WHERE nome = 'SEU_PAPEL_ATENDENTE'),
  id
FROM permissoes
WHERE codigo IN (
  'chat_visualizar',
  'chat_criar',
  'chat_atendente_acessar_painel',
  'chat_atendente_aceitar',
  'chat_atendente_visualizar_fila'
)
ON CONFLICT DO NOTHING;

-- Permissões para usuários comuns
INSERT INTO papel_permissao (papel_id, permissao_id)
SELECT
  (SELECT id FROM papeis WHERE nome = 'USUARIO'),
  id
FROM permissoes
WHERE codigo IN ('chat_visualizar', 'chat_criar')
ON CONFLICT DO NOTHING;
```

---

## 🚀 5. Fluxo de Uso

### Usuário/Visitante

1. **Abre o Widget** → Clica no botão flutuante no canto inferior direito
2. **Se identifica** → Preenche nome e email (auto-preenchido se logado)
3. **Conversa com Bot** → IA responde perguntas frequentes
4. **Solicita Humano** → Clica no botão de telefone ou pede "falar com atendente"
5. **Entra na Fila** → Aguarda com posição visível
6. **Atendimento Humano** → Conversa em tempo real
7. **Avaliação** → Dá nota após finalizar

### Atendente

1. **Acessa Painel** → `/chat-suporte/atendente`
2. **Vê Fila** → Lista de clientes aguardando
3. **Aceita Conversa** → Clica em "Atender"
4. **Conversa** → Chat em tempo real
5. **Finaliza** → Clica em "Finalizar"

---

## 📡 6. Endpoints da API

### Rotas Públicas

| Método | Rota                              | Descrição                       |
| ------ | --------------------------------- | ------------------------------- |
| POST   | `/chat-suporte/conversas/iniciar` | Iniciar conversa como visitante |

### Rotas Autenticadas (Usuário)

| Método | Rota                                              | Descrição                   |
| ------ | ------------------------------------------------- | --------------------------- |
| GET    | `/chat-suporte/conversas`                         | Listar conversas do usuário |
| POST   | `/chat-suporte/conversas`                         | Iniciar nova conversa       |
| GET    | `/chat-suporte/conversas/:id`                     | Buscar conversa             |
| POST   | `/chat-suporte/conversas/:id/mensagens`           | Enviar mensagem             |
| POST   | `/chat-suporte/conversas/:id/solicitar-atendente` | Solicitar humano            |
| POST   | `/chat-suporte/conversas/:id/finalizar`           | Finalizar conversa          |
| POST   | `/chat-suporte/conversas/:id/avaliar`             | Avaliar atendimento         |

### Rotas de Atendente

| Método | Rota                                          | Descrição        |
| ------ | --------------------------------------------- | ---------------- |
| GET    | `/chat-suporte/atendente/fila`                | Ver fila         |
| POST   | `/chat-suporte/atendente/aceitar/:conversaId` | Aceitar conversa |
| GET    | `/chat-suporte/atendente/minhas-conversas`    | Conversas ativas |
| GET    | `/chat-suporte/atendente/historico`           | Histórico        |

### Rotas de Admin

| Método | Rota                               | Descrição         |
| ------ | ---------------------------------- | ----------------- |
| GET    | `/chat-suporte/admin/estatisticas` | Dashboard stats   |
| GET    | `/chat-suporte/admin/auditoria`    | Logs de auditoria |
| GET    | `/chat-suporte/admin/faq`          | Listar FAQ        |
| POST   | `/chat-suporte/admin/faq`          | Criar FAQ         |
| PUT    | `/chat-suporte/admin/faq/:id`      | Editar FAQ        |
| DELETE | `/chat-suporte/admin/faq/:id`      | Deletar FAQ       |

---

## 🔌 7. Eventos Socket.IO

### Emitidos pelo Cliente

| Evento                           | Payload               | Descrição             |
| -------------------------------- | --------------------- | --------------------- |
| `chat-suporte:entrar`            | `conversa_id`         | Entrar na sala        |
| `chat-suporte:sair`              | `conversa_id`         | Sair da sala          |
| `chat-suporte:digitando`         | `{conversa_id, nome}` | Indicador digitando   |
| `chat-suporte:parou-digitar`     | `{conversa_id}`       | Parou de digitar      |
| `chat-suporte:atendente-online`  | `{atendente_id}`      | Atendente conectou    |
| `chat-suporte:atendente-offline` | `{atendente_id}`      | Atendente desconectou |

### Emitidos pelo Servidor

| Evento                             | Payload                         | Descrição            |
| ---------------------------------- | ------------------------------- | -------------------- |
| `chat-suporte:mensagem`            | `{conversa_id, mensagem}`       | Nova mensagem        |
| `chat-suporte:atendente-entrou`    | `{conversa_id, atendente_nome}` | Atendente aceitou    |
| `chat-suporte:conversa-finalizada` | `{conversa_id}`                 | Conversa encerrada   |
| `chat-suporte:fila-atualizada`     | `{posicao, conversa_id}`        | Atualização da fila  |
| `chat-suporte:nova-fila`           | `{}`                            | Novo cliente na fila |

---

## 🎨 8. Personalização

### Cores do Widget (ChatWidget.css)

```css
:root {
  --chat-primary: #007bff; /* Cor principal */
  --chat-success: #28a745; /* Sucesso/Online */
  --chat-warning: #ffc107; /* Aguardando */
  --chat-danger: #dc3545; /* Erro/Offline */
}
```

### Mensagem Inicial do Bot

Edite em `ChatIAService.js`:

```javascript
const SYSTEM_PROMPT = `
Você é o assistente virtual da [SUA EMPRESA].
Ajude os clientes com dúvidas sobre [SEUS SERVIÇOS].
...
`;
```

---

## 🧪 9. Testes

### Testar como Visitante

1. Deslogue do sistema
2. Abra a página principal
3. Clique no botão de chat
4. Preencha nome e email
5. Envie mensagens

### Testar como Atendente

1. Logue como usuário com permissão `chat_atendente_acessar_painel`
2. Acesse `/chat-suporte/atendente`
3. Abra outra aba como visitante
4. Solicite atendimento humano
5. Aceite na fila e converse

---

## ⚠️ Problemas Comuns

### Widget não aparece

- Verifique se `ChatWidget` está importado no `App.js`
- Verifique o console para erros de CSS

### Mensagens não chegam em tempo real

- Verifique a conexão Socket.IO no console
- Confirme que `REACT_APP_SOCKET_URL` está correto
- Verifique se o backend está rodando

### IA não responde

- Configure `GROK_API_KEY` no `.env` do backend
- Verifique logs do backend para erros de API
- Teste a API diretamente com curl

### Permissões negadas

- Execute o seed de permissões
- Atribua permissões ao papel do usuário
- Faça logout/login para atualizar sessão

---

## 📚 Recursos

- [Grok API Docs](https://docs.x.ai/)
- [Socket.IO Docs](https://socket.io/docs/v4/)
- [Celebrate Validation](https://github.com/arb/celebrate)
