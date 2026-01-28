# 📊 Monitoramento de Requisições - Sistema Liberaê

Este documento explica como usar o **Request Monitor** para controlar o consumo de requisições do backend, essencial para gerenciar custos em servidor na nuvem.

---

## 📋 Visão Geral

O sistema possui um middleware de monitoramento que rastreia **todas as requisições** feitas ao backend, fornecendo estatísticas detalhadas sobre:

- **Total de requisições**
- **Requisições por endpoint**
- **Requisições por método HTTP** (GET, POST, PUT, DELETE)
- **Requisições por hora do dia**
- **Taxa de erros**
- **Tempo de uptime**
- **Média de requisições por minuto**

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Adicione no seu arquivo `.env.desenvolvimento` ou `.env.producao`:

```env
# Monitoramento de requisições (ESSENCIAL para controlar custos em nuvem)
COUNT_REQUESTS=true          # Ativa o monitoramento
LOG_REQUESTS=false           # Log individual de cada request (verbose)
ADMIN_STATS_KEY=sua_chave_aqui  # Chave para acessar as estatísticas
```

#### Gerar chave de admin:

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 2. Configuração Atual

| Ambiente        | COUNT_REQUESTS | LOG_REQUESTS | Status |
| --------------- | -------------- | ------------ | ------ |
| Desenvolvimento | ✅ true        | ❌ false     | Ativo  |
| Produção        | ✅ true        | ❌ false     | Ativo  |

---

## 🚀 Como Usar

### 1️⃣ Iniciar o Backend

```bash
cd backend
npm run dev   # Desenvolvimento
npm run prod  # Produção
```

### 2️⃣ Logs Automáticos (Console)

O sistema exibe logs automáticos **a cada 1 hora** no console do servidor:

```
═══════════════════════════════════════════════════════════════
📊 ESTATÍSTICAS DE REQUISIÇÕES
═══════════════════════════════════════════════════════════════
   Total: 1543 requisições
   Erros: 12 (0.78%)
   Média: 25.72 req/min
   Uptime: 1h 0m
═══════════════════════════════════════════════════════════════
```

### 3️⃣ Acessar Estatísticas via API

#### Endpoint:

```
GET http://localhost:3001/api/stats
```

#### Headers obrigatórios:

```
x-admin-key: sua_chave_configurada_no_env
```

#### Exemplo com cURL:

```bash
# Desenvolvimento
curl -H "x-admin-key: dev_admin_key_123" http://localhost:3001/api/stats

# Produção
curl -H "x-admin-key: seu_admin_key_producao" https://visitante.dimeexperience.com.br/api/stats
```

#### Exemplo com Postman:

1. Método: **GET**
2. URL: `http://localhost:3001/api/stats`
3. Headers:
   - Key: `x-admin-key`
   - Value: `dev_admin_key_123`

#### Exemplo de Resposta:

```json
{
  "total": 1543,
  "errors": 12,
  "errorRate": "0.78%",
  "avgPerMinute": "25.72",
  "uptime": "1h 0m",
  "byMethod": {
    "GET": 945,
    "POST": 432,
    "PUT": 123,
    "DELETE": 43
  },
  "topEndpoints": [
    { "endpoint": "/api/visitante", "count": 234 },
    { "endpoint": "/api/historico/:id", "count": 189 },
    { "endpoint": "/api/cadastro-visitante", "count": 156 },
    { "endpoint": "/api/dashboard/estatisticas-hoje", "count": 98 },
    { "endpoint": "/api/agendamentos", "count": 76 }
  ],
  "byHour": {
    "8": 45,
    "9": 123,
    "10": 234,
    "11": 198,
    "12": 145,
    "13": 167,
    "14": 234,
    "15": 198,
    "16": 156,
    "17": 43
  }
}
```

---

## 📊 Interpretação dos Dados

### Total de Requisições

- **Indica:** Volume total de chamadas à API
- **Útil para:** Estimar custos de servidor
- **Meta ideal:** Monitorar tendência de crescimento

### Taxa de Erros (Error Rate)

- **Indica:** Porcentagem de requisições com status HTTP 4xx ou 5xx
- **Útil para:** Identificar problemas de estabilidade
- **Meta ideal:** < 1%

### Média por Minuto (avgPerMinute)

- **Indica:** Quantas requisições por minuto em média
- **Útil para:** Dimensionar infraestrutura
- **Meta ideal:** Depende do seu plano de servidor

