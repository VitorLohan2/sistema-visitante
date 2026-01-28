# 📊 Monitoramento de Requisições no Dashboard - Implementado

## ✅ O que foi implementado

### 1. **Backend - Socket.IO em Tempo Real**

#### Modificações em `requestMonitor.js`:

- ✅ Adicionado rastreamento de erros por endpoint
- ✅ Emissão de eventos via Socket.IO quando há mudanças nas estatísticas
- ✅ Evento `request:stats` - Emitido a cada 10 requisições
- ✅ Evento `request:error` - Emitido quando ocorre um erro
- ✅ Classificação automática do consumo (baixo/médio/alto)
- ✅ Top 5 endpoints com mais erros

#### Modificações em `socket.js`:

- ✅ Integração do requestMonitor com Socket.IO
- ✅ Eventos transmitidos para sala "global"

---

### 2. **Frontend - Componente de Monitoramento**

#### Novo componente: `MonitoramentoRequisicoes`

Localização: `frontend/src/components/MonitoramentoRequisicoes/`

**Funcionalidades:**

✅ **Card Principal de Estatísticas**

- Total de Requisições (atualizado em tempo real)
- Quantidade de Erros com taxa percentual
- Média de requisições por minuto
- Nível de Consumo (🟢 Baixo / 🟡 Médio / 🔴 Alto)
- Badge "Tempo Real" animado
- Uptime do servidor

✅ **Gráfico de Métodos HTTP**

- Barra de gráfico mostrando distribuição por método (GET, POST, PUT, DELETE)
- Cores diferenciadas por método

✅ **Card de Erros por Endpoint**

- Lista dos 5 endpoints com mais erros
- Exibe método HTTP, endpoint, quantidade de erros
- Status do último erro e timestamp
- Design visual destacado em vermelho

✅ **Barra de Indicador de Consumo**

- Barra de progresso visual
- Marcação de zonas: Baixo (0-20), Médio (20-50), Alto (50+)
- Porcentagem do consumo atual
- Cores dinâmicas baseadas no nível

---

### 3. **Integração no Dashboard Principal**

- ✅ Componente integrado no `Dashboard/index.js`
- ✅ Posicionado após os gráficos de visitantes e cadastros
- ✅ Atualização automática via Socket.IO
- ✅ Design responsivo e consistente com o dashboard

---

## 🎨 Design e UX

### Cores e Indicadores:

