/**
 * Rotas de Informações do Sistema
 * /system/*
 */

const express = require("express");
const SystemController = require("../controllers/SystemController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /system/info - Informações públicas do sistema (versão, último commit)
router.get("/info", SystemController.getInfo);

// GET /system/permissions-stats - Estatísticas de permissões do usuário (requer auth)
router.get(
  "/permissions-stats",
  authMiddleware,
  SystemController.getPermissionsStats,
);

module.exports = router;
