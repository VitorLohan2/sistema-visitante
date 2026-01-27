/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MIDDLEWARE: Request Monitor
 * Monitora e contabiliza todas as requisições para controle de custos
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Contadores de requisições
const requestStats = {
  total: 0,
  byEndpoint: {},
  byMethod: {},
  byHour: {},
  startTime: new Date(),
  errors: 0,
};

/**
 * Middleware que monitora requisições
 */
function requestMonitor(req, res, next) {
  const startTime = Date.now();
  const endpoint = req.path;
  const method = req.method;
  const hour = new Date().getHours();

  // Incrementa contadores
  requestStats.total++;
  requestStats.byMethod[method] = (requestStats.byMethod[method] || 0) + 1;
  requestStats.byHour[hour] = (requestStats.byHour[hour] || 0) + 1;

  // Agrupa por endpoint (sem IDs dinâmicos)
  const normalizedEndpoint = endpoint
    .replace(/\/[0-9a-f-]{36}/gi, "/:id") // UUIDs
    .replace(/\/\d+/g, "/:id"); // Números

  requestStats.byEndpoint[normalizedEndpoint] =
    (requestStats.byEndpoint[normalizedEndpoint] || 0) + 1;

  // Log de requisição (apenas se LOG_REQUESTS=true)
  if (process.env.LOG_REQUESTS === "true") {
    console.log(`📥 ${method} ${endpoint}`);
  }

  // Intercepta a resposta para medir tempo e status
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - startTime;

    if (res.statusCode >= 400) {
      requestStats.errors++;
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
function getStats() {
  const uptime = Math.floor((Date.now() - requestStats.startTime) / 1000);
  const avgPerMinute = requestStats.total / (uptime / 60) || 0;

  // Top 10 endpoints mais acessados
  const topEndpoints = Object.entries(requestStats.byEndpoint)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));

  return {
    total: requestStats.total,
    errors: requestStats.errors,
    errorRate:
      ((requestStats.errors / requestStats.total) * 100).toFixed(2) + "%",
    avgPerMinute: avgPerMinute.toFixed(2),
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    byMethod: requestStats.byMethod,
    topEndpoints,
    byHour: requestStats.byHour,
  };
}

/**
 * Reseta os contadores
 */
function resetStats() {
  requestStats.total = 0;
  requestStats.byEndpoint = {};
  requestStats.byMethod = {};
  requestStats.byHour = {};
  requestStats.errors = 0;
  requestStats.startTime = new Date();
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
  resetStats,
  startPeriodicLogging,
};
