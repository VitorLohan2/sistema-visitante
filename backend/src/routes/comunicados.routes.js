/**
 * Rotas de Comunicados
 * /comunicados/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const ComunicadoController = require("../controllers/ComunicadoController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// BUSCAR COMUNICADO ATIVO (para exibição na tela inicial)
// GET /comunicados/ativo
// ═══════════════════════════════════════════════════════════════
router.get("/ativo", authMiddleware, ComunicadoController.getAtivo);

// ═══════════════════════════════════════════════════════════════
// LISTAR TODOS OS COMUNICADOS
// GET /comunicados
// ═══════════════════════════════════════════════════════════════
router.get("/", authMiddleware, ComunicadoController.list);

// ═══════════════════════════════════════════════════════════════
// CRIAR NOVO COMUNICADO (Admin only)
// POST /comunicados
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object({
      titulo: Joi.string().required().max(100),
      mensagem: Joi.string().required().max(500),
      prioridade: Joi.string().valid("normal", "urgente").default("normal"),
      ativo: Joi.boolean().default(false),
    }),
  }),
  ComunicadoController.create
);

// ═══════════════════════════════════════════════════════════════
// ATUALIZAR / ATIVAR / DESATIVAR COMUNICADO (Admin only)
// PUT /comunicados/:id
// ═══════════════════════════════════════════════════════════════
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.number().required(),
    }),
    [Segments.BODY]: Joi.object({
      titulo: Joi.string().max(100),
      mensagem: Joi.string().max(500),
      prioridade: Joi.string().valid("normal", "urgente"),
      ativo: Joi.boolean(),
    }).min(1),
  }),
  ComunicadoController.update
);

// ═══════════════════════════════════════════════════════════════
// EXCLUIR COMUNICADO (Admin only)
// DELETE /comunicados/:id
// ═══════════════════════════════════════════════════════════════
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.number().required(),
    }),
  }),
  ComunicadoController.delete
);

module.exports = router;
