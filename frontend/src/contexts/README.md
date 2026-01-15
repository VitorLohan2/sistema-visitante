# 📦 Contexts - Documentação Técnica

## 📋 Visão Geral

A pasta `contexts/` contém os **React Contexts** da aplicação, utilizados para gerenciamento de estado global com foco em **contadores e badges** que aparecem na interface, especialmente no menu lateral da aplicação.

## 🎯 Propósito dos Contexts

Os contexts neste sistema são responsáveis por:

1. **Gerenciar contadores em tempo real** (badges no menu lateral)
2. **Sincronizar dados via Socket.IO** para atualizações instantâneas
3. **Tocar notificações sonoras** quando novos itens chegam
4. **Integrar com o cache** para persistência dos dados

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ARQUITETURA DOS CONTEXTS                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │  Agendamento    │    │     Ticket      │    │    Descarga     │ │
│  │    Context      │    │    Context      │    │    Context      │ │
│  ├─────────────────┤    ├─────────────────┤    ├─────────────────┤ │
│  │ agendamentos[]  │    │ tickets[]       │    │ solicitações    │ │
│  │ abertos: 5      │    │ abertos: 3      │    │ Pendentes: 2    │ │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘ │
│           │                      │                      │          │
│           └──────────────────────┼──────────────────────┘          │
│                                  │                                  │
│                                  ▼                                  │
│                    ┌─────────────────────────┐                     │
│                    │   MenuDaBarraLateral    │                     │
│                    │   (Exibe os badges)     │                     │
│                    └─────────────────────────┘                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Estrutura de Arquivos

```
contexts/
├── AgendamentoContext.js   # Gerencia agendamentos e contagem de abertos
├── TicketContext.js        # Gerencia tickets e contagem de abertos
├── DescargaContext.js      # Gerencia contagem de solicitações pendentes
└── README.md               # Esta documentação
```

---

## 📄 Arquivos Detalhados

### 1️⃣ AgendamentoContext.js

#### Descrição

Gerencia o estado global dos **agendamentos de visitantes**, incluindo lista completa e contador de agendamentos não confirmados para exibição no badge do menu lateral.

#### Estados Gerenciados

| Estado                | Tipo            | Descrição                                |
| --------------------- | --------------- | ---------------------------------------- |
| `agendamentos`        | `Array<Object>` | Lista completa de agendamentos           |
| `agendamentosAbertos` | `number`        | Contador de agendamentos não confirmados |
| `isLoading`           | `boolean`       | Indica se está carregando dados          |

#### Funcionalidades

```javascript
// Hook para usar o context
const {
  agendamentos, // Array com todos os agendamentos
  agendamentosAbertos, // Número de agendamentos não confirmados
  isLoading, // Estado de loading
  fetchAgendamentos, // Busca agendamentos (com suporte a cache)
  addAgendamento, // Adiciona agendamento localmente
  updateAgendamento, // Atualiza agendamento localmente
  removeAgendamento, // Remove agendamento localmente
} = useAgendamentos();
```

#### Socket.IO Events

| Evento               | Ação                                 |
| -------------------- | ------------------------------------ |
| `agendamento:create` | Adiciona novo agendamento + toca som |
| `agendamento:update` | Atualiza agendamento existente       |
| `agendamento:delete` | Remove agendamento da lista          |

#### Onde é Usado

- `MenuDaBarraLateral.js` → Badge com contagem de agendamentos abertos
- `ListaAgendamentos/index.js` → Página de listagem de agendamentos

#### Exemplo de Uso

```javascript
import { useAgendamentos } from "../contexts/AgendamentoContext";

function MeuComponente() {
  const { agendamentos, agendamentosAbertos, fetchAgendamentos } =
    useAgendamentos();

  // Exibir badge
  return (
    <Badge count={agendamentosAbertos}>
      <span>Agendamentos</span>
    </Badge>
  );
}
```

---

### 2️⃣ TicketContext.js

#### Descrição

Gerencia o estado global dos **tickets de suporte**, incluindo lista completa e contador de tickets com status "Aberto" para exibição no badge do menu.

#### Estados Gerenciados

| Estado           | Tipo            | Descrição                               |
| ---------------- | --------------- | --------------------------------------- |
| `tickets`        | `Array<Object>` | Lista completa de tickets               |
| `ticketsAbertos` | `number`        | Contador de tickets com status "Aberto" |
| `isLoading`      | `boolean`       | Indica se está carregando dados         |

#### Funcionalidades

```javascript
// Hook para usar o context
const {
  tickets, // Array com todos os tickets
  ticketsAbertos, // Número de tickets abertos
  isLoading, // Estado de loading
  fetchTickets, // Busca tickets (com suporte a cache)
  setupSocketListeners, // Configura listeners do socket
} = useTickets();
```

#### Socket.IO Events

| Evento              | Ação                                  |
| ------------------- | ------------------------------------- |
| `ticket:create`     | Adiciona novo ticket + toca som       |
| `ticket:update`     | Atualiza ticket existente             |
| `ticket:viewed`     | Marca ticket como visualizado         |
| `ticket:all_viewed` | Marca todos tickets como visualizados |

