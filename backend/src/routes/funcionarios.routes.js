/**
 * Rotas de Funcionários
 * /funcionarios/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const FuncionarioController = require("../controllers/FuncionarioController");
const RegistroFuncionarioController = require("../controllers/RegistroFuncionarioController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// LISTAR FUNCIONÁRIOS
// GET /funcionarios
// ═══════════════════════════════════════════════════════════════
router.get(
  "/",
  authMiddleware,
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      mostrarInativos: Joi.boolean().default(false),
    }),
  }),
  FuncionarioController.index
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR FUNCIONÁRIO POR CRACHÁ
// GET /funcionarios/:cracha
// ═══════════════════════════════════════════════════════════════
router.get(
  "/:cracha",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      cracha: Joi.string().required(),
    }),
  }),
  FuncionarioController.buscarPorCracha
);

// ═══════════════════════════════════════════════════════════════
// CRIAR FUNCIONÁRIO (Admin only)
// POST /funcionarios
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      cracha: Joi.string().required().min(3).max(20),
      nome: Joi.string().required().min(3).max(255),
      setor: Joi.string().required().max(100),
      funcao: Joi.string().required().max(100),
      data_admissao: Joi.date().iso().required(),
    }),
  }),
  FuncionarioController.criar
);

// ═══════════════════════════════════════════════════════════════
// ATUALIZAR FUNCIONÁRIO (Admin only)
// PUT /funcionarios/:cracha
// ═══════════════════════════════════════════════════════════════
router.put(
  "/:cracha",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      cracha: Joi.string().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().min(3).max(255),
      setor: Joi.string().max(100),
      funcao: Joi.string().max(100),
      data_admissao: Joi.alternatives().try(
        Joi.date().iso(),
        Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      ),
      data_demissao: Joi.alternatives().try(
        Joi.date().iso(),
        Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        Joi.allow(null)
      ),
      ativo: Joi.boolean(),
    }),
  }),
  FuncionarioController.atualizar
);

// ═══════════════════════════════════════════════════════════════
// REGISTROS DE PONTO
// ═══════════════════════════════════════════════════════════════

// Registrar ponto
router.post(
  "/registros-ponto",
  authMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      cracha: Joi.string().required().min(3).max(20),
    }),
  }),
  RegistroFuncionarioController.registrarPonto
);

// Histórico de ponto
router.get(
  "/registros-ponto/historico",
  authMiddleware,
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      cracha: Joi.string().required(),
      dataInicio: Joi.date().iso(),
      dataFim: Joi.date().iso(),
    }),
  }),
  RegistroFuncionarioController.historico
);

module.exports = router;
