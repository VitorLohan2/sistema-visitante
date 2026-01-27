/**
 * Rotas de Funcionários
 * /funcionarios/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const FuncionarioController = require("../controllers/FuncionarioController");
const RegistroFuncionarioController = require("../controllers/RegistroFuncionarioController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requerPermissao } = require("../middleware/permissaoMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// REGISTROS DE PONTO - DEVE VIR ANTES DE /:cracha para não conflitar
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
  RegistroFuncionarioController.registrarPonto,
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
  RegistroFuncionarioController.historico,
);

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
  FuncionarioController.index,
);

// ═══════════════════════════════════════════════════════════════
// CRIAR FUNCIONÁRIO
// POST /funcionarios
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  authMiddleware,
  requerPermissao("funcionario_criar"),
  celebrate({
    [Segments.BODY]: Joi.object()
      .keys({
        cracha: Joi.string().required().min(3).max(20),
        nome: Joi.string().required().min(3).max(255),
        setor: Joi.string().required().max(100),
        funcao: Joi.string().required().max(100),
        data_admissao: Joi.date().iso().required(),
        ativo: Joi.boolean().optional(),
        data_demissao: Joi.date().iso().allow(null).optional(),
      })
      .unknown(),
  }),
  FuncionarioController.criar,
);

// ═══════════════════════════════════════════════════════════════
// ATUALIZAR FUNCIONÁRIO
// PUT /funcionarios/:cracha
// ═══════════════════════════════════════════════════════════════
router.put(
  "/:cracha",
  authMiddleware,
  requerPermissao("funcionario_editar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      cracha: Joi.string().required(),
    }),
    [Segments.BODY]: Joi.object()
      .keys({
        nome: Joi.string().min(3).max(255),
        setor: Joi.string().max(100),
        funcao: Joi.string().max(100),
        data_admissao: Joi.date().iso().optional(),
        data_demissao: Joi.date().iso().allow(null).optional(),
        ativo: Joi.boolean().optional(),
      })
      .unknown(),
  }),
  FuncionarioController.atualizar,
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR FUNCIONÁRIO POR CRACHÁ (deve vir por último)
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
  FuncionarioController.buscarPorCracha,
);

module.exports = router;