### Top Endpoints

- **Indica:** Endpoints mais acessados
- **Útil para:**
  - Identificar endpoints que podem ser otimizados
  - Detectar uso excessivo de recursos
  - Priorizar cache em endpoints mais usados

### Por Hora (byHour)

- **Indica:** Distribuição de requisições ao longo do dia
- **Útil para:**
  - Identificar horários de pico
  - Planejar manutenções em horários de menor uso
  - Dimensionar recursos por horário

---

## 💡 Casos de Uso

### 1. Controle de Custos (Servidor em Nuvem)

**Problema:** Preciso saber se estou dentro do limite do plano.

**Solução:**

1. Configure `COUNT_REQUESTS=true`
2. Acesse `/api/stats` periodicamente
3. Monitore o crescimento diário/semanal
4. Compare com o limite do seu plano

**Exemplo:**

```bash
# Verificar estatísticas atual
curl -H "x-admin-key: sua_chave" https://seu-servidor/api/stats

# Se total passar de 100.000 req/mês, considere otimizações
```

### 2. Identificar Endpoints para Otimização

**Problema:** Alguns endpoints são chamados excessivamente.

**Solução:**

1. Verifique `topEndpoints` no resultado
2. Identifique endpoints com muitas chamadas
3. Implemente cache para esses endpoints
4. Considere batching de requisições

**Exemplo:**

```json
"topEndpoints": [
  { "endpoint": "/api/visitante", "count": 5000 },  // ⚠️ Muito alto!
  { "endpoint": "/api/empresas", "count": 100 }     // ✅ Normal
]
```

**Ação:** Implementar cache Redis para `/api/visitante`

### 3. Detectar Tráfego Anormal

**Problema:** Suspeita de ataque ou uso indevido da API.

**Solução:**

1. Configure `LOG_REQUESTS=true` temporariamente
2. Monitore logs do console
3. Verifique `avgPerMinute` e `total`
4. Identifique padrões anormais

**Sinais de alerta:**

- ⚠️ `avgPerMinute` > 100 (depende do seu caso)
- ⚠️ `errorRate` > 5%
- ⚠️ Muitas requisições no mesmo endpoint em pouco tempo

### 4. Planejamento de Escalabilidade

**Problema:** Preciso saber quando escalar meu servidor.

**Solução:**

1. Monitore `avgPerMinute` ao longo do tempo
2. Trace uma tendência de crescimento
3. Estabeleça limites de alerta
4. Planeje escalabilidade antes de atingir o limite

**Métricas de referência:**

- **1-10 req/min:** Servidor básico (1 CPU, 512MB RAM)
- **10-50 req/min:** Servidor pequeno (2 CPU, 1GB RAM)
- **50-200 req/min:** Servidor médio (4 CPU, 2GB RAM)
- **> 200 req/min:** Considerar load balancer e cluster

---

## 🛠️ Configurações Avançadas

### Ajustar Intervalo de Log

Por padrão, logs são exibidos a cada **1 hora**. Para alterar:

Edite [backend/src/app.js](../backend/src/app.js):

```javascript
// Log a cada 30 minutos
startPeriodicLogging(30);

// Log a cada 2 horas
startPeriodicLogging(120);
```

### Logs Detalhados (Debug)

Para ver **cada requisição** individualmente no console:

```env
LOG_REQUESTS=true
```

**Exemplo de saída:**

```
📥 GET /api/visitante
✅ GET /api/visitante → 200 (45ms)
📥 POST /api/cadastro-visitante
✅ POST /api/cadastro-visitante → 201 (123ms)
📥 GET /api/dashboard/estatisticas-hoje
❌ GET /api/dashboard/estatisticas-hoje → 500 (5ms)
```

⚠️ **Atenção:** Isso gera MUITOS logs. Use apenas para debug temporário!

### Desativar Monitoramento (Não Recomendado)

Se por algum motivo você quiser desativar o monitoramento:

```env
COUNT_REQUESTS=false
```

---

## 🔒 Segurança

### Proteção do Endpoint de Estatísticas

O endpoint `/api/stats` é protegido por:

1. **Header obrigatório:** `x-admin-key`
2. **Validação de chave:** Compara com `ADMIN_STATS_KEY` do `.env`
3. **Exceção em dev:** Em desenvolvimento, não valida a chave

### Boas Práticas:

✅ **Use chaves fortes em produção**

```bash
# Gerar chave forte
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

✅ **Nunca commite o `.env` no Git**

- Arquivo já está no `.gitignore`

✅ **Rotacione a chave periodicamente**

- Troque `ADMIN_STATS_KEY` a cada 3-6 meses

❌ **Não exponha o endpoint publicamente**

- Não crie links diretos
- Não documente a chave em locais públicos

---

## 📈 Dashboard Futuro (Opcional)

Você pode criar uma página no frontend para visualizar essas estatísticas:

### Exemplo de Implementação:

```javascript
// frontend/src/pages/MonitoramentoStats/index.js
import { useState, useEffect } from "react";
import api from "../../services/api";

function MonitoramentoStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      const response = await api.get("/api/stats", {
        headers: {
          "x-admin-key": "sua_chave_aqui", // Ou buscar de .env
        },
      });
      setStats(response.data);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Atualiza a cada 1 min

    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div>Carregando...</div>;

  return (
    <div>
      <h1>📊 Estatísticas de Requisições</h1>
      <p>Total: {stats.total}</p>
      <p>Erros: {stats.errors}</p>
      <p>Taxa de Erro: {stats.errorRate}</p>
      <p>Média/min: {stats.avgPerMinute}</p>
      <p>Uptime: {stats.uptime}</p>

      <h2>Top Endpoints</h2>
      <ul>
        {stats.topEndpoints.map((item) => (
          <li key={item.endpoint}>
            {item.endpoint}: {item.count}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MonitoramentoStats;
```

---

## 🎯 Checklist de Uso

### Configuração Inicial

- [x] `COUNT_REQUESTS=true` no `.env`
- [x] `ADMIN_STATS_KEY` definida no `.env`
- [x] Backend reiniciado após alterações no `.env`

### Monitoramento Regular

- [ ] Verificar `/api/stats` semanalmente
- [ ] Analisar `topEndpoints` para otimizações
- [ ] Monitorar `errorRate` < 1%
- [ ] Acompanhar tendência de `avgPerMinute`

### Em Produção

- [ ] `COUNT_REQUESTS=true` ativado
- [ ] `LOG_REQUESTS=false` (economizar logs)
- [ ] `ADMIN_STATS_KEY` forte e única
- [ ] Logs periódicos funcionando no console

---

## 💰 Estimativa de Custos

### Exemplo: Servidor em Nuvem (AWS, DigitalOcean, etc.)

Baseado em uma média de **10.000 requisições/dia**:

| Requisições/Mês | Plano Recomendado | Custo Estimado  |
| --------------- | ----------------- | --------------- |
| < 100.000       | Básico (1GB RAM)  | $5 - $10/mês    |
| 100k - 500k     | Pequeno (2GB RAM) | $10 - $25/mês   |
| 500k - 1M       | Médio (4GB RAM)   | $25 - $50/mês   |
| > 1M            | Grande + Balancer | $50 - $100+/mês |

**Use o monitoramento para validar se está no plano adequado!**

---

## 📚 Referências

- [backend/src/middleware/requestMonitor.js](../backend/src/middleware/requestMonitor.js) - Código do middleware
- [backend/src/app.js](../backend/src/app.js) - Configuração e uso
- [COMO_FUNCIONA_AMBIENTES.md](COMO_FUNCIONA_AMBIENTES.md) - Configuração de ambientes

---

## 🆘 Troubleshooting

### Estatísticas não estão sendo contadas

**Causa:** `COUNT_REQUESTS=false` ou não definido

**Solução:**

```env
COUNT_REQUESTS=true
```

Reinicie o backend:

```bash
npm run dev   # ou npm run prod
```

### Erro 403 ao acessar /api/stats

**Causa:** Chave de admin incorreta ou ausente

**Solução:**

1. Verifique o header `x-admin-key`
2. Confirme que a chave está correta no `.env`
3. Em desenvolvimento, a validação é desabilitada

### Logs periódicos não aparecem

**Causa:** `startPeriodicLogging()` não foi chamado

**Solução:** Verifique se está configurado em [app.js](../backend/src/app.js):

```javascript
if (process.env.COUNT_REQUESTS === "true") {
  app.use(requestMonitor);
  startPeriodicLogging(60); // ← Deve estar presente
}
```

---

**Desenvolvido por Vitor Lohan**  
**Sistema Liberaê - DIME Experience**
