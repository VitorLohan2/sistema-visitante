/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MIDDLEWARE: Request Monitor
 * Monitora e contabiliza todas as requisições para controle de custos
 * ═══════════════════════════════════════════════════════════════════════════════
 */

let io = null;

// Referência lazy para funções do socket (evita dependência circular)
let socketModule = null;

/**
 * Obtém funções do socket de forma lazy
 */
function getSocketFunctions() {
  if (!socketModule) {
    try {
      socketModule = require("../socket");
    } catch (error) {
      console.warn(
        "⚠️ Não foi possível carregar módulo socket:",
        error.message,
      );
      socketModule = {
        getUsuariosOnline: () => [],
        getIPsDeUsuariosLogados: () => [],
      };
    }
  }
  return socketModule;
}

// Contadores de requisições
const requestStats = {
  total: 0,
  byEndpoint: {},
  byEndpointWithMethod: {}, // Rastrear endpoint com método
  byMethod: {},
  byHour: {},
  byIP: {}, // Novo: rastrear por IP
  byUser: {}, // Novo: rastrear por usuário
  startTime: new Date(),
  errors: 0,
  errorsByEndpoint: {}, // Rastrear erros por endpoint
  recentRequests: [], // Novo: últimas requisições detalhadas
};

/**
 * Define a instância do Socket.IO
 */
function setSocketIO(socketInstance) {
  io = socketInstance;
}

/**
 * Emite estatísticas via Socket.IO
 */
function emitStats() {
  if (io) {
    const stats = getStats();
    io.to("global").emit("request:stats", stats);
  }
}

/**
 * Middleware que monitora requisições
 */