#### Onde é Usado

- `protectedRoutes.jsx` → Verificação de tickets abertos nas rotas
- `TicketDashboard/index.js` → Página de dashboard de tickets
- `MenuDaBarraLateral.js` → Badge com contagem (via protectedRoutes)

#### Exemplo de Uso

```javascript
import { useTickets } from "../contexts/TicketContext";

function MeuComponente() {
  const { tickets, ticketsAbertos, fetchTickets } = useTickets();

  // Filtrar tickets abertos
  const ticketsFiltrados = tickets.filter((t) => t.status === "Aberto");

  return (
    <div>
      <span>Tickets Abertos: {ticketsAbertos}</span>
      {ticketsFiltrados.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}
```

---

### 3️⃣ DescargaContext.js

#### Descrição

Gerencia apenas o **contador de solicitações de descarga pendentes**. Diferente dos outros contexts, este **não mantém a lista completa**, apenas o número de pendentes para exibição no badge.

#### Estados Gerenciados

| Estado                  | Tipo      | Descrição                          |
| ----------------------- | --------- | ---------------------------------- |
| `solicitacoesPendentes` | `number`  | Contador de solicitações pendentes |
| `isLoading`             | `boolean` | Indica se está carregando dados    |

#### Funcionalidades

```javascript
// Hook para usar o context
const {
  solicitacoesPendentes, // Número de solicitações pendentes
  isLoading, // Estado de loading
  refreshPendentes, // Atualiza contagem manualmente
} = useDescargas();
```

#### Socket.IO Events

| Evento                | Ação                                      |
| --------------------- | ----------------------------------------- |
| `descarga:nova`       | Incrementa contador + toca som            |
| `descarga:atualizada` | Decrementa contador se aprovado/rejeitado |

#### Onde é Usado

- `MenuDaBarraLateral.js` → Badge com contagem de solicitações pendentes

#### Exemplo de Uso

```javascript
import { useDescargas } from "../contexts/DescargaContext";

function MeuComponente() {
  const { solicitacoesPendentes, refreshPendentes } = useDescargas();

  const handleAprovar = async (id) => {
    await api.patch(`/solicitacoes-descarga/${id}/aprovar`);
    refreshPendentes(); // Atualiza contador após aprovar
  };

  return (
    <Badge count={solicitacoesPendentes}>
      <span>Descargas</span>
    </Badge>
  );
}
```

---

## 🔄 Ciclo de Vida dos Contexts

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CICLO DE VIDA                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   1. LOGIN                                                           │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  isAuthenticated = true                                      │   │
│   │         │                                                    │   │
│   │         ▼                                                    │   │
│   │  ┌─────────────────┐                                        │   │
│   │  │ Conectar Socket │                                        │   │
│   │  └────────┬────────┘                                        │   │
│   │           │                                                  │   │
│   │           ▼                                                  │   │
│   │  ┌─────────────────────────┐                                │   │
│   │  │ Setup Socket Listeners │                                 │   │
│   │  └────────┬────────────────┘                                │   │
│   │           │                                                  │   │
│   │           ▼                                                  │   │
│   │  ┌─────────────────────────┐                                │   │
│   │  │ Buscar dados da API    │ ← Cache primeiro, depois API    │   │
│   │  └────────┬────────────────┘                                │   │
│   │           │                                                  │   │
│   │           ▼                                                  │   │
│   │  ┌─────────────────────────┐                                │   │
│   │  │ Calcular contadores    │                                 │   │
│   │  └─────────────────────────┘                                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   2. DURANTE USO (Real-time)                                        │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │   Socket.IO Event                                            │   │
│   │         │                                                    │   │
│   │         ▼                                                    │   │
│   │   ┌─────────────────────────┐                               │   │
│   │   │ Atualizar estado local │                                │   │
│   │   └────────┬────────────────┘                               │   │
│   │            │                                                 │   │
│   │            ▼                                                 │   │
│   │   ┌─────────────────────────┐                               │   │
│   │   │ Atualizar cache        │                                │   │
│   │   └────────┬────────────────┘                               │   │
│   │            │                                                 │   │
│   │            ▼                                                 │   │
│   │   ┌─────────────────────────┐                               │   │
│   │   │ Recalcular contadores  │                                │   │
│   │   └────────┬────────────────┘                               │   │
│   │            │                                                 │   │
│   │            ▼                                                 │   │
│   │   ┌─────────────────────────┐                               │   │
│   │   │ Tocar som (se aplicável)│                               │   │
│   │   └─────────────────────────┘                               │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   3. LOGOUT                                                          │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  isAuthenticated = false                                     │   │
│   │         │                                                    │   │
│   │         ▼                                                    │   │
│   │  ┌─────────────────────────┐                                │   │
│   │  │ Limpar estados         │                                 │   │
│   │  └────────┬────────────────┘                                │   │
│   │           │                                                  │   │
│   │           ▼                                                  │   │
│   │  ┌─────────────────────────┐                                │   │
│   │  │ Remover listeners      │                                 │   │
│   │  └────────┬────────────────┘                                │   │
│   │           │                                                  │   │
│   │           ▼                                                  │   │
│   │  ┌─────────────────────────┐                                │   │
│   │  │ Reset refs             │                                 │   │
│   │  └─────────────────────────┘                                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔊 Sistema de Notificação Sonora

