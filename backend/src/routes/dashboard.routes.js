const express = require("express");
const DashboardController = require("../controllers/DashboardController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /dashboard/estatisticas-hoje - Estatísticas do dia para gráficos
router.get(
  "/estatisticas-hoje",
  authMiddleware,
  DashboardController.estatisticasHoje
);

module.exports = router;
