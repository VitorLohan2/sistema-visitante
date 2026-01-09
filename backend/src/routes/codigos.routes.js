/**
 * Rotas de Códigos de Acesso
 * /codigos/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const CodigoController = require("../controllers/CodigoController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// VALIDAR CÓDIGO (público)
// GET /codigos/validar/:codigo
// ═══════════════════════════════════════════════════════════════
router.get(
  "/validar/:codigo",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      codigo: Joi.string()
        .required()
        .pattern(/^[A-Z0-9]{3,20}$/),
    }),
  }),
  CodigoController.validarCodigo
);

// ═══════════════════════════════════════════════════════════════
// LISTAR CÓDIGOS (Admin only)
// GET /codigos
// ═══════════════════════════════════════════════════════════════
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  CodigoController.listarCodigos
);

// ═══════════════════════════════════════════════════════════════
// CRIAR NOVO CÓDIGO (Admin only)
// POST /codigos
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      codigo: Joi.string()
        .required()
        .pattern(/^[A-Z0-9]{3,20}$/),
      limite_usos: Joi.number().integer().min(1).max(1000).required(),
    }),
  }),
  CodigoController.gerarCodigo
);

// ═══════════════════════════════════════════════════════════════
// DESATIVAR CÓDIGO (Admin only)
// PUT /codigos/:id/desativar
// ═══════════════════════════════════════════════════════════════
router.put(
  "/:id/desativar",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),
  CodigoController.desativarCodigo
);

// ═══════════════════════════════════════════════════════════════
// ATIVAR CÓDIGO (Admin only)
// PUT /codigos/:id/ativar
// ═══════════════════════════════════════════════════════════════
router.put(
  "/:id/ativar",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),
  CodigoController.ativarCodigo
);

// ═══════════════════════════════════════════════════════════════
// DELETAR CÓDIGO (Admin only)
// DELETE /codigos/:id
// ═══════════════════════════════════════════════════════════════
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),
  CodigoController.deleteCodigo
);

module.exports = router;
