/**
 * Rotas de Visitantes em Tempo Real (entrada/saída)
 * /visitantes/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const VisitanteController = require("../controllers/VisitanteController");
const ResponsavelController = require("../controllers/ResponsavelController");
const HistoricoController = require("../controllers/HistoricoController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// LISTAR VISITANTES ATUAIS (em visita)
// GET /visitantes
// ═══════════════════════════════════════════════════════════════
router.get("/", authMiddleware, VisitanteController.index);

// ═══════════════════════════════════════════════════════════════
// REGISTRAR NOVA ENTRADA DE VISITANTE
// POST /visitantes
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  authMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required(),
      cpf: Joi.string().required(),
      empresa: Joi.string().required(),
      empresa_atribuida_id: Joi.number().integer().required(),
      setor: Joi.string().required(),
      placa_veiculo: Joi.string().allow("", null).optional(),
      cor_veiculo: Joi.string().allow("", null).optional(),
      tipo_veiculo: Joi.string().allow("", null).optional(),
      funcao: Joi.string().allow("", null).optional(),
      responsavel: Joi.string().required(),
      observacao: Joi.string().allow("", null).optional(),
    }),
  }),
  VisitanteController.create,
);

// ═══════════════════════════════════════════════════════════════
// ENCERRAR VISITA (saída)
// PUT /visitantes/:id/exit
// ═══════════════════════════════════════════════════════════════
router.put(
  "/:id/exit",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),
  VisitanteController.endVisit,
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR HISTÓRICO DE VISITAS
// GET /visitantes/historico
// ═══════════════════════════════════════════════════════════════
router.get("/historico", authMiddleware, VisitanteController.history);

// ═══════════════════════════════════════════════════════════════
// LISTAR RESPONSÁVEIS (para modal de liberação)
// GET /visitantes/responsaveis
// ═══════════════════════════════════════════════════════════════
router.get("/responsaveis", ResponsavelController.index);

module.exports = router;