- **🟢 Baixo:** Verde (#10b981) - 0-20 req/min
- **🟡 Médio:** Amarelo (#f59e0b) - 20-50 req/min
- **🔴 Alto:** Vermelho (#ef4444) - 50+ req/min

### Animações:

- ✅ Badge "Tempo Real" com pulse animation
- ✅ Cards com hover effect (elevação)
- ✅ Barra de consumo com transição suave
- ✅ Indicador de consumo com pulse suave

### Responsividade:

- ✅ Grid adaptativo para mobile
- ✅ Cards empilhados em telas pequenas
- ✅ Gráficos redimensionáveis

---

## 🚀 Como Usar

### 1. Iniciar Backend e Frontend

```bash
# Terminal 1 - Backend
cd backend
npm run dev  # ou npm run prod

# Terminal 2 - Frontend
cd frontend
npm start
```

### 2. Acessar Dashboard

1. Faça login no sistema
2. Navegue até o Dashboard
3. Role até o final da página
4. Veja o **Monitoramento de Requisições** em tempo real

### 3. Testar Atualizações em Tempo Real

Para ver as estatísticas atualizando:

1. **Navegue pelo sistema** - Cada página que você visita faz requisições
2. **Cadastre visitantes** - Gera requisições POST
3. **Liste dados** - Gera requisições GET
4. **Veja os números atualizando automaticamente** no Dashboard

Para testar erros (endpoints inexistentes):

```bash
# No terminal ou Postman
curl http://localhost:3001/api/endpoint-inexistente
```

---

## 📋 Variáveis de Ambiente

### Backend (`.env.desenvolvimento` / `.env.producao`):

```env
# Monitoramento de requisições
COUNT_REQUESTS=true
LOG_REQUESTS=false
ADMIN_STATS_KEY=dev_admin_key_123
```

### Frontend (`.env.desenvolvimento` / `.env.producao`):

```env
# Chave de admin para acessar estatísticas
REACT_APP_ADMIN_STATS_KEY=dev_admin_key_123
```

⚠️ **Importante:** Gere chaves fortes para produção:

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

## 🔧 Estrutura dos Eventos Socket.IO

### 1. `request:stats`

Emitido a cada **10 requisições**

```javascript
{
  total: 1543,
  errors: 12,
  errorRate: "0.78%",
  avgPerMinute: 25.72,
  uptime: "1h 30m",
  uptimeSeconds: 5400,
  consumptionLevel: "médio",
  byMethod: {
    GET: 945,
    POST: 432,
    PUT: 123,
    DELETE: 43
  },
  topEndpoints: [
    { endpoint: "/api/visitante", count: 234 },
    { endpoint: "/api/historico/:id", count: 189 }
  ],
  topErrors: [
    {
      endpoint: "/api/endpoint-inexistente",
      count: 5,
      method: "GET",
      lastError: {
        status: 404,
        timestamp: "2026-01-28T15:30:00.000Z"
      }
    }
  ],
  byHour: { "8": 45, "9": 123, "10": 234 }
}
```

### 2. `request:error`

Emitido **imediatamente** quando ocorre um erro

```javascript
{
  endpoint: "/api/visitante/:id",
  method: "GET",
  status: 404,
  timestamp: "2026-01-28T15:30:00.000Z"
}
```

---

## 📊 Interpretação dos Dados

### **Total de Requisições**

- Mostra quantas chamadas à API foram feitas desde o início do servidor
- Útil para: Estimar custos, dimensionar recursos

### **Erros e Taxa de Erro**

- Quantidade de requisições com status HTTP 4xx ou 5xx
- Taxa ideal: **< 1%**
- Se > 5%: Investigar problemas de estabilidade

### **Média por Minuto**

- Requisições/minuto em média
- **0-20 req/min:** Baixo (🟢)
- **20-50 req/min:** Médio (🟡)
- **50+ req/min:** Alto (🔴)

### **Nível de Consumo**

Classificação automática baseada na média:

- **Baixo:** Servidor básico suficiente
- **Médio:** Considerar servidor pequeno/médio
- **Alto:** Planejar escalabilidade, considerar load balancer

### **Endpoints com Erros**

- Identifica quais rotas têm mais problemas
- Útil para: Priorizar correções, otimizações

---

## 🎯 Casos de Uso

### 1. **Controle de Custos (Servidor em Nuvem)**

Monitore o total de requisições para não ultrapassar limites do plano.

**Exemplo:**

- Plano permite 100.000 req/mês
- Dashboard mostra 85.000 requisições
- Ação: Otimizar endpoints mais usados ou aumentar plano

### 2. **Identificar Endpoints para Otimização**

Veja quais endpoints são mais chamados e implemente cache.

**Exemplo:**

- `/api/visitante` tem 5.000 chamadas
- `/api/empresas` tem 100 chamadas
- Ação: Implementar cache para `/api/visitante`

### 3. **Detectar Problemas de Estabilidade**

Taxa de erro alta indica problemas que precisam ser corrigidos.

**Exemplo:**

- Taxa de erro: 8%
- Endpoint problemático: `/api/historico/:id`
- Ação: Investigar por que está falhando

### 4. **Planejamento de Escalabilidade**

Monitore tendência de crescimento para planejar upgrades.

**Exemplo:**

- Média atual: 15 req/min
- Crescimento: +5 req/min por semana
- Ação: Planejar upgrade antes de atingir 50 req/min

---

## 🔒 Segurança

- ✅ Endpoint `/api/stats` protegido por chave de admin
- ✅ Socket.IO requer autenticação JWT
- ✅ Eventos transmitidos apenas para sala "global" (usuários autenticados)
- ✅ Chaves não commitadas no Git (`.gitignore`)

---

## 📱 Responsividade

O componente é **totalmente responsivo**:

- **Desktop:** Grid de 4 colunas nos cards principais
- **Tablet:** Grid de 2 colunas
- **Mobile:** Coluna única, cards empilhados
- **Gráficos:** Altura ajustada automaticamente

---

## 🐛 Troubleshooting

### Estatísticas não atualizam em tempo real

**Causa:** Socket.IO não conectado

**Solução:**

1. Verifique se o backend está rodando
2. Verifique se `COUNT_REQUESTS=true` no `.env`
3. Abra o console do navegador e procure por erros de socket
4. Reinicie backend e frontend

### Erro 403 ao carregar estatísticas

**Causa:** Chave de admin incorreta

**Solução:**

1. Verifique `REACT_APP_ADMIN_STATS_KEY` no `.env` do frontend
2. Verifique `ADMIN_STATS_KEY` no `.env` do backend
3. Certifique-se que as chaves são iguais
4. Reinicie o frontend após alterar `.env`

### Componente não aparece no Dashboard

**Causa:** Permissão de acesso ao dashboard

**Solução:**

1. Verifique se o usuário tem permissão `dashboard_visualizar`
2. Usuários ADMIN têm acesso automático
3. Verifique no banco de dados: tabela `papeis_permissoes`

---

## 🎉 Resultado Final

Você agora tem um **sistema completo de monitoramento de requisições** integrado ao Dashboard com:

✅ Estatísticas em **tempo real**  
✅ Visualização de **consumo** (baixo/médio/alto)  
✅ **Gráficos interativos** de métodos HTTP  
✅ **Detecção de erros** por endpoint  
✅ **Barra de progresso** de consumo  
✅ Design **profissional e responsivo**  
✅ **Atualizações automáticas** via Socket.IO

Perfeito para **controlar custos** e **monitorar performance** do seu servidor em nuvem! 🚀

---

**Desenvolvido por Vitor Lohan**  
**Sistema Liberaê - DIME Experience**
