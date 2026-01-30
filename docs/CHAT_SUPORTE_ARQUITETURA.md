# 📚 Arquitetura Completa do Chat de Suporte

> **Última Atualização**: Refatoração completa para namespaces dedicados

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura de Comunicação Socket.IO](#2-arquitetura-de-comunicação-socketio)
3. [Backend - Estrutura de Arquivos](#3-backend---estrutura-de-arquivos)
4. [Frontend - Estrutura de Arquivos](#4-frontend---estrutura-de-arquivos)
5. [Fluxos de Comunicação](#5-fluxos-de-comunicação)
6. [Salas (Rooms) do Socket.IO](#6-salas-rooms-do-socketio)
7. [Eventos Socket.IO](#7-eventos-socketio)
8. [APIs REST](#8-apis-rest)
9. [Diagrama de Sequência](#9-diagrama-de-sequência)
10. [Cache e Persistência](#10-cache-e-persistência)

---

## 1. Visão Geral

O Chat de Suporte é um sistema híbrido que combina:

- **IA (Max)**: Assistente virtual usando Groq API (LLaMA 3)
- **Atendimento Humano**: Fila FIFO para atendentes

### Tipos de Usuário

| Tipo                | Descrição                     | Autenticação                   | Namespace Socket |
| ------------------- | ----------------------------- | ------------------------------ | ---------------- |
| **Visitante**       | Usuário NÃO logado no sistema | Token temporário (hash SHA256) | `/visitante`     |
| **Usuário Interno** | Usuário logado no sistema     | JWT Token                      | `/suporte`       |
| **Atendente**       | Usuário com permissão de chat | JWT Token                      | `/suporte`       |

---

## 2. Arquitetura de Comunicação Socket.IO

### 🔑 ARQUITETURA COM NAMESPACES DEDICADOS

O sistema usa **três namespaces separados** para isolamento completo:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SOCKET.IO SERVER                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  NAMESPACE "/"             NAMESPACE "/suporte"              NAMESPACE "/visitante"      │
│  ═════════════════         ══════════════════════            ═══════════════════════     │
│  • Requer JWT Token        • Requer JWT Token               • Sem autenticação           │
│  • Usuários logados        • Usuários c/ permissão chat     • Token temporário           │
│  • Sistema geral           • Atendentes + usuários chat     • Visitantes do site         │
│  • NÃO recebe chat!        • Dedicado ao chat suporte       • Recebe eventos de chat     │
│                                                                                          │
│  ┌──────────────────┐      ┌───────────────────────┐        ┌───────────────────┐        │
│  │   SALA "global"  │      │  SALA "notificacoes"  │        │  conversa:{id}    │        │
│  │  (todos logados) │      │ (todos c/ permissão)  │        │  (por conversa)   │        │
│  │  • rondas        │      └───────────────────────┘        └───────────────────┘        │
│  │  • descarga      │      ┌───────────────────────┐                                     │
│  │  • tickets       │      │   SALA "atendentes"   │                                     │
│  │  • etc.          │      │ (podem aceitar conv.) │                                     │
│  └──────────────────┘      └───────────────────────┘                                     │
│                            ┌───────────────────────┐                                     │
│                            │    conversa:{id}      │                                     │
│                            │ (por conversa ativa)  │                                     │
│                            └───────────────────────┘                                     │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Por que três namespaces separados?

1. **Segurança**: Usuários comuns não recebem eventos de chat sem permissão
2. **Isolamento**: Eventos de chat são enviados APENAS para quem precisa
3. **Performance**: Reduz tráfego desnecessário na sala `global`
4. **Manutenibilidade**: Código mais organizado e previsível

### Responsabilidades de cada Namespace

| Namespace    | Responsabilidade                                               |
| ------------ | -------------------------------------------------------------- |
| `/`          | Sistema geral (rondas, descargas, tickets, agendamentos, etc.) |
| `/suporte`   | Chat de suporte para usuários autenticados com permissão       |
| `/visitante` | Chat de suporte para visitantes não autenticados               |

---

## 3. Backend - Estrutura de Arquivos

### 📁 Organização

```
backend/src/
├── socket.js                          # Configuração Socket.IO + 3 namespaces
├── controllers/
│   └── ChatSuporteController.js       # Controller principal
├── services/
│   ├── ChatSuporteService.js          # Lógica de conversas
│   ├── ChatFilaService.js             # Fila FIFO
│   ├── ChatIAService.js               # IA Groq/Max
│   └── ChatAuditoriaService.js        # Logs de auditoria
└── routes/
    └── chatSuporte.routes.js          # Definição de rotas
```

### 📄 Detalhamento dos Arquivos

#### `socket.js` - Configuração Socket.IO

**Responsabilidades:**

- Inicializa servidor Socket.IO
- Gerencia conexões autenticadas (namespace `/`)
- Gerencia conexões de visitantes (namespace `/visitante`)
- Define eventos de entrada/saída de salas
- Mantém mapa de usuários online

**Funções Principais:**

```javascript
// Inicialização
init(server); // Configura Socket.IO no servidor HTTP
initVisitorNamespace(); // Configura namespace /visitante

// Utilitários
getIo(); // Retorna instância do io
emitirParaVisitante(id, ev, d); // Emite para namespace visitante
getUsuariosOnline(); // Lista usuários conectados
```

**Eventos Registrados (Namespace `/`):**

- `chat-suporte:entrar` - Usuário entra em conversa específica
- `chat-suporte:sair` - Usuário sai de conversa
- `chat-suporte:usuario-online` - Usuário com permissão entra na sala de notificações
- `chat-suporte:atendente-online` - Atendente entra na sala de atendentes
- `chat-suporte:atendente-offline` - Atendente sai da sala
- `chat-suporte:digitando` - Usuário está digitando
- `chat-suporte:parou-digitar` - Usuário parou de digitar

**Eventos Registrados (Namespace `/visitante`):**

- `chat-suporte:entrar` - Visitante entra na conversa
- `chat-suporte:sair` - Visitante sai da conversa
- `chat-suporte:digitando` - Visitante está digitando
- `chat-suporte:parou-digitar` - Visitante parou de digitar

---

#### `ChatSuporteController.js` - Controller Principal

**Responsabilidades:**

- Gerenciar todas as requisições HTTP do chat
- Emitir eventos Socket.IO
- Coordenar serviços

**Funções Helper:**

```javascript
gerarTokenVisitante(id, email); // Gera token SHA256 para visitantes
emitirEvento(ev, dados, sala); // Emite evento + replica para /visitante
emitirNovaFila(info); // Notifica nova conversa na fila
emitirFilaAtualizada(); // Notifica mudança na fila
```

**Métodos Públicos (Visitantes):**

```javascript
iniciarConversaVisitante(req, res); // POST /conversas/iniciar
enviarMensagemVisitante(req, res); // POST /visitante/conversas/:id/mensagens
buscarConversaVisitante(req, res); // GET /visitante/conversas/:id
solicitarAtendenteVisitante(req, res); // POST /visitante/.../solicitar-atendente
finalizarConversaVisitante(req, res); // POST /visitante/.../finalizar
```

**Métodos Autenticados (Usuários):**

```javascript
listarConversas(req, res); // GET /conversas
criarConversa(req, res); // POST /conversas
buscarConversa(req, res); // GET /conversas/:id
enviarMensagem(req, res); // POST /conversas/:id/mensagens
solicitarAtendente(req, res); // POST /conversas/:id/solicitar-atendente
finalizarConversa(req, res); // POST /conversas/:id/finalizar
avaliarConversa(req, res); // POST /conversas/:id/avaliar
```

**Métodos do Atendente:**

```javascript
listarFila(req, res); // GET /atendente/fila
listarMinhasConversas(req, res); // GET /atendente/minhas-conversas
aceitarConversa(req, res); // POST /atendente/aceitar/:id
enviarMensagemAtendente(req, res); // POST /atendente/mensagem/:id
finalizarAtendimento(req, res); // POST /atendente/finalizar/:id
transferirConversa(req, res); // POST /atendente/transferir/:id
```

---

#### `ChatSuporteService.js` - Lógica de Negócio

**Responsabilidades:**

- CRUD de conversas
- Envio/recebimento de mensagens
- Integração com IA
- Controle de status

**Funções Principais:**

```javascript
// Conversas
criarConversa({ usuario_id, nome, email, assunto });
buscarConversa(conversa_id);
listarConversasUsuario({ usuario_id, email, status });
atualizarStatus(conversa_id, status);
finalizarConversa(conversa_id, { motivo, finalizado_por });

// Mensagens
enviarMensagem({ conversa_id, origem, mensagem, remetente_id });
listarMensagens(conversa_id);

// Atendimento
solicitarAtendimentoHumano(conversa_id, dados);
aceitarConversa(conversa_id, atendente_id);
avaliarAtendimento(conversa_id, nota, comentario);
```

---

#### `ChatFilaService.js` - Fila de Atendimento

**Responsabilidades:**

- Gerenciar fila FIFO
- Controlar posições
- Adicionar/remover conversas

**Funções:**

```javascript
adicionarNaFila(conversa_id, prioridade); // Adiciona à fila
removerDaFila(conversa_id); // Remove da fila
obterPosicao(conversa_id); // Retorna posição atual
proximaConversa(); // Obtém próxima da fila
listar(); // Lista fila completa
contarNaFila(); // Conta itens na fila
```

---

#### `ChatIAService.js` - Assistente Virtual Max

**Responsabilidades:**

- Integração com Groq API
- Geração de respostas inteligentes
- Detecção de intenção de falar com humano
- Uso de FAQ como contexto

**Configuração:**

```javascript
GROQ_CONFIG = {
  API_KEY: process.env.GROQ_API_KEY,
  API_URL: "https://api.groq.com/openai/v1/chat/completions",
  MODEL: "llama-3.3-70b-versatile",
  TEMPERATURE: 0.7,
  MAX_TOKENS: 1000,
};
```

**Funções:**

```javascript
processarMensagem(conversa_id, mensagem, nome); // Processa e gera resposta
desejaFalarComHumano(mensagem); // Detecta intenção de transferência
buscarFAQsRelevantes(pergunta); // Busca contexto no FAQ
chamarGroqAPI(mensagens); // Chama API do Groq
```

**Palavras-chave para Transferência:**

- "atendente", "humano", "pessoa"
- "reclamação", "problema grave", "urgente"
- "não está funcionando", "bug", "erro grave"

---

#### `ChatAuditoriaService.js` - Logs de Auditoria

**Responsabilidades:**

- Registrar todas as ações no chat
- Manter histórico para compliance
- Gerar relatórios

**Ações Registradas:**

- `CONVERSA_CRIADA`
- `MENSAGEM_ENVIADA`
- `MENSAGEM_BOT_ENVIADA`
- `USUARIO_SOLICITOU_ATENDENTE`
- `CONVERSA_ENTROU_FILA`
- `ATENDENTE_ACEITOU`
- `ATENDENTE_TRANSFERIU`
- `CONVERSA_FINALIZADA`
- `AVALIACAO_ENVIADA`

---

## 4. Frontend - Estrutura de Arquivos

### 📁 Organização

```
frontend/src/
├── services/
│   └── socketService.js              # Conexão Socket.IO (831 linhas)
├── contexts/
│   └── ChatSuporteContext.js         # Estado global do chat (760 linhas)
├── components/
│   └── ChatWidget/
│       ├── index.js                  # Widget flutuante (1195 linhas)
│       └── ChatWidget.css            # Estilos
└── pages/
    └── PainelAtendente/
        ├── index.js                  # Painel do atendente (917 linhas)
        └── PainelAtendente.css       # Estilos
```

### 📄 Detalhamento dos Arquivos

#### `socketService.js` - Serviço de Socket

**Responsabilidades:**

- Gerenciar conexões Socket.IO para 3 namespaces
- Manter três sockets: principal, visitante e suporte
- Registrar/desregistrar callbacks de eventos
- Emitir eventos para o namespace correto

**Variáveis Globais:**

```javascript
let socket = null; // Socket principal (/) - sistema geral
let visitorSocket = null; // Socket visitantes (/visitante)
let suporteSocket = null; // Socket suporte (/suporte) - NOVO!
```

**Funções de Conexão:**

```javascript
// Socket Principal (usuários logados - sistema geral)
connect(token); // Conecta com JWT ao namespace /
disconnect(); // Desconecta
isConnected(); // Verifica conexão
emit(event, data); // Emite evento

// Socket Visitante (sem autenticação)
connectVisitor(chatToken, conversaId); // Conecta ao namespace /visitante
disconnectVisitor(); // Desconecta visitante
isVisitorConnected(); // Verifica conexão
emitVisitor(event, data); // Emite evento visitante

// Socket Suporte (usuários com permissão de chat) - NOVO!
connectSuporte(token); // Conecta ao namespace /suporte
disconnectSuporte(); // Desconecta
isSuporteConnected(); // Verifica conexão
emitSuporte(event, data); // Emite evento
onSuporte(event, cb); // Registra callback
offSuporte(event, cb); // Remove callback
```

**Callbacks do Socket Suporte:**

```javascript
suporteEventCallbacks = {
  "suporte:mensagem": [],
  "suporte:digitando": [],
  "suporte:parou-digitar": [],
  "suporte:atendente-entrou": [],
  "suporte:conversa-finalizada": [],
  "suporte:fila-atualizada": [],
  "suporte:nova-fila": [],
  connected: [],
  disconnected: [],
  error: [],
};
```

---

#### `ChatSuporteContext.js` - Estado Global

**Responsabilidades:**

- Conectar automaticamente ao namespace `/suporte` quando usuário tem permissão
- Manter contagem da fila em tempo real
- Gerenciar mensagens não lidas
- Notificar via toast (react-toastify)
- Registrar listeners de Socket do namespace /suporte

**Estados:**

```javascript
filaCount; // Quantidade na fila
mensagensNaoLidas; // { conversaId: count }
totalMensagensNaoLidas; // Total de mensagens não lidas
conversasAtivas; // Lista de conversas ativas
inicializado; // Se o contexto foi inicializado
```

**Refs (para evitar stale closures):**

```javascript
isAtendenteRef; // Se é atendente
temPermissaoChatRef; // Se tem permissão de chat
userIdRef; // ID do usuário
conversaVisualizandoRef; // Conversa sendo visualizada
```

**Funções Expostas:**

```javascript
// Para o Painel de Atendente
visualizandoConversa(id); // Marca conversa como sendo visualizada
saiuConversa(); // Marca que saiu da conversa
atualizarDados(); // Força recarregamento de dados
```

**Fluxo de Inicialização:**

1. Verifica se tem permissão de chat
2. Conecta socket se necessário
3. Entra na sala `chat-suporte-notificacoes`
4. Se atendente, também entra na sala `atendentes`
5. Verifica se há conversas pendentes na fila
6. Registra listeners para eventos

---

#### `ChatWidget/index.js` - Widget Flutuante

**Responsabilidades:**

- Interface do chat para usuários/visitantes
- Gerenciar conversa local
- Enviar/receber mensagens
- Solicitar atendente
- Avaliar atendimento

**Estados Principais:**

```javascript
isOpen; // Widget aberto/fechado
isMinimized; // Widget minimizado
conversa; // Dados da conversa atual
mensagens; // Lista de mensagens
posicaoFila; // Posição na fila
digitando; // Quem está digitando
tokenVisitante; // Token do visitante (sessionStorage)
```

**Fluxo Visitante:**

1. Preenche formulário (nome, email)
2. Cria conversa via API (`/conversas/iniciar`)
3. Recebe token temporário
4. Conecta ao namespace `/visitante`
5. Entra na sala da conversa

**Fluxo Usuário Logado:**

1. Dados preenchidos automaticamente
2. Cria conversa via API (`/conversas`)
3. Conecta ao namespace principal
4. Entra na sala da conversa

---

#### `PainelAtendente/index.js` - Painel de Atendimento

**Responsabilidades:**

- Interface do atendente
- Visualizar fila
- Aceitar conversas
- Responder mensagens
- Finalizar atendimentos

**Estados:**

```javascript
tab; // fila | ativas | historico
fila; // Lista da fila
conversasAtivas; // Conversas do atendente
conversaSelecionada; // Conversa atual
mensagens; // Mensagens da conversa
```

**Cache de Mensagens:**

```javascript
mensagensCache = useRef({}); // { conversaId: [...mensagens] }
```

**Eventos Socket Ouvidos:**

- `chat-suporte:mensagem` - Nova mensagem
- `chat-suporte:digitando` - Cliente digitando
- `chat-suporte:parou-digitar` - Cliente parou
- `chat-suporte:conversa-finalizada` - Conversa finalizada

---

## 5. Fluxos de Comunicação

### 5.1 Visitante Abre Chat

```
┌─────────────┐    HTTP POST           ┌──────────────┐
│  ChatWidget │ ─────────────────────> │   Backend    │
│ (Visitante) │  /conversas/iniciar    │              │
└─────────────┘                        └──────────────┘
      │                                       │
      │  Resposta: { conversa, token }       │
      │ <─────────────────────────────────────│
      │                                       │
      │  Socket.IO /visitante                 │
      │ ─────────────────────────────────────>│
      │  auth: { chatToken, conversaId }      │
      │                                       │
      │  Join sala "conversa:{id}"            │
      │ ─────────────────────────────────────>│
      │                                       │
```

### 5.2 Usuário Logado Abre Chat

```
┌─────────────┐    HTTP POST           ┌──────────────┐
│  ChatWidget │ ─────────────────────> │   Backend    │
│  (Logado)   │  /conversas            │              │
└─────────────┘  + JWT Token           └──────────────┘
      │                                       │
      │  Resposta: { conversa }              │
      │ <─────────────────────────────────────│
      │                                       │
      │  Socket.IO / (principal)              │
      │ ─────────────────────────────────────>│
      │  auth: { token: JWT }                 │
      │                                       │
      │  emit("chat-suporte:entrar", id)      │
      │ ─────────────────────────────────────>│
      │                                       │
```

### 5.3 Solicitar Atendente (Visitante)

```
┌─────────────┐    HTTP POST                    ┌──────────────┐
│  ChatWidget │ ─────────────────────────────> │   Backend    │
│ (Visitante) │  /visitante/.../solicitar       │              │
└─────────────┘  + token no body               └──────────────┘
                                                      │
                                                      │ 1. Adiciona à fila
                                                      │ 2. Atualiza status
                                                      │
                                    ┌─────────────────┴─────────────────┐
                                    │                                   │
                                    ▼                                   ▼
                           ┌──────────────┐                    ┌──────────────┐
                           │  Namespace / │                    │  Namespace   │
                           │   (global)   │                    │  /visitante  │
                           └──────────────┘                    └──────────────┘
                                    │                                   │
                  emit "nova-fila"  │                                   │
                  para:             │                                   │
                  - global          │                                   │
                  - chat-suporte-   │                                   │
                    notificacoes    │                                   │
                                    ▼                                   │
                           ┌──────────────┐                             │
                           │   Painel     │                             │
                           │  Atendente   │                             │
                           │  (Toast! 🔔) │                             │
                           └──────────────┘                             │
                                                                        │
                           emit "mensagem" para conversa:{id}           │
                                                    ├───────────────────┘
                                                    ▼
                                           ┌──────────────┐
                                           │  ChatWidget  │
                                           │ "Você está   │
                                           │  na fila..." │
                                           └──────────────┘
```

### 5.4 Atendente Aceita Conversa

```
┌──────────────┐   HTTP POST           ┌──────────────┐
│    Painel    │ ────────────────────> │   Backend    │
│  Atendente   │  /atendente/aceitar    │              │
└──────────────┘                       └──────────────┘
                                              │
                                              │ 1. Remove da fila
                                              │ 2. Atualiza conversa
                                              │ 3. Registra atendente
                                              │
                        ┌─────────────────────┴─────────────────────┐
                        │                                           │
                        ▼                                           ▼
               emit "fila-atualizada"                    emit "atendente-entrou"
               para:                                     para:
               - global                                  - conversa:{id}
               - chat-suporte-notificacoes               - namespace /visitante
                        │                                           │
                        ▼                                           ▼
               ┌──────────────┐                            ┌──────────────┐
               │ Outros       │                            │  ChatWidget  │
               │ Atendentes   │                            │  "Fulano     │
               │ (badge -1)   │                            │  entrou!"    │
               └──────────────┘                            └──────────────┘
```

---

## 6. Salas (Rooms) do Socket.IO

### Namespace `/` (Principal - Usuários Autenticados)

| Sala                        | Quem Entra                  | Propósito                      |
| --------------------------- | --------------------------- | ------------------------------ |
| `global`                    | TODOS os usuários logados   | Broadcast geral, equipe online |
| `chat-suporte-notificacoes` | Quem tem permissão de chat  | Notificações de nova fila      |
| `atendentes`                | Quem pode aceitar conversas | Heartbeat, status              |
| `conversa:{id}`             | Participantes da conversa   | Mensagens em tempo real        |

### Namespace `/visitante` (Não Autenticados)

| Sala            | Quem Entra            | Propósito               |
| --------------- | --------------------- | ----------------------- |
| `conversa:{id}` | Visitante da conversa | Mensagens em tempo real |

### Como Funciona a Entrada nas Salas

**Usuário Logado com Permissão de Chat:**

```javascript
// Ao conectar automaticamente entra em "global"
socket.join("global");

// Ao ChatSuporteContext inicializar
socket.emit("chat-suporte:usuario-online");
// Backend: socket.join("chat-suporte-notificacoes")

// Se for atendente
socket.emit("chat-suporte:atendente-online");
// Backend: socket.join("atendentes")
// Backend: socket.join("chat-suporte-notificacoes")

// Ao abrir uma conversa específica
socket.emit("chat-suporte:entrar", conversa_id);
// Backend: socket.join(`conversa:${conversa_id}`)
```

**Visitante:**

```javascript
// Ao conectar, já entra na sala se tiver token
// Backend verifica chatToken + conversaId
socket.join(`conversa:${conversaId}`);
```

---

## 7. Eventos Socket.IO

### 🆕 NOVA ARQUITETURA DE EVENTOS

Com a separação em namespaces dedicados, os eventos foram reorganizados:

#### Namespace `/suporte` (Usuários Autenticados)

**Eventos de Entrada/Saída de Salas:**

| Evento                        | Payload            | Descrição                             |
| ----------------------------- | ------------------ | ------------------------------------- |
| `suporte:entrar-notificacoes` | `{ usuario_id }`   | Usuário entra na sala de notificações |
| `suporte:entrar-atendentes`   | `{ atendente_id }` | Atendente entra na sala de atendentes |
| `suporte:entrar-conversa`     | `{ conversa_id }`  | Entra na sala de uma conversa         |
| `suporte:sair-conversa`       | `{ conversa_id }`  | Sai da sala de uma conversa           |
| `suporte:atendente-offline`   | `{ atendente_id }` | Atendente saiu do sistema             |
| `suporte:heartbeat-atendente` | `{ atendente_id }` | Mantém atendente nas salas            |

**Eventos Emitidos pelo Backend (para /suporte):**

| Evento                        | Payload                                           | Salas           | Descrição             |
| ----------------------------- | ------------------------------------------------- | --------------- | --------------------- |
| `suporte:nova-fila`           | `{ conversa_id, nome, posicao, fila, filaCount }` | `notificacoes`  | Nova conversa na fila |
| `suporte:fila-atualizada`     | `{ fila, filaCount }`                             | `notificacoes`  | Fila mudou            |
| `suporte:mensagem`            | `{ conversa_id, mensagem }`                       | `conversa:{id}` | Nova mensagem         |
| `suporte:atendente-entrou`    | `{ conversa_id, atendente_nome }`                 | `conversa:{id}` | Atendente aceitou     |
| `suporte:conversa-finalizada` | `{ conversa_id }`                                 | `conversa:{id}` | Conversa encerrada    |
| `suporte:digitando`           | `{ conversa_id, nome }`                           | `conversa:{id}` | Alguém digitando      |
| `suporte:parou-digitar`       | `{ conversa_id }`                                 | `conversa:{id}` | Parou de digitar      |

---

#### Namespace `/visitante` (Visitantes não autenticados)

**Eventos Emitidos pelo Backend:**

| Evento                             | Payload                           | Salas           | Descrição          |
| ---------------------------------- | --------------------------------- | --------------- | ------------------ |
| `chat-suporte:mensagem`            | `{ conversa_id, mensagem }`       | `conversa:{id}` | Nova mensagem      |
| `chat-suporte:atendente-entrou`    | `{ conversa_id, atendente_nome }` | `conversa:{id}` | Atendente aceitou  |
| `chat-suporte:conversa-finalizada` | `{ conversa_id }`                 | `conversa:{id}` | Conversa encerrada |
| `chat-suporte:digitando`           | `{ conversa_id, nome }`           | `conversa:{id}` | Alguém digitando   |
| `chat-suporte:parou-digitar`       | `{ conversa_id }`                 | `conversa:{id}` | Parou de digitar   |
| `chat-suporte:fila-atualizada`     | `{ posicao, conversa_id }`        | `conversa:{id}` | Posição na fila    |

**Eventos Emitidos pelo Frontend Visitante:**

| Evento                       | Payload                 | Descrição        |
| ---------------------------- | ----------------------- | ---------------- |
| `chat-suporte:digitando`     | `{ conversa_id, nome }` | Está digitando   |
| `chat-suporte:parou-digitar` | `{ conversa_id }`       | Parou de digitar |

---

#### Namespace `/` (Principal - SEM eventos de chat)

O namespace principal **NÃO recebe mais eventos de chat**. Isso garante que:

- Usuários sem permissão de chat não recebem notificações
- Menos tráfego na sala `global`
- Maior segurança e isolamento

---

## 8. APIs REST

### Rotas Públicas (Visitantes)

| Método | Rota                                                        | Descrição                      |
| ------ | ----------------------------------------------------------- | ------------------------------ |
| POST   | `/chat-suporte/conversas/iniciar`                           | Inicia conversa como visitante |
| POST   | `/chat-suporte/visitante/conversas/:id/mensagens`           | Envia mensagem                 |
| GET    | `/chat-suporte/visitante/conversas/:id`                     | Busca conversa                 |
| POST   | `/chat-suporte/visitante/conversas/:id/solicitar-atendente` | Solicita humano                |
| POST   | `/chat-suporte/visitante/conversas/:id/finalizar`           | Finaliza conversa              |

### Rotas Autenticadas (Usuários)

| Método | Rota                                              | Descrição                  |
| ------ | ------------------------------------------------- | -------------------------- |
| GET    | `/chat-suporte/conversas`                         | Lista conversas do usuário |
| POST   | `/chat-suporte/conversas`                         | Cria nova conversa         |
| GET    | `/chat-suporte/conversas/:id`                     | Detalhes da conversa       |
| POST   | `/chat-suporte/conversas/:id/mensagens`           | Envia mensagem             |
| POST   | `/chat-suporte/conversas/:id/solicitar-atendente` | Solicita humano            |
| POST   | `/chat-suporte/conversas/:id/finalizar`           | Finaliza conversa          |
| POST   | `/chat-suporte/conversas/:id/avaliar`             | Avalia atendimento         |

### Rotas do Atendente

| Método | Rota                                       | Permissão                       | Descrição        |
| ------ | ------------------------------------------ | ------------------------------- | ---------------- |
| GET    | `/chat-suporte/atendente/fila`             | `chat_atendente_acessar_painel` | Lista fila       |
| GET    | `/chat-suporte/atendente/minhas-conversas` | `chat_atendente_acessar_painel` | Conversas ativas |
| GET    | `/chat-suporte/atendente/historico`        | `chat_atendente_acessar_painel` | Histórico        |
| POST   | `/chat-suporte/atendente/aceitar/:id`      | `chat_atendente_aceitar`        | Aceita da fila   |
| POST   | `/chat-suporte/atendente/mensagem/:id`     | `chat_atendente_acessar_painel` | Envia mensagem   |
| POST   | `/chat-suporte/atendente/finalizar/:id`    | `chat_atendente_finalizar`      | Finaliza         |
| POST   | `/chat-suporte/atendente/transferir/:id`   | `chat_atendente_transferir`     | Transfere        |

---

## 9. Diagrama de Sequência

### Fluxo Completo: Visitante até Atendimento

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│Visitante│     │ Widget  │     │ Backend │     │ Socket  │     │Atendente│
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │               │
     │ Abre chat     │               │               │               │
     │──────────────>│               │               │               │
     │               │               │               │               │
     │               │ POST /iniciar │               │               │
     │               │──────────────>│               │               │
     │               │               │               │               │
     │               │ { conversa,   │               │               │
     │               │   token }     │               │               │
     │               │<──────────────│               │               │
     │               │               │               │               │
     │               │ Connect       │               │               │
     │               │ /visitante    │               │               │
     │               │──────────────────────────────>│               │
     │               │               │               │               │
     │ Envia msg     │               │               │               │
     │──────────────>│               │               │               │
     │               │               │               │               │
     │               │ POST /mensagens               │               │
     │               │──────────────>│               │               │
     │               │               │               │               │
     │               │               │ IA processa   │               │
     │               │               │──────────────>│               │
     │               │               │               │               │
     │               │               │ emit mensagem │               │
     │               │               │──────────────>│               │
     │               │               │               │               │
     │               │ Resposta Max  │               │               │
     │               │<──────────────────────────────│               │
     │               │               │               │               │
     │ Pede humano   │               │               │               │
     │──────────────>│               │               │               │
     │               │               │               │               │
     │               │ POST /solicitar-atendente     │               │
     │               │──────────────>│               │               │
     │               │               │               │               │
     │               │               │ emit nova-fila│               │
     │               │               │──────────────>│               │
     │               │               │               │     🔔 Toast! │
     │               │               │               │──────────────>│
     │               │               │               │               │
     │               │               │               │ Aceita        │
     │               │               │               │<──────────────│
     │               │               │               │               │
     │               │               │ POST /aceitar │               │
     │               │               │<──────────────│               │
     │               │               │               │               │
     │               │               │ emit atendente│               │
     │               │               │   -entrou     │               │
     │               │               │──────────────>│               │
     │               │               │               │               │
     │               │ "Atendente    │               │               │
     │               │  entrou!"     │               │               │
     │               │<──────────────────────────────│               │
     │               │               │               │               │
```

---

## 10. Cache e Persistência

### Frontend

**SessionStorage (Visitantes):**

```javascript
chatSuporteToken; // Token do visitante
chatSuporteConversaId; // ID da conversa
```

**Refs (Cache em Memória):**

```javascript
// PainelAtendente
mensagensCache.current = {
  [conversaId]: [...mensagens],
};

// ChatSuporteContext
mensagensProcessadasRef.current = new Set(); // IDs já processados
conversaVisualizandoRef.current = conversaId; // Conversa atual
```

### Backend

**Mapa de Usuários Online:**

```javascript
// socket.js
usuariosOnline = new Map();
// { socketId: { userId, userName, userEmail, ip, connectedAt, isAdmin } }
```

**Banco de Dados:**

- `chat_conversas` - Conversas
- `chat_mensagens` - Mensagens
- `chat_fila` - Fila de atendimento
- `chat_auditoria` - Logs de auditoria
- `chat_faq` - Perguntas frequentes

---

## Conclusão

### Sua Teoria Estava Correta! ✅

O sistema realmente usa **salas separadas** para cada tipo de comunicação:

1. **Namespace `/visitante`**: Isolado para visitantes não logados
2. **Namespace `/` (principal)**: Para usuários logados
3. **Sala `global`**: Todos os logados (mas não recebe eventos de chat por padrão)
4. **Sala `chat-suporte-notificacoes`**: Apenas quem tem permissão de chat
5. **Sala `atendentes`**: Apenas quem pode aceitar conversas
6. **Sala `conversa:{id}`**: Participantes específicos da conversa

Isso garante que:

- Visitantes não interferem com usuários logados
- Usuários sem permissão não recebem notificações de chat
- Atendentes recebem notificações em tempo real
- Mensagens são direcionadas apenas aos participantes da conversa
