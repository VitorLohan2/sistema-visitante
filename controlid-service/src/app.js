const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const logger = require("./config/logger");
const { authMiddleware, errorHandler } = require("./middleware");
const {
  deviceRoutes,
  userRoutes,
  accessRoutes,
  actionRoutes,
  logRoutes,
} = require("./routes");
const { DeviceMonitorService } = require("./services");
const {
  DeviceRepository,
  SessionRepository,
  OperationLogRepository,
  DEVICE_MODELS,
} = require("./repositories");

const app = express();

// ===========================================
// MIDDLEWARES GLOBAIS
// ===========================================

// Segurança
app.use(helmet());

// CORS (apenas para backend principal)
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "x-api-key"],
  }),
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: "Muitas requisições. Tente novamente mais tarde.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});
app.use(limiter);

// Parser de JSON
app.use(express.json({ limit: "10mb" }));

// Logs de requisições (apenas em desenvolvimento)
if (config.env !== "production") {
  app.use(morgan("dev"));
}

// ===========================================
// ROTAS PÚBLICAS (sem autenticação)
// ===========================================

/**
 * GET /health
 * Health check do serviço
 */
app.get("/health", (req, res) => {
  const deviceRepo = new DeviceRepository();
  const statusSummary = DeviceMonitorService.getStatusSummary();

  res.json({
    success: true,
    status: "healthy",
    service: "controlid-service",
    version: require("../package.json").version,
    timestamp: new Date().toISOString(),
    devices: statusSummary,
  });
});

/**
 * GET /
 * Informações do serviço
 */
app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "Control iD Integration Service",
    version: require("../package.json").version,
    description:
      "Microserviço para integração com equipamentos Control iD - Controle de Acesso",
    documentation: "https://www.controlid.com.br/docs/access-api-pt/",
    supportedModels: Object.values(DEVICE_MODELS),
    endpoints: {
      health: "GET /health",
      devices: "GET/POST /api/devices",
      users: "GET/POST /api/devices/:id/users",
      cards: "GET/POST /api/devices/:id/cards",
      uhfTags: "GET/POST /api/devices/:id/uhf-tags",
      qrCodes: "GET/POST /api/devices/:id/qr-codes",
      groups: "GET/POST /api/devices/:id/groups",
      accessRules: "GET/POST /api/devices/:id/access-rules",
      timeZones: "GET/POST /api/devices/:id/time-zones",
      holidays: "GET/POST /api/devices/:id/holidays",
      accessLogs: "GET /api/devices/:id/access-logs",
      actions: "POST /api/devices/:id/actions/*",
      logs: "GET /api/logs",
    },
  });
});

// ===========================================
// ROTAS PROTEGIDAS (com autenticação API Key)
// ===========================================

// Aplicar autenticação apenas nas rotas /api
app.use("/api", authMiddleware);

// Rotas de dispositivos
app.use("/api/devices", deviceRoutes);

// Rotas de usuários, cartões, tags (dentro de devices)
app.use("/api/devices", userRoutes);

// Rotas de grupos, regras, horários, logs de acesso (dentro de devices)
app.use("/api/devices", accessRoutes);

// Rotas de ações de controle (dentro de devices)
app.use("/api/devices", actionRoutes);

// Rotas de logs do sistema
app.use("/api/logs", logRoutes);

// ===========================================
// TRATAMENTO DE ERROS
// ===========================================

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
    code: "NOT_FOUND",
    path: req.path,
  });
});

// Handler de erros global
app.use(errorHandler);

module.exports = app;
