# 📂 Services - Documentação

> **Última atualização:** Janeiro 2026  
> **Autor:** Sistema de Visitantes  
> **Versão:** 2.0.0

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Arquitetura](#-arquitetura)
3. [Arquivos](#-arquivos)
   - [api.js](#apijs)
   - [cacheService.js](#cacheservicejs)
   - [socketService.js](#socketservicejs)
   - [permissoesService.js](#permissoesservicejs)
4. [Fluxo de Dados](#-fluxo-de-dados)
5. [Padrões de Uso](#-padrões-de-uso)
6. [Diagrama de Conexões](#-diagrama-de-conexões)

---

## 🎯 Visão Geral

A pasta `services` contém todos os serviços responsáveis por:

- **Comunicação com o Backend** (API REST)
- **Cache de Dados** (Memória + SessionStorage)
- **Sincronização em Tempo Real** (Socket.IO)
- **Gerenciamento de Permissões**

### Princípios Arquiteturais

| Princípio                  | Descrição                                        |
| -------------------------- | ------------------------------------------------ |
| **Centralização**          | Todos os serviços de dados passam por esta pasta |
| **Cache First**            | Prioriza cache para performance                  |
| **Real-time Sync**         | Socket.IO atualiza cache automaticamente         |
| **Single Source of Truth** | `cacheService` é a fonte única de dados          |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│   │   Páginas    │     │  Components  │     │   Contexts   │   │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘   │
│          │                    │                    │            │
│          └────────────┬───────┴────────────────────┘            │
│                       │                                          │
│              ┌────────▼────────┐                                │
│              │  useDataLoader  │  (Hook centralizado)           │
│              └────────┬────────┘                                │
│                       │                                          │
│   ┌───────────────────┼───────────────────────────┐             │
│   │                   │        SERVICES           │             │
│   │   ┌───────────────▼───────────────┐           │             │
│   │   │       cacheService.js         │           │             │
│   │   │  (Memória + SessionStorage)   │           │             │
│   │   └───────────────┬───────────────┘           │             │
│   │                   │                           │             │
│   │   ┌───────────────┼───────────────┐           │             │
│   │   │               │               │           │             │
│   │   ▼               ▼               ▼           │             │
│   │ api.js    socketService.js  permissoesService │             │
│   │   │               │               │           │             │
│   └───┼───────────────┼───────────────┼───────────┘             │
│       │               │               │                          │
└───────┼───────────────┼───────────────┼──────────────────────────┘
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────┐ ┌───────────────┐
│   Backend     │ │  Socket   │ │   Backend     │
│   REST API    │ │  Server   │ │   Permissões  │
└───────────────┘ └───────────┘ └───────────────┘
```

---

## 📁 Arquivos

### api.js

> **Propósito:** Cliente HTTP para comunicação com o Backend

#### Configuração

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3001",
});
```

#### Funcionalidades

| Feature            | Descrição                                               |
| ------------------ | ------------------------------------------------------- |
| **Auto-Auth**      | Adiciona token JWT automaticamente em todas requisições |
| **Error Handling** | Redireciona para login em caso de 401 (não autorizado)  |
| **Base URL**       | Configura URL base via variável de ambiente             |

#### Interceptors

```javascript
// REQUEST: Adiciona token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// RESPONSE: Trata erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);
```

#### Uso

```javascript
import api from "../services/api";

// GET
const response = await api.get("/usuarios/123");

// POST
const response = await api.post("/tickets", { motivo: "Suporte" });

// PUT
await api.put("/tickets/1", { status: "Resolvido" });

// DELETE
await api.delete("/agendamentos/5");
```

---

### cacheService.js

> **Propósito:** Sistema centralizado de cache em duas camadas

#### Arquitetura de Cache

```
┌─────────────────────────────────────────┐
│           ACESSO AOS DADOS              │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│          1. MEMÓRIA (memoryCache)       │
│          - Acesso instantâneo           │
│          - Volátil (perde no refresh)   │
└─────────────────────┬───────────────────┘
                      │ fallback
                      ▼
┌─────────────────────────────────────────┐
│          2. SESSION STORAGE             │
│          - Persiste entre navegações    │
│          - Limpo ao fechar navegador    │
└─────────────────────────────────────────┘
```

#### Dados Cacheados

##### Dados Principais (carregados no login)

| Chave                | Tabela BD           | Descrição                        |
| -------------------- | ------------------- | -------------------------------- |
| `usuarios`           | usuarios            | Lista de usuários do sistema     |
| `cadastroVisitantes` | cadastro_visitantes | Cadastro de visitantes           |
| `empresasVisitantes` | empresas_visitantes | Empresas de onde vêm visitantes  |
| `setoresVisitantes`  | setores_visitantes  | Setores para onde visitantes vão |
| `empresas`           | empresas            | Empresas dos usuários            |
| `setores`            | setores             | Setores dos usuários             |
| `responsaveis`       | responsaveis        | Responsáveis por liberar         |
| `funcionarios`       | funcionarios        | Lista de funcionários            |
| `papeis`             | papeis              | Papéis/Roles do sistema          |
| `permissoes`         | permissoes          | Permissões do sistema            |

##### Dados Operacionais

| Chave          | Tabela BD    | Descrição                |
| -------------- | ------------ | ------------------------ |
| `visitors`     | visitors     | Visitantes em tempo real |
| `history`      | history      | Histórico de visitas     |
| `agendamentos` | agendamentos | Agendamentos             |
| `tickets`      | tickets      | Tickets de suporte       |

##### Dados de Descarga

| Chave                           | Tabela BD                       | Descrição    |
| ------------------------------- | ------------------------------- | ------------ |
| `solicitacoesDescarga`          | solicitacoes_descarga           | Solicitações |
| `solicitacoesDescargaHistorico` | solicitacoes_descarga_historico | Histórico    |

##### Dados de Suporte

| Chave              | Tabela BD         | Descrição         |
| ------------------ | ----------------- | ----------------- |
| `conversasSuporte` | conversas_suporte | Conversas do chat |
| `mensagensSuporte` | mensagens_suporte | Mensagens         |

##### Dados de Ponto

| Chave                   | Tabela BD              | Descrição          |
| ----------------------- | ---------------------- | ------------------ |
| `registrosPonto`        | registros_ponto        | Registros de ponto |
| `historicoPontoDiario`  | historico_ponto_diario | Histórico diário   |
| `registrosFuncionarios` | registros_funcionarios | Ponto funcionários |

#### Funções Principais

```javascript
// Salvar dados
setCache("visitantes", listaVisitantes);

// Recuperar dados
const visitantes = getCache("visitantes");

// Verificar se cache está carregado
if (isCacheLoaded()) {
  /* ... */
}

// Limpar todo cache
clearCache();

// Estatísticas
const stats = getCacheStats();
```

#### Funções CRUD Genéricas

```javascript
// Adicionar item
addToCache("tickets", novoTicket, "data_criacao", "desc");

// Atualizar item
updateInCache("tickets", ticketId, dadosAtualizados);

// Remover item
removeFromCache("tickets", ticketId);

// Buscar item
const ticket = findInCache("tickets", ticketId);
```

#### Funções Específicas por Entidade

```javascript
// Visitantes
addVisitanteToCache(visitante);
updateVisitanteInCache(id, dados);
removeVisitanteFromCache(id);

// Agendamentos
addAgendamentoToCache(agendamento);
updateAgendamentoInCache(id, dados);
removeAgendamentoFromCache(id);

// Tickets
addTicketToCache(ticket);
updateTicketInCache(id, dados);
removeTicketFromCache(id);

// Funcionários
addFuncionarioToCache(funcionario);
updateFuncionarioInCache(cracha, dados);
removeFuncionarioFromCache(cracha);

// Empresas Visitantes
addEmpresaVisitanteToCache(empresa);
updateEmpresaVisitanteInCache(id, dados);
removeEmpresaVisitanteFromCache(id);

// Setores Visitantes
addSetorVisitanteToCache(setor);
updateSetorVisitanteInCache(id, dados);
removeSetorVisitanteFromCache(id);

// Permissões
setPermissoesCache(permissoes, papeis);
getPermissoesCache();
clearPermissoesCache();

// Solicitações de Descarga
addSolicitacaoDescargaToCache(solicitacao);
updateSolicitacaoDescargaInCache(id, dados);
removeSolicitacaoDescargaFromCache(id);
```

---

### socketService.js

> **Propósito:** Sincronização de dados em tempo real via Socket.IO

#### Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │                   socketService.js                    │  │
│   │                                                       │  │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│   │  │  connect()  │  │    on()     │  │  emit()     │   │  │
│   │  │  Token JWT  │  │  Listeners  │  │  Eventos    │   │  │
│   │  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│   │                                                       │  │
│   └──────────────────────────┬───────────────────────────┘  │
│                              │                               │
└──────────────────────────────┼───────────────────────────────┘
                               │ WebSocket
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                      BACKEND                                  │
│                                                               │
│   ┌───────────────────────────────────────────────────────┐  │
│   │                    Socket.IO Server                    │  │
│   │                                                        │  │
│   │  Eventos Emitidos:                                     │  │
│   │  • visitante:created/updated/deleted                   │  │
│   │  • empresa:created/updated/deleted                     │  │
│   │  • setor:created/updated/deleted                       │  │
│   │  • ticket:create/update/viewed                         │  │
│   │  • agendamento:create/update/delete                    │  │
│   │  • descarga:nova/atualizada                            │  │
│   │  • funcionario:created/updated/deleted                 │  │
│   │                                                        │  │
│   └───────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

#### Eventos Registrados

| Categoria        | Eventos                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| **Visitantes**   | `visitante:created`, `visitante:updated`, `visitante:deleted`          |
| **Empresas**     | `empresa:created`, `empresa:updated`, `empresa:deleted`                |
| **Setores**      | `setor:created`, `setor:updated`, `setor:deleted`                      |
| **Tickets**      | `ticket:create`, `ticket:update`, `ticket:viewed`, `ticket:all_viewed` |
| **Agendamentos** | `agendamento:create`, `agendamento:update`, `agendamento:delete`       |
| **Descarga**     | `descarga:nova`, `descarga:atualizada`                                 |
| **Conexão**      | `connected`, `disconnected`, `error`                                   |

#### Funções

```javascript
import * as socketService from "../services/socketService";

// Conectar (passando token JWT)
socketService.connect(token);

// Verificar conexão
if (socketService.isConnected()) {
  /* ... */
}

// Registrar listener
const unsubscribe = socketService.on("visitante:created", (visitante) => {
  console.log("Novo visitante:", visitante);
});

// Remover listener
unsubscribe();

// Emitir evento
socketService.emit("join", "global");

// Desconectar
socketService.disconnect();
```

#### Configurações de Conexão

```javascript
socket = io(socketUrl, {
  auth: { token },
  extraHeaders: { Authorization: `Bearer ${token}` },
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});
```

---

### permissoesService.js

> **Propósito:** Gerenciamento de permissões e papéis do usuário logado

#### Integração com Cache

```javascript
// Buscar permissões (usa cache se disponível)
const { permissoes, papeis } = await buscarMinhasPermissoes();

// Limpar cache de permissões
limparCachePermissoes();
```

#### Verificações de Permissão

```javascript
// Verificar permissão específica
if (await temPermissao("empresa_criar")) {
  // Pode criar empresa
}

// Verificar se tem alguma das permissões
if (await temAlgumaPermissao(["empresa_criar", "empresa_editar"])) {
  // Pode criar OU editar
}

// Verificar se tem todas as permissões
if (await temTodasPermissoes(["empresa_criar", "empresa_editar"])) {
  // Pode criar E editar
}

// Verificar se é ADMIN
if (await isAdmin()) {
  // É administrador
}

// Obter papéis do usuário
const papeis = await meusPapeis();
```

#### Fluxo de Cache de Permissões

```
┌─────────────────────────────────────────────────────────────┐
│                  buscarMinhasPermissoes()                    │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Tem cache?     │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │ SIM                         │ NÃO
              ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────────┐
│  Retorna do cache       │   │  API: /usuarios-papeis/     │
│  (memória/sessionStorage)│   │        me/permissoes        │
└─────────────────────────┘   └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │  Salva no cacheService      │
                              │  setPermissoesCache()       │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │  Retorna permissões/papéis  │
                              └─────────────────────────────┘
```

---

## 🔄 Fluxo de Dados

### Carregamento Inicial (Login)

```
1. Usuário faz login
        │
        ▼
2. useDataLoader é acionado
        │
        ▼
3. Verifica se tem cache válido
        │
        ├── SIM → Restaura do cache
        │         Conecta Socket
        │         Retorna dados
        │
        └── NÃO → Carrega da API (10 etapas)
                  │
                  ├── Etapa 1 (10%): empresas/setores visitantes
                  ├── Etapa 2 (20%): dados do usuário
                  ├── Etapa 3 (30%): responsáveis
                  ├── Etapa 4 (45%): cadastro visitantes
                  ├── Etapa 5 (55%): agendamentos
                  ├── Etapa 6 (65%): tickets
                  ├── Etapa 7 (75%): funcionários
                  ├── Etapa 8 (85%): permissões/papéis
                  ├── Etapa 9 (95%): patch notes
                  └── Etapa 10 (100%): conecta Socket.IO
                        │
                        ▼
                  Salva tudo no cacheService
```

### Atualização em Tempo Real

```
1. Outro usuário faz uma alteração
        │
        ▼
2. Backend emite evento Socket.IO
        │
        ▼
3. socketService recebe evento
        │
        ▼
4. useDataLoader atualiza estado
        │
        ▼
5. cacheService é atualizado
        │
        ▼
6. Interface re-renderiza automaticamente
```

---

## 📌 Padrões de Uso

### Exemplo 1: Página usando dados do cache

```javascript
import { useDataLoader } from "../hooks/useDataLoader";
import { useAuth } from "../hooks/useAuth";

function MinhaPage() {
  const { user } = useAuth();
  const { visitantes, loading, error } = useDataLoader(user?.id);

  if (loading) return <Loading />;
  if (error) return <Error message={error} />;

  return <Lista items={visitantes} />;
}
```

### Exemplo 2: Acessando cache diretamente

```javascript
import { getCache, setCache } from "../services/cacheService";

// Ler do cache
const visitantes = getCache("cadastroVisitantes");

// Atualizar cache após operação
const novoVisitante = await api.post("/cadastro-visitantes", dados);
addVisitanteToCache(novoVisitante.data);
```

### Exemplo 3: Verificando permissões

```javascript
import { temPermissao, isAdmin } from "../services/permissoesService";

async function verificarAcesso() {
  if (await isAdmin()) {
    return true; // Admin tem acesso total
  }

  return await temPermissao("empresa_criar");
}
```

---

## 📊 Diagrama de Conexões

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                        services/                             │    │
│  │                                                              │    │
│  │  ┌──────────┐    ┌───────────────┐    ┌─────────────────┐   │    │
│  │  │  api.js  │◄───│ cacheService  │◄───│ socketService   │   │    │
│  │  │          │    │     .js       │    │      .js        │   │    │
│  │  │  HTTP    │    │               │    │                 │   │    │
│  │  │  REST    │    │  Memória +    │    │  WebSocket      │   │    │
│  │  │          │    │  Session      │    │  Real-time      │   │    │
│  │  └────┬─────┘    └───────┬───────┘    └────────┬────────┘   │    │
│  │       │                  │                     │             │    │
│  │       │     ┌────────────┴────────────┐        │             │    │
│  │       │     │                         │        │             │    │
│  │       │     ▼                         ▼        │             │    │
│  │       │  ┌────────────────────────────────┐    │             │    │
│  │       │  │      permissoesService.js      │    │             │    │
│  │       │  │                                │    │             │    │
│  │       │  │  Verifica permissões usando    │    │             │    │
│  │       │  │  cache ou API                  │    │             │    │
│  │       │  └────────────────────────────────┘    │             │    │
│  │       │                                        │             │    │
│  └───────┼────────────────────────────────────────┼─────────────┘    │
│          │                                        │                   │
└──────────┼────────────────────────────────────────┼───────────────────┘
           │                                        │
           ▼                                        ▼
┌──────────────────────────────┐    ┌──────────────────────────────────┐
│         BACKEND              │    │         SOCKET SERVER            │
│                              │    │                                  │
│   /api/v2/*                  │    │   Porta: 3001 (WebSocket)        │
│   /empresas-visitantes       │    │                                  │
│   /setores-visitantes        │    │   Eventos:                       │
│   /cadastro-visitantes       │    │   • visitante:*                  │
│   /agendamentos              │    │   • empresa:*                    │
│   /tickets                   │    │   • setor:*                      │
│   /funcionarios              │    │   • ticket:*                     │
│   /usuarios                  │    │   • descarga:*                   │
│   /usuarios-papeis           │    │   • funcionario:*                │
│   etc...                     │    │                                  │
└──────────────────────────────┘    └──────────────────────────────────┘
```

---

## 📝 Notas Importantes

1. **Sempre use `cacheService`** para acessar dados - nunca faça chamadas diretas à API para dados que estão no cache.

2. **Socket.IO atualiza automaticamente** - Não precisa fazer polling ou refresh manual.

3. **O cache é limpo no logout** - `clearAllData()` no `useDataLoader` limpa tudo.

4. **SessionStorage vs LocalStorage** - Usamos SessionStorage propositalmente para limpar dados ao fechar o navegador (segurança).

5. **Aliases de compatibilidade** - `visitantes` = `cadastroVisitantes`, `historico` = `history`

---

## 🔗 Links Relacionados

- [Hooks Documentation](../hooks/README.md)
- [Contexts Documentation](../contexts/README.md)
- [Backend API Documentation](../../backend/README.md)

---

> **Mantido por:** Equipe de Desenvolvimento  
> **Contato:** suporte@sistema-visitante.com
