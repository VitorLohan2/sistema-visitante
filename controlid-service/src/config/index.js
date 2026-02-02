require("dotenv").config();

const config = {
  // Ambiente
  env: process.env.NODE_ENV || "development",

  // Servidor
  server: {
    port: parseInt(process.env.PORT, 10) || 3050,
    host: process.env.HOST || "0.0.0.0",
  },

  // Autenticação
  auth: {
    apiKey: process.env.API_KEY || "dev-api-key",
  },

  // Banco de dados SQLite
  database: {
    path: process.env.DATABASE_PATH || "./data/controlid.db",
  },

  // Logs
  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: process.env.LOG_FILE || "./logs/controlid-service.log",
  },

  // Comunicação com dispositivos
  device: {
    timeout: parseInt(process.env.DEVICE_TIMEOUT, 10) || 10000,
    statusCheckInterval:
      parseInt(process.env.STATUS_CHECK_INTERVAL, 10) || 60000,
    maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY, 10) || 1000,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
};

module.exports = config;
