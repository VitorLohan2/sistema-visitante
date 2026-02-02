const express = require("express");
const router = express.Router();
const { OperationLogRepository } = require("../repositories");

const logRepo = new OperationLogRepository();

// ===========================================
// ROTAS DE LOGS DE OPERAÇÕES
// ===========================================

/**
 * GET /logs
 * Listar logs recentes
 */
router.get("/", (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = logRepo.findRecent(limit);

    res.json({
      success: true,
      data: logs,
      total: logs.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /logs/errors
 * Listar logs de erro
 */
router.get("/errors", (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = logRepo.findErrors(limit);

    res.json({
      success: true,
      data: logs,
      total: logs.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /logs/stats
 * Estatísticas de operações
 */
router.get("/stats", (req, res, next) => {
  try {
    const stats = logRepo.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /logs/device/:deviceId
 * Logs por dispositivo
 */
router.get("/device/:deviceId", (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const logs = logRepo.findByDeviceId(req.params.deviceId, limit, offset);

    res.json({
      success: true,
      data: logs,
      total: logs.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /logs/cleanup
 * Limpar logs antigos
 */
router.delete("/cleanup", (req, res, next) => {
  try {
    const daysToKeep = parseInt(req.query.days) || 30;
    const deleted = logRepo.cleanOld(daysToKeep);

    res.json({
      success: true,
      message: `${deleted} logs removidos`,
      deleted,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