Todos os contexts implementam notificação sonora para novos itens:

```javascript
// Configuração do áudio
const audioRef = useRef(null);

useEffect(() => {
  audioRef.current = new Audio(notificacaoSom);
  audioRef.current.volume = 0.7;
}, []);

// Função para tocar
const playNotificationSound = useCallback(() => {
  if (audioRef.current) {
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((err) => {
      console.log("Não foi possível tocar som:", err.message);
    });
  }
}, []);
```

**Importante:** O som só é tocado **após o primeiro carregamento**, para evitar múltiplas notificações ao logar.

---

## 🏗️ Estrutura de Provider

Os contexts são organizados no `App.js` seguindo hierarquia de dependências:

```jsx
// App.js
<AuthProvider>
  <AgendamentoProvider>
    <TicketProvider>
      <DescargaProvider>
        <Router>{/* Rotas da aplicação */}</Router>
      </DescargaProvider>
    </TicketProvider>
  </AgendamentoProvider>
</AuthProvider>
```

---

## 📊 Comparativo dos Contexts

| Característica            | AgendamentoContext       | TicketContext         | DescargaContext            |
| ------------------------- | ------------------------ | --------------------- | -------------------------- |
| **Mantém lista completa** | ✅ Sim                   | ✅ Sim                | ❌ Não                     |
| **Contador para badge**   | ✅ `agendamentosAbertos` | ✅ `ticketsAbertos`   | ✅ `solicitacoesPendentes` |
| **Critério do contador**  | `!confirmado`            | `status === "Aberto"` | Busca API `/count`         |
| **Integração com cache**  | ✅ Sim                   | ✅ Sim                | ❌ Não                     |
| **Notificação sonora**    | ✅ Sim                   | ✅ Sim                | ✅ Sim                     |
| **CRUD local**            | ✅ Sim                   | ❌ Não                | ❌ Não                     |

---

## ⚠️ Boas Práticas

### ✅ Faça

```javascript
// ✅ Use o hook dentro de um Provider
function ComponenteDentroDoProvider() {
  const { agendamentosAbertos } = useAgendamentos();
  return <Badge count={agendamentosAbertos} />;
}

// ✅ Use para badges e contadores globais
<MenuDaBarraLateral>
  <Badge count={ticketsAbertos}>Tickets</Badge>
</MenuDaBarraLateral>;

// ✅ Use refreshPendentes após operações
const handleAprovar = async () => {
  await api.patch("/aprovar");
  refreshPendentes();
};
```

### ❌ Evite

```javascript
// ❌ NÃO use hooks fora de um Provider
function ComponenteForaDoProvider() {
  const { agendamentos } = useAgendamentos(); // Erro!
}

// ❌ NÃO duplique dados que já estão no cacheService
// Os contexts devem focar em contadores, não em listas completas
// Para listas, use: const empresas = getCache('empresasVisitantes');

// ❌ NÃO manipule diretamente o estado
setAgendamentos([...agendamentos, novoItem]); // Use addAgendamento()
```

---

## 🔗 Integração com Outros Módulos

```
┌─────────────────────────────────────────────────────────────────────┐
│                      INTEGRAÇÕES                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────┐                                              │
│   │    useAuth      │ ← Fornece isAuthenticated para inicialização │
│   └────────┬────────┘                                              │
│            │                                                        │
│            ▼                                                        │
│   ┌─────────────────┐                                              │
│   │    Contexts     │                                              │
│   └────────┬────────┘                                              │
│            │                                                        │
│     ┌──────┴──────┬──────────────────┐                             │
│     ▼             ▼                  ▼                              │
│ ┌────────┐  ┌────────────┐  ┌─────────────────┐                    │
│ │  api   │  │ cacheService│  │ socketService  │                    │
│ └────────┘  └────────────┘  └─────────────────┘                    │
│                                                                     │
│   Dependências:                                                     │
│   • api.js → Chamadas HTTP para buscar dados                       │
│   • cacheService.js → Persistência de agendamentos/tickets         │
│   • socketService.js → Eventos real-time                           │
│   • useAuth.js → Estado de autenticação                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📈 Quando Usar Contexts vs Cache

| Use Case                            | Solução Recomendada |
| ----------------------------------- | ------------------- |
| Contadores para badges no menu      | ✅ **Contexts**     |
| Listas completas de dados           | ✅ **cacheService** |
| Estado compartilhado com real-time  | ✅ **Contexts**     |
| Dados estáticos (empresas, setores) | ✅ **cacheService** |
| Notificações sonoras                | ✅ **Contexts**     |

---

## 📝 Histórico de Atualizações

| Data       | Versão | Descrição                   |
| ---------- | ------ | --------------------------- |
| 2025-01-14 | 1.0.0  | Documentação inicial criada |

---

## 👥 Autores

Documentação criada para o **Sistema de Visitantes** como parte da padronização do frontend.