function requestMonitor(req, res, next) {
  const startTime = Date.now();
  const endpoint = req.path;
  const method = req.method;
  // Usa timezone de Brasília para garantir consistência entre ambientes
  const hour = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hour12: false,
  });
  const hourInt = parseInt(hour, 10);

  // Captura IP (considera proxies)
  const clientIP =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown";

  // Captura User ID (se autenticado via JWT)
  let userId = null;
  let userName = null;
  try {
    // Tenta extrair do token JWT se existir
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const jwt = require("jsonwebtoken");
      const decoded = jwt.decode(token); // Apenas decodifica, não verifica
      if (decoded) {
        userId = decoded.id || decoded.userId || decoded.sub;
        userName = decoded.nome || decoded.name || decoded.email;
      }
    }
    // Também pode estar em req.user se o middleware de auth já processou
    if (!userId && req.user) {
      userId = req.user.id;
      userName = req.user.nome || req.user.name;
    }
  } catch (e) {
    // Ignora erros de decodificação
  }

  // Ignora requisições de assets, socket.io, polling e monitoramento
  const shouldIgnore =
    endpoint.startsWith("/socket.io") ||
    endpoint.startsWith("/uploads") ||
    endpoint.startsWith("/static") ||
    endpoint === "/api/stats" || // Não conta requisições de monitoramento
    endpoint === "/api/dashboard/auth" || // Não conta auth do dashboard
    method === "OPTIONS"; // Não conta preflight CORS

  if (shouldIgnore) {
    return next();
  }

  // Incrementa contadores
  requestStats.total++;
  requestStats.byMethod[method] = (requestStats.byMethod[method] || 0) + 1;
  requestStats.byHour[hourInt] = (requestStats.byHour[hourInt] || 0) + 1;

  // Rastreia por IP
  if (!requestStats.byIP[clientIP]) {
    requestStats.byIP[clientIP] = {
      ip: clientIP,
      count: 0,
      lastRequest: null,
      endpoints: {},
    };
  }
  requestStats.byIP[clientIP].count++;
  requestStats.byIP[clientIP].lastRequest = new Date();

  // Rastreia por usuário (se autenticado)
  if (userId) {
    if (!requestStats.byUser[userId]) {
      requestStats.byUser[userId] = {
        userId: userId,
        userName: userName || "Desconhecido",
        count: 0,
        lastRequest: null,
        ips: new Set(),
      };
    }
    requestStats.byUser[userId].count++;
    requestStats.byUser[userId].lastRequest = new Date();
    requestStats.byUser[userId].ips.add(clientIP);
    if (userName) requestStats.byUser[userId].userName = userName;
  }

  // Agrupa por endpoint (sem IDs dinâmicos)
  const normalizedEndpoint = endpoint
    .replace(/\/[0-9a-f-]{36}/gi, "/:id") // UUIDs
    .replace(/\/\d+/g, "/:id"); // Números

  requestStats.byEndpoint[normalizedEndpoint] =
    (requestStats.byEndpoint[normalizedEndpoint] || 0) + 1;

  // Atualiza endpoints por IP
  requestStats.byIP[clientIP].endpoints[normalizedEndpoint] =
    (requestStats.byIP[clientIP].endpoints[normalizedEndpoint] || 0) + 1;

  // Rastreia endpoint com método HTTP
  const endpointKey = `${method}:${normalizedEndpoint}`;
  if (!requestStats.byEndpointWithMethod[endpointKey]) {
    requestStats.byEndpointWithMethod[endpointKey] = {
      method,
      endpoint: normalizedEndpoint,
      count: 0,
    };
  }
  requestStats.byEndpointWithMethod[endpointKey].count++;

  // Adiciona às requisições recentes (mantém últimas 100)
  const requestInfo = {
    timestamp: new Date(),
    method,
    endpoint: normalizedEndpoint,
    originalEndpoint: endpoint,
    ip: clientIP,
    userId: userId,
    userName: userName,
    status: null, // Será preenchido na resposta
    duration: null,
  };

  // Log de requisição (apenas se LOG_REQUESTS=true)
  if (process.env.LOG_REQUESTS === "true") {
    console.log(`📥 ${method} ${endpoint}`);
  }

  // Intercepta a resposta para medir tempo e status
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - startTime;

    // Atualiza info da requisição recente
    requestInfo.status = res.statusCode;
    requestInfo.duration = duration;

    // Adiciona às requisições recentes (limita a 100)
    requestStats.recentRequests.unshift(requestInfo);
    if (requestStats.recentRequests.length > 100) {
      requestStats.recentRequests = requestStats.recentRequests.slice(0, 100);
    }

    if (res.statusCode >= 400) {
      requestStats.errors++;

      // Registra erro por endpoint
      if (!requestStats.errorsByEndpoint[normalizedEndpoint]) {
        requestStats.errorsByEndpoint[normalizedEndpoint] = {
          count: 0,
          lastError: null,
          method: method,
        };
      }
      requestStats.errorsByEndpoint[normalizedEndpoint].count++;
      requestStats.errorsByEndpoint[normalizedEndpoint].lastError = {
        status: res.statusCode,
        timestamp: new Date(),
      };

      // Emite evento de erro
      if (io) {
        io.to("global").emit("request:error", {
          endpoint: normalizedEndpoint,
          method: method,
          status: res.statusCode,
          timestamp: new Date(),
        });
      }
    }

    // Emite estatísticas atualizadas a cada 10 requisições
    if (requestStats.total % 10 === 0) {
      emitStats();
    }

    // Log detalhado (apenas se LOG_REQUESTS=true)
    if (process.env.LOG_REQUESTS === "true") {
      const status = res.statusCode;
      const emoji = status >= 400 ? "❌" : "✅";
      console.log(`${emoji} ${method} ${endpoint} → ${status} (${duration}ms)`);
    }

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Retorna estatísticas de requisições
 */
