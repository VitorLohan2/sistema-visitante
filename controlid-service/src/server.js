const app = require("./app");
const config = require("./config");
const logger = require("./config/logger");
const db = require("./config/database");
const { DeviceMonitorService } = require("./services");
const { SessionRepository } = require("./repositories");

const sessionRepo = new SessionRepository();

/**
 * Inicialização do servidor
 */
const startServer = async () => {
  try {
    // Aguardar banco de dados estar pronto
    logger.info("Aguardando banco de dados...");
    await db.ready;
    logger.info("Banco de dados pronto!");

    // Limpar sessões expiradas
    sessionRepo.cleanExpired();

    // Iniciar servidor HTTP
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info("=".repeat(60));
      logger.info("  CONTROLID INTEGRATION SERVICE");
      logger.info("=".repeat(60));
      logger.info(`  Ambiente: ${config.env}`);
      logger.info(
        `  Servidor: http://${config.server.host}:${config.server.port}`,
      );
      logger.info(
        `  Health:   http://${config.server.host}:${config.server.port}/health`,
      );
      logger.info("=".repeat(60));
    });

    // Iniciar monitoramento de dispositivos
    DeviceMonitorService.start();

    // Tratamento de sinais de encerramento
    const gracefulShutdown = (signal) => {
      logger.info(`Sinal ${signal} recebido. Encerrando servidor...`);

      // Parar monitoramento
      DeviceMonitorService.stop();

      // Fechar servidor HTTP
      server.close((err) => {
        if (err) {
          logger.error("Erro ao encerrar servidor", { error: err.message });
          process.exit(1);
        }

        logger.info("Servidor encerrado com sucesso");
        process.exit(0);
      });

      // Forçar encerramento após timeout
      setTimeout(() => {
        logger.error("Timeout ao encerrar servidor. Forçando encerramento.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Tratamento de exceções não capturadas
    process.on("uncaughtException", (error) => {
      logger.error("Exceção não capturada", {
        error: error.message,
        stack: error.stack,
      });
      gracefulShutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Promise rejeitada não tratada", {
        reason: reason?.message || reason,
      });
    });
  } catch (error) {
    logger.error("Erro ao iniciar servidor", { error: error.message });
    process.exit(1);
  }
};

// Iniciar servidor
startServer();
