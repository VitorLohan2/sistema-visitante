const express = require("express");
const cors = require("cors");
const path = require("path");

// Importar rotas da nova estrutura
const routes = require("./routes/index");

// Monitor de requisições
const {
  requestMonitor,
  getStats,
  getDetailedStats,
  startPeriodicLogging,
} = require("./middleware/requestMonitor");

// Autenticação do Dashboard
const {
  verifyDashboardPassword,
  generateDashboardToken,
  requireDashboardAuth,
  generatePasswordAndHash,
} = require("./middleware/dashboardAuth");

const app = express();

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE CORS
// ═══════════════════════════════════════════════════════════════
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [
      "http://localhost:3000", // Frontend local
      "http://localhost:3002", // Frontend local (porta alternativa)
      "http://localhost:3707", // Docker
      "https://sistema-visitante.vercel.app", // Produção
      "https://visitante.dimeexperience.com.br", // Produção
    ];

// CORS - Permite todas as origens em desenvolvimento
app.use(
  cors({
    origin: function (origin, callback) {
      // Permite requisições sem origin (como mobile apps ou curl)
      if (!origin) return callback(null, true);

      // Em desenvolvimento e teste, permite qualquer origem
      if (
        process.env.NODE_ENV === "desenvolvimento" ||
        process.env.NODE_ENV === "development" ||
        process.env.NODE_ENV === "docker" ||
        process.env.NODE_ENV === "teste"
      ) {
        return callback(null, true);
      }

      // Em produção, verifica a lista de origens permitidas
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }

      return callback(new Error("Bloqueado pelo CORS"), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-chat-token",
      "x-admin-key",
    ],
    credentials: true,
  }),
);

// Preflight OPTIONS para todas as rotas
app.options("*", cors());

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARES
// ═══════════════════════════════════════════════════════════════
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));

// Monitor de requisições (ativa se COUNT_REQUESTS=true no .env)
if (process.env.COUNT_REQUESTS === "true") {
  app.use(requestMonitor);
  // Log de estatísticas a cada 1 hora
  startPeriodicLogging(60);
}

// ═══════════════════════════════════════════════════════════════
// ROTA DE ESTATÍSTICAS (protegida, apenas para admins)
// ═══════════════════════════════════════════════════════════════
app.get("/api/stats", (req, res) => {
  // Verifica se tem token de admin (simples, pode melhorar)
  const adminKey = req.headers["x-admin-key"];

  // Em desenvolvimento/docker, aceita qualquer chave ou sem chave
  const isDevelopment =
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "desenvolvimento" ||
    process.env.NODE_ENV === "docker" ||
    process.env.NODE_ENV === "teste";

  if (!isDevelopment && adminKey !== process.env.ADMIN_STATS_KEY) {
    return res.status(403).json({ error: "Acesso negado" });
  }

  // Se pedir detalhes, retorna dados completos
  const includeDetails = req.query.details === "true";
  res.json(includeDetails ? getDetailedStats() : getStats());
});

// ═══════════════════════════════════════════════════════════════
// AUTENTICAÇÃO DO DASHBOARD (senha extra de segurança)
// ═══════════════════════════════════════════════════════════════

// Rota para autenticar no Dashboard
app.post("/api/dashboard/auth", async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      error: "Senha não informada",
      code: "PASSWORD_REQUIRED",
    });
  }

  try {
    const isValid = await verifyDashboardPassword(password);

    if (!isValid) {
      // Log de tentativa falha
      console.warn(
        `⚠️ Tentativa de acesso ao Dashboard falhou - IP: ${req.ip}`,
      );
      return res.status(401).json({
        error: "Senha incorreta",
        code: "INVALID_PASSWORD",
      });
    }

    // Gera token de sessão
    const token = generateDashboardToken(req.ip, req.headers["user-agent"]);

    console.log(`✅ Acesso ao Dashboard autorizado - IP: ${req.ip}`);

    res.json({
      success: true,
      token,
      expiresIn: "8h",
    });
  } catch (error) {
    console.error("Erro na autenticação do Dashboard:", error);
    res.status(500).json({
      error: "Erro interno",
      code: "AUTH_ERROR",
    });
  }
});

// Rota para verificar se token do Dashboard é válido
app.get("/api/dashboard/verify", requireDashboardAuth, (req, res) => {
  res.json({
    valid: true,
    expiresAt: req.dashboardAuth?.exp
      ? new Date(req.dashboardAuth.exp * 1000)
      : null,
  });
});

// Rota para gerar senha (apenas em desenvolvimento)
app.get("/api/dashboard/generate-password", (req, res) => {
  const isDevelopment =
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "desenvolvimento" ||
    process.env.NODE_ENV === "docker";

  if (!isDevelopment) {
    return res.status(403).json({ error: "Não disponível em produção" });
  }

  const { password, hash } = generatePasswordAndHash();
  res.json({
    password,
    hash,
    instructions:
      "Adicione DASHBOARD_PASSWORD_HASH ao seu .env com o valor do hash",
  });
});

// ═══════════════════════════════════════════════════════════════
// ROTAS DA API
// ═══════════════════════════════════════════════════════════════
app.use(routes);

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE DE ERRO - Rota não encontrada
// ═══════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  res.status(404).json({
    error: "Rota não encontrada",
    path: req.path,
    method: req.method,
  });
});

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE DE ERRO - Erros gerais
// ═══════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error("❌ Erro na aplicação:", err);

  res.status(err.status || 500).json({
    error: err.message || "Erro interno do servidor",
    code: err.code || "INTERNAL_ERROR",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
