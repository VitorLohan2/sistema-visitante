const express = require("express");
const DashboardController = require("../controllers/DashboardController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /dashboard/estatisticas-hoje - Estatísticas do dia para gráficos
router.get(
  "/estatisticas-hoje",
  authMiddleware,
  DashboardController.estatisticasHoje,
);

// GET /dashboard/visitantes-hoje - Lista detalhada de visitantes que entraram hoje
router.get(
  "/visitantes-hoje",
  authMiddleware,
  DashboardController.visitantesHoje,
);

// GET /dashboard/cadastros-hoje - Lista detalhada de cadastros realizados hoje
router.get(
  "/cadastros-hoje",
  authMiddleware,
  DashboardController.cadastrosHoje,
);

module.exports = router;
