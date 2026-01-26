/**
 * Rotas de Ponto do Usuário
 * /ponto/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const PontoUsuarioController = require("../controllers/PontoUsuarioController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// REGISTRAR PONTO
// POST /ponto/registrar
// ═══════════════════════════════════════════════════════════════
router.post(
  "/registrar",
  authMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      funcionario_id: Joi.string().required(),
      nome_funcionario: Joi.string().required(),
      setor_id: Joi.number().integer().required(),
      data: Joi.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .required(),
      hora: Joi.string()
        .required()
        .regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/),
      tipo_ponto: Joi.string()
        .valid("ENTRADA", "INTERVALO_ENTRADA", "INTERVALO_SAIDA", "SAIDA")
        .required(),
      latitude: Joi.number().optional().allow(null),
      longitude: Joi.number().optional().allow(null),
    }),
  }),
  PontoUsuarioController.registrar
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR HISTÓRICO DO USUÁRIO
// GET /ponto/usuario
// ═══════════════════════════════════════════════════════════════
router.get(
  "/usuario",
  authMiddleware,
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      funcionario_id: Joi.string().required(),
      dataInicio: Joi.date().iso().optional(),
      dataFim: Joi.date().iso().optional(),
    }),
  }),
  PontoUsuarioController.historicoUsuario
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR HISTÓRICO POR CRACHÁ (Admin)
// GET /ponto/historico
// ═══════════════════════════════════════════════════════════════
router.get(
  "/historico",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      cracha: Joi.string().required(),
      dataInicio: Joi.date().iso().optional(),
      dataFim: Joi.date().iso().optional(),
    }),
  }),
  PontoUsuarioController.historicoPorCracha
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR REGISTROS DE UM DIA ESPECÍFICO
// GET /ponto/dia
// ═══════════════════════════════════════════════════════════════
router.get(
  "/dia",
  authMiddleware,
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      funcionario_id: Joi.string().required(),
      data: Joi.date().iso().required(),
    }),
  }),
  PontoUsuarioController.registrosDia
);

// ═══════════════════════════════════════════════════════════════
// RELATÓRIO DE PONTOS (Admin)
// GET /ponto/relatorio
// ═══════════════════════════════════════════════════════════════
router.get(
  "/relatorio",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      dataInicio: Joi.date().iso().optional(),
      dataFim: Joi.date().iso().optional(),
      setor_id: Joi.number().integer().optional(),
    }),
  }),
  PontoUsuarioController.relatorio
);

// ═══════════════════════════════════════════════════════════════
// BIPAR CRACHÁ (Registro simplificado por crachá)
// POST /ponto/bipar
// ═══════════════════════════════════════════════════════════════
router.post(
  "/bipar",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      cracha: Joi.string().required(),
    }),
  }),
  PontoUsuarioController.biparCracha
);

module.exports = router;
