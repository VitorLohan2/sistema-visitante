# 📂 Hooks - Documentação

> **Última atualização:** Janeiro 2026  
> **Autor:** Sistema de Visitantes  
> **Versão:** 2.0.0

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Arquitetura](#-arquitetura)
3. [Hooks Disponíveis](#-hooks-disponíveis)
   - [useAuth](#useauth)
   - [useDataLoader](#usedataloader)
   - [usePermissoes](#usepermissoes)
   - [useSocket](#usesocket)
4. [Diagrama de Dependências](#-diagrama-de-dependências)
5. [Padrões de Uso](#-padrões-de-uso)
6. [Fluxo de Autenticação](#-fluxo-de-autenticação)

---

## 🎯 Visão Geral

A pasta `hooks` contém React Hooks customizados que encapsulam lógica reutilizável para:

- **Autenticação** (login/logout/estado do usuário)
- **Carregamento de Dados** (cache + API + Socket)
- **Permissões** (verificação de acesso)
- **Socket.IO** (conexão em tempo real)

### Princípios

| Princípio                 | Descrição                                       |
| ------------------------- | ----------------------------------------------- |
| **Reutilização**          | Cada hook pode ser usado em qualquer componente |
| **Encapsulamento**        | Lógica complexa escondida em hooks simples      |
| **Composição**            | Hooks podem usar outros hooks                   |
| **Single Responsibility** | Cada hook tem uma única responsabilidade        |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         COMPONENTES                              │
│                                                                  │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│   │  Login   │   │Dashboard │   │Visitantes│   │  Admin   │    │
│   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘    │
│        │              │              │              │           │
│        └──────────────┴──────────────┴──────────────┘           │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                       HOOKS                              │   │
│   │                                                          │   │
│   │   ┌─────────────┐     ┌───────────────┐                 │   │
│   │   │  useAuth    │◄────│ useDataLoader │                 │   │
│   │   │             │     │               │                 │   │
│   │   │ Autenticação│     │ Dados+Cache   │                 │   │
│   │   └─────────────┘     └───────┬───────┘                 │   │
│   │          │                    │                          │   │
│   │          │     ┌──────────────┴──────────────┐          │   │
│   │          │     │                             │          │   │
│   │          ▼     ▼                             ▼          │   │
│   │   ┌─────────────────┐           ┌─────────────────┐     │   │
│   │   │  usePermissoes  │           │    useSocket    │     │   │
│   │   │                 │           │                 │     │   │
│   │   │   Autorização   │           │   Real-time     │     │   │
│   │   └─────────────────┘           └─────────────────┘     │   │
│   │                                                          │   │
│   └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                      SERVICES                            │   │
│   │                                                          │   │
│   │   api.js  │  cacheService.js  │  socketService.js       │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📁 Hooks Disponíveis

---

### useAuth

> **Propósito:** Gerenciar autenticação (login, logout, estado do usuário)

#### Provider

O `useAuth` requer que o app seja envolvido pelo `AuthProvider`:

```jsx
// App.js
import { AuthProvider } from "./hooks/useAuth";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes />
      </Router>
    </AuthProvider>
  );
}
```

#### Retorno

| Propriedade       | Tipo           | Descrição                        |
| ----------------- | -------------- | -------------------------------- |
| `isAuthenticated` | `boolean`      | Se o usuário está logado         |
| `loading`         | `boolean`      | Se está verificando autenticação |
| `user`            | `object\|null` | Dados do usuário logado          |
| `login`           | `function`     | Função para fazer login          |
| `logout`          | `function`     | Função para fazer logout         |
| `checkAuthStatus` | `function`     | Re-verifica status de auth       |
| `isAdmin`         | `function`     | Verifica se usuário é admin      |

#### Estrutura do User

```javascript
{
  id: "abc123",           // ID do usuário
  nome: "João Silva",     // Nome completo
  name: "João Silva",     // Alias (compatibilidade)
  email: "joao@email.com",// Email
  isAdmin: false,         // É administrador?
  empresa_id: 1,          // ID da empresa
  setor_id: 2,            // ID do setor
  ongId: "abc123",        // Alias legado
  ongName: "João Silva",  // Alias legado
}
```

#### Uso

```javascript
import { useAuth } from "../hooks/useAuth";

function MeuComponente() {
  const { user, isAuthenticated, login, logout, isAdmin } = useAuth();

  // Verificar se está logado
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Acessar dados do usuário
  console.log("Bem-vindo,", user.nome);

  // Fazer login
  const handleLogin = async (credentials) => {
    const { token, usuario } = await api.post("/auth/login", credentials);
    login(token, usuario);
  };

  // Fazer logout
  const handleLogout = () => {
    logout(); // Limpa tudo e redireciona
  };

  // Verificar se é admin
  if (isAdmin()) {
    return <AdminDashboard />;
  }

  return <UserDashboard />;
}
```

#### Fluxo de Login

```
1. Usuário preenche credenciais
        │
        ▼
2. Chamada API: POST /auth/login
        │
        ▼
3. Backend retorna { token, usuario }
        │
        ▼
4. login(token, usuario) é chamado
        │
        ├── Salva token no localStorage
        ├── Salva usuario no localStorage
        ├── Atualiza estado isAuthenticated = true
        └── Atualiza estado user = usuario
        │
        ▼
5. Componentes re-renderizam
```

#### Fluxo de Logout

```
1. logout() é chamado
        │
        ├── Desconecta Socket.IO
        ├── Limpa cacheService
        ├── Remove token do localStorage
        ├── Remove usuario do localStorage
        ├── Atualiza estado isAuthenticated = false
        ├── Atualiza estado user = null
        └── Redireciona para "/"
```

---

### useDataLoader

> **Propósito:** Carregar e gerenciar TODOS os dados da aplicação

#### Características

- ✅ Carrega dados em 10 etapas com progresso visual
- ✅ Usa cache para navegação instantânea
- ✅ Sincroniza via Socket.IO em tempo real
- ✅ Fornece funções CRUD locais

#### Retorno

| Propriedade         | Tipo           | Descrição                       |
| ------------------- | -------------- | ------------------------------- |
| **Estado**          |                |                                 |
| `loading`           | `boolean`      | Se está carregando              |
| `progress`          | `number`       | Porcentagem (0-100)             |
| `progressMessage`   | `string`       | Mensagem atual                  |
| `error`             | `string\|null` | Erro se houver                  |
| **Dados**           |                |                                 |
| `visitantes`        | `array`        | Lista de visitantes cadastrados |
| `empresas`          | `array`        | Empresas de visitantes          |
| `setores`           | `array`        | Setores de visitantes           |
| `responsaveis`      | `array`        | Responsáveis                    |
| `agendamentos`      | `array`        | Agendamentos                    |
| `tickets`           | `array`        | Tickets de suporte              |
| `funcionarios`      | `array`        | Funcionários                    |
| `userData`          | `object`       | Dados do usuário logado         |
| **Ações**           |                |                                 |
| `loadAllData`       | `function`     | Recarrega tudo                  |
| `reloadVisitantes`  | `function`     | Recarrega só visitantes         |
| `removeVisitante`   | `function`     | Remove visitante local          |
| `addVisitante`      | `function`     | Adiciona visitante local        |
| `updateVisitante`   | `function`     | Atualiza visitante local        |
| `clearAllData`      | `function`     | Limpa tudo                      |
| **Helpers**         |                |                                 |
| `isDataLoaded`      | `boolean`      | Se dados foram carregados       |
| `totalVisitantes`   | `number`       | Total de visitantes             |
| `isSocketConnected` | `boolean`      | Se socket está conectado        |

#### Etapas de Carregamento

```
┌────────────────────────────────────────────────────────────────┐
│                    PROGRESSO DE CARREGAMENTO                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [████████░░░░░░░░░░░░] 10% - Carregando empresas e setores... │
│  Rota: /empresas-visitantes, /setores-visitantes               │
│                                                                 │
│  [████████████░░░░░░░░] 20% - Carregando dados do usuário...   │
│  Rota: /usuarios/:id                                           │
│                                                                 │
│  [████████████████░░░░] 30% - Carregando responsáveis...       │
│  Rota: /visitantes/responsaveis                                │
│                                                                 │
│  [██████████████████░░] 45% - Carregando visitantes...         │
│  Rota: /cadastro-visitantes?limit=10000                        │
│                                                                 │
│  [███████████████████░] 55% - Carregando agendamentos...       │
│  Rota: /agendamentos                                           │
│                                                                 │
│  [████████████████████] 65% - Carregando tickets...            │
│  Rota: /tickets                                                │
│                                                                 │
│  [████████████████████] 75% - Carregando funcionários...       │
│  Rota: /funcionarios                                           │
│                                                                 │
│  [████████████████████] 85% - Carregando permissões...         │
│  Rota: /usuarios-papeis/me/permissoes                          │
│                                                                 │
│  [████████████████████] 95% - Carregando patch notes...        │
│  Rota: /patch-notes                                            │
│                                                                 │
│  [████████████████████] 100% - Conectando Socket.IO...         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Uso

```javascript
import { useDataLoader } from "../hooks/useDataLoader";
import { useAuth } from "../hooks/useAuth";

function Dashboard() {
  const { user } = useAuth();
  const {
    loading,
    progress,
    progressMessage,
    error,
    visitantes,
    empresas,
    setores,
    agendamentos,
    tickets,
    loadAllData,
  } = useDataLoader(user?.id);

  // Tela de carregamento
  if (loading) {
    return <LoadingScreen progress={progress} message={progressMessage} />;
  }

  // Tratamento de erro
  if (error) {
    return <ErrorScreen message={error} onRetry={() => loadAllData(true)} />;
  }

  // Usar dados
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total de visitantes: {visitantes.length}</p>
      <p>Agendamentos: {agendamentos.length}</p>
      <p>Tickets: {tickets.length}</p>
    </div>
  );
}
```

#### Eventos Socket.IO Escutados

| Evento                                | Ação                            |
| ------------------------------------- | ------------------------------- |
| `visitante:created`                   | Adiciona ao array de visitantes |
| `visitante:updated`                   | Atualiza visitante existente    |
| `visitante:deleted`                   | Remove do array de visitantes   |
| `empresa:created/updated/deleted`     | Gerencia empresas               |
| `setor:created/updated/deleted`       | Gerencia setores                |
| `agendamento:create/update/delete`    | Gerencia agendamentos           |
| `ticket:create/update/viewed`         | Gerencia tickets                |
| `funcionario:created/updated/deleted` | Gerencia funcionários           |

---

### usePermissoes

> **Propósito:** Verificar permissões de acesso do usuário

#### Retorno

| Propriedade          | Tipo       | Descrição              |
| -------------------- | ---------- | ---------------------- |
| `permissoes`         | `array`    | Lista de permissões    |
| `papeis`             | `array`    | Lista de papéis/roles  |
| `loading`            | `boolean`  | Se está carregando     |
| `temPermissao`       | `function` | Verifica uma permissão |
| `temAlgumaPermissao` | `function` | Verifica se tem alguma |
| `temTodasPermissoes` | `function` | Verifica se tem todas  |
| `isAdmin`            | `boolean`  | Se é administrador     |
| `recarregar`         | `function` | Recarrega permissões   |

#### Uso

```javascript
import { usePermissoes } from "../hooks/usePermissoes";

function AdminPanel() {
  const { loading, isAdmin, temPermissao, temAlgumaPermissao, papeis } =
    usePermissoes();

  if (loading) {
    return <Loading />;
  }

  // Verificar se é admin
  if (!isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div>
      {/* Mostrar botão apenas se tem permissão */}
      {temPermissao("empresa_criar") && <Button>Criar Empresa</Button>}

      {/* Mostrar se tem alguma das permissões */}
      {temAlgumaPermissao(["empresa_editar", "empresa_excluir"]) && (
        <Button>Gerenciar Empresas</Button>
      )}

      {/* Exibir papéis do usuário */}
      <p>Seus papéis: {papeis.join(", ")}</p>
    </div>
  );
}
```

#### Lista de Permissões Disponíveis

```javascript
// Empresas
"empresa_criar";
"empresa_editar";
"empresa_excluir";
"empresa_visualizar";

// Setores
"setor_criar";
"setor_editar";
"setor_excluir";
"setor_visualizar";

// Visitantes
"visitante_criar";
"visitante_editar";
"visitante_excluir";
"visitante_visualizar";

// Agendamentos
"agendamento_criar";
"agendamento_editar";
"agendamento_excluir";
"agendamento_confirmar";

// Tickets
"ticket_visualizar";
"ticket_responder";
"ticket_fechar";

// Funcionários
"funcionario_criar";
"funcionario_editar";
"funcionario_excluir";

// Descargas
"descarga_aprovar";
"descarga_rejeitar";
"descarga_visualizar";

// Usuários
"usuario_criar";
"usuario_editar";
"usuario_excluir";
```

---

### useSocket

> **Propósito:** Gerenciar conexão Socket.IO

#### Retorno

| Propriedade   | Tipo           | Descrição           |
| ------------- | -------------- | ------------------- |
| `isConnected` | `boolean`      | Se está conectado   |
| `socketId`    | `string\|null` | ID da conexão       |
| `on`          | `function`     | Registrar listener  |
| `off`         | `function`     | Remover listener    |
| `emit`        | `function`     | Emitir evento       |
| `joinRoom`    | `function`     | Entrar em uma sala  |
| `leaveRoom`   | `function`     | Sair de uma sala    |
| `socket`      | `Socket\|null` | Instância do socket |

#### Uso

```javascript
import { useSocket } from "../hooks/useSocket";

function ChatComponent() {
  const { isConnected, on, emit, joinRoom } = useSocket();

  // Status de conexão
  if (!isConnected) {
    return <p>Conectando ao servidor...</p>;
  }

  // Entrar em uma sala
  useEffect(() => {
    joinRoom(`chat_${conversaId}`);
  }, [conversaId, joinRoom]);

  // Escutar eventos
  useEffect(() => {
    const unsubscribe = on("nova_mensagem", (mensagem) => {
      setMensagens((prev) => [...prev, mensagem]);
    });

    return () => unsubscribe();
  }, [on]);

  // Emitir evento
  const enviarMensagem = (texto) => {
    emit("enviar_mensagem", {
      conversa_id: conversaId,
      texto,
    });
  };

  return <div>{/* Chat UI */}</div>;
}
```

---

## 📊 Diagrama de Dependências

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   ┌───────────────────────────────────────────────────────┐     │
│   │                      useAuth                           │     │
│   │                                                        │     │
│   │   Depende de:                                          │     │
│   │   • cacheService.clearCache()                          │     │
│   │   • socketService.disconnect()                         │     │
│   │   • localStorage                                       │     │
│   │                                                        │     │
│   │   Usado por:                                           │     │
│   │   • useDataLoader                                      │     │
│   │   • useSocket                                          │     │
│   │   • Todos os componentes autenticados                  │     │
│   └───────────────────────────────────────────────────────┘     │
│                          │                                       │
│                          ▼                                       │
│   ┌───────────────────────────────────────────────────────┐     │
│   │                    useDataLoader                       │     │
│   │                                                        │     │
│   │   Depende de:                                          │     │
│   │   • api.js (requisições HTTP)                          │     │
│   │   • socketService (listeners de eventos)               │     │
│   │   • cacheService (armazenamento)                       │     │
│   │                                                        │     │
│   │   Usado por:                                           │     │
│   │   • Todas as páginas que precisam de dados             │     │
│   └───────────────────────────────────────────────────────┘     │
│                          │                                       │
│           ┌──────────────┴──────────────┐                       │
│           ▼                             ▼                        │
│   ┌─────────────────┐         ┌─────────────────┐               │
│   │  usePermissoes  │         │    useSocket    │               │
│   │                 │         │                 │               │
│   │   Depende de:   │         │   Depende de:   │               │
│   │   • permissoes  │         │   • useAuth     │               │
│   │     Service.js  │         │   • socket      │               │
│   │                 │         │     Service.js  │               │
│   │   Usado por:    │         │                 │               │
│   │   • Componentes │         │   Usado por:    │               │
│   │     com acesso  │         │   • Chat        │               │
│   │     restrito    │         │   • Notificações│               │
│   └─────────────────┘         └─────────────────┘               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📌 Padrões de Uso

### Padrão 1: Página Protegida com Dados

```javascript
import { useAuth } from "../hooks/useAuth";
import { useDataLoader } from "../hooks/useDataLoader";
import { usePermissoes } from "../hooks/usePermissoes";

function PaginaProtegida() {
  const { user, isAuthenticated } = useAuth();
  const { visitantes, loading: loadingData } = useDataLoader(user?.id);
  const { temPermissao, loading: loadingPermissoes } = usePermissoes();

  // Verifica autenticação
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Aguarda carregamento
  if (loadingData || loadingPermissoes) {
    return <LoadingScreen />;
  }

  // Verifica permissão
  if (!temPermissao("visitante_visualizar")) {
    return <AccessDenied />;
  }

  // Renderiza página
  return <ListaVisitantes data={visitantes} />;
}
```

### Padrão 2: Componente com Socket Real-time

```javascript
import { useSocket } from "../hooks/useSocket";
import { useEffect, useState } from "react";

function NotificacoesRealTime() {
  const { on, isConnected } = useSocket();
  const [notificacoes, setNotificacoes] = useState([]);

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = on("nova_notificacao", (data) => {
      setNotificacoes((prev) => [data, ...prev]);
    });

    return () => unsubscribe();
  }, [on, isConnected]);

  return (
    <div>
      <span>{isConnected ? "🟢" : "🔴"}</span>
      {notificacoes.map((n) => (
        <NotificacaoItem key={n.id} data={n} />
      ))}
    </div>
  );
}
```

### Padrão 3: Botão com Verificação de Permissão

```javascript
import { usePermissoes } from "../hooks/usePermissoes";

function BotaoAcao({ permissaoRequerida, children, ...props }) {
  const { temPermissao, loading } = usePermissoes();

  if (loading) return null;
  if (!temPermissao(permissaoRequerida)) return null;

  return <Button {...props}>{children}</Button>;
}

// Uso
<BotaoAcao permissaoRequerida="empresa_criar" onClick={handleCriarEmpresa}>
  Nova Empresa
</BotaoAcao>;
```

---

## 🔐 Fluxo de Autenticação

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO COMPLETO DE LOGIN                       │
└─────────────────────────────────────────────────────────────────┘

     USUÁRIO                  FRONTEND                 BACKEND
        │                        │                        │
        │  1. Preenche login     │                        │
        │───────────────────────>│                        │
        │                        │                        │
        │                        │  2. POST /auth/login   │
        │                        │───────────────────────>│
        │                        │                        │
        │                        │  3. { token, usuario } │
        │                        │<───────────────────────│
        │                        │                        │
        │                        │  4. useAuth.login()    │
        │                        │  - Salva localStorage  │
        │                        │  - Atualiza estado     │
        │                        │                        │
        │                        │  5. useDataLoader      │
        │                        │  - Inicia carregamento │
        │                        │                        │
        │  6. Loading Screen     │                        │
        │<───────────────────────│                        │
        │  (progresso 0-100%)    │                        │
        │                        │                        │
        │                        │  7. Múltiplas APIs     │
        │                        │───────────────────────>│
        │                        │<───────────────────────│
        │                        │                        │
        │                        │  8. Salva no cache     │
        │                        │                        │
        │                        │  9. Conecta Socket.IO  │
        │                        │<====================>  │
        │                        │                        │
        │  10. Dashboard         │                        │
        │<───────────────────────│                        │
        │                        │                        │
```

---

## 📝 Notas Importantes

1. **Ordem de Providers no App.js:**

   ```jsx
   <AuthProvider>
     {" "}
     {/* Mais externo - autenticação */}
     <Router>
       <AgendamentoProvider>
         {" "}
         {/* Contextos específicos */}
         <TicketProvider>
           <DescargaProvider>
             <App />
           </DescargaProvider>
         </TicketProvider>
       </AgendamentoProvider>
     </Router>
   </AuthProvider>
   ```

2. **useDataLoader vs Contexts:**
   - `useDataLoader` = Dados gerais (visitantes, empresas, etc.)
   - `Contexts` = Contadores e notificações em tempo real

3. **Cache + Socket:**
   - Cache carrega dados iniciais
   - Socket mantém sincronizado

4. **Cleanup de Listeners:**
   - Sempre chamar `unsubscribe()` no cleanup do useEffect

---

## 🔗 Links Relacionados

- [Services Documentation](../services/README.md)
- [Contexts Documentation](../contexts/README.md)
- [Backend API Documentation](../../backend/README.md)

---

> **Mantido por:** Equipe de Desenvolvimento  
> **Contato:** suporte@sistema-visitante.com