function getStats(includeDetails = false) {
  const uptime = Math.floor((Date.now() - requestStats.startTime) / 1000);
  const avgPerMinute = requestStats.total / (uptime / 60) || 0;

  // Top 10 endpoints mais acessados COM método HTTP
  const topEndpoints = Object.values(requestStats.byEndpointWithMethod)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((item) => ({
      endpoint: item.endpoint,
      method: item.method,
      count: item.count,
    }));

  // Top 5 endpoints com mais erros
  const topErrors = Object.entries(requestStats.errorsByEndpoint)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([endpoint, data]) => ({
      endpoint,
      count: data.count,
      method: data.method,
      lastError: data.lastError,
    }));

  // ═══════════════════════════════════════════════════════════════════════
  // TOP IPs - AGORA MOSTRA APENAS IPs DE USUÁRIOS LOGADOS/CONECTADOS
  // ═══════════════════════════════════════════════════════════════════════
  let topIPs = [];
  try {
    const { getIPsDeUsuariosLogados } = getSocketFunctions();
    const ipsDeLogados = getIPsDeUsuariosLogados();
    topIPs = ipsDeLogados
      .sort((a, b) => b.usersCount - a.usersCount)
      .slice(0, 10)
      .map((item) => ({
        ip: item.ip,
        count: item.usersCount, // Quantidade de usuários neste IP
        users: item.users, // Lista de nomes de usuários
        lastActivity: item.lastActivity,
      }));
  } catch (error) {
    // Se houver erro ao obter do socket, usa o método antigo
    topIPs = Object.values(requestStats.byIP)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item) => ({
        ip: item.ip,
        count: item.count,
        lastRequest: item.lastRequest,
        topEndpoint:
          Object.entries(item.endpoints).sort((a, b) => b[1] - a[1])[0]?.[0] ||
          null,
      }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TOP USERS - AGORA MOSTRA APENAS USUÁRIOS ONLINE (conectados via socket)
  // ═══════════════════════════════════════════════════════════════════════
  let topUsers = [];
  let onlineUsersCount = 0;
  try {
    const { getUsuariosOnline } = getSocketFunctions();
    const usuariosOnline = getUsuariosOnline();
    onlineUsersCount = usuariosOnline.length;
    topUsers = usuariosOnline
      .sort((a, b) => new Date(b.connectedAt) - new Date(a.connectedAt))
      .slice(0, 10)
      .map((item) => ({
        userId: item.userId,
        userName: item.userName || item.userEmail || "Usuário",
        userEmail: item.userEmail,
        ip: item.ip,
        isAdmin: item.isAdmin,
        connectedAt: item.connectedAt,
        socketCount: item.socketCount, // Número de abas abertas
        status: "online", // Sempre online porque está conectado
      }));
  } catch (error) {
    // Se houver erro, retorna lista vazia
    topUsers = [];
    onlineUsersCount = 0;
  }

  // Classificação do consumo (baixo/médio/alto)
  let consumptionLevel = "baixo";
  if (avgPerMinute > 50) {
    consumptionLevel = "alto";
  } else if (avgPerMinute > 20) {
    consumptionLevel = "médio";
  }

  const stats = {
    total: requestStats.total,
    errors: requestStats.errors,
    errorRate:
      requestStats.total > 0
        ? ((requestStats.errors / requestStats.total) * 100).toFixed(2) + "%"
        : "0.00%",
    avgPerMinute: parseFloat(avgPerMinute.toFixed(2)),
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    uptimeSeconds: uptime,
    byMethod: requestStats.byMethod,
    topEndpoints,
    topErrors,
    topIPs,
    topUsers,
    byHour: requestStats.byHour,
    consumptionLevel,
    uniqueIPs: topIPs.length, // IPs de usuários online
    uniqueUsers: onlineUsersCount, // Usuários online
    // Contadores históricos (para referência)
    historicalIPs: Object.keys(requestStats.byIP).length,
    historicalUsers: Object.keys(requestStats.byUser).length,
  };

  // Inclui detalhes extras se solicitado (requisições recentes)
  if (includeDetails) {
    stats.recentRequests = requestStats.recentRequests.slice(0, 50);
  }

  return stats;
}

/**
 * Retorna estatísticas detalhadas (com requisições recentes)
 */
function getDetailedStats() {
  return getStats(true);
}

/**
 * Reseta os contadores
 */
function resetStats() {
  requestStats.total = 0;
  requestStats.byEndpoint = {};
  requestStats.byEndpointWithMethod = {};
  requestStats.byMethod = {};
  requestStats.byHour = {};
  requestStats.byIP = {};
  requestStats.byUser = {};
  requestStats.errors = 0;
  requestStats.errorsByEndpoint = {};
  requestStats.recentRequests = [];
  requestStats.startTime = new Date();

  // Emite reset via socket
  emitStats();
}

/**
 * Log periódico de estatísticas (opcional)
 */
function startPeriodicLogging(intervalMinutes = 60) {
  setInterval(
    () => {
      const stats = getStats();
      console.log(
        "\n═══════════════════════════════════════════════════════════════",
      );
      console.log("📊 ESTATÍSTICAS DE REQUISIÇÕES");
      console.log(
        "═══════════════════════════════════════════════════════════════",
      );
      console.log(`   Total: ${stats.total} requisições`);
      console.log(`   Erros: ${stats.errors} (${stats.errorRate})`);
      console.log(`   Média: ${stats.avgPerMinute} req/min`);
      console.log(`   Uptime: ${stats.uptime}`);
      console.log(
        "═══════════════════════════════════════════════════════════════\n",
      );
    },
    intervalMinutes * 60 * 1000,
  );
}

module.exports = {
  requestMonitor,
  getStats,
  getDetailedStats,
  resetStats,
  startPeriodicLogging,
  setSocketIO,
  emitStats,
};
