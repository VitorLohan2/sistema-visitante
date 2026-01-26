/**
 * Rotas de Tickets de Suporte
 * /tickets/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const TicketController = require("../controllers/TicketController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// LISTAR TICKETS
// GET /tickets
// ═══════════════════════════════════════════════════════════════
router.get("/", authMiddleware, TicketController.index);

// ═══════════════════════════════════════════════════════════════
// CONTAR TICKETS NÃO VISUALIZADOS
// GET /tickets/unseen
// ═══════════════════════════════════════════════════════════════
router.get("/unseen", authMiddleware, TicketController.countUnseen);

// ═══════════════════════════════════════════════════════════════
// MARCAR TODOS COMO VISUALIZADOS
// PUT /tickets/mark-seen
// ═══════════════════════════════════════════════════════════════
router.put("/mark-seen", authMiddleware, TicketController.markAllSeen);

// ═══════════════════════════════════════════════════════════════
// CRIAR NOVO TICKET
// POST /tickets
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  authMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      funcionario: Joi.string().required(),
      motivo: Joi.string().required(),
      descricao: Joi.string().required(),
      setorResponsavel: Joi.string().required(),
      nomeUsuario: Joi.string().required(),
      setorUsuario: Joi.string().required(),
    }),
  }),
  TicketController.create
);

// ═══════════════════════════════════════════════════════════════
// VER DETALHES DE UM TICKET
// GET /tickets/:id
// ═══════════════════════════════════════════════════════════════
router.get(
  "/:id",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
  }),
  TicketController.show
);

// ═══════════════════════════════════════════════════════════════
// ATUALIZAR STATUS DO TICKET
// PUT /tickets/:id
// ═══════════════════════════════════════════════════════════════
router.put(
  "/:id",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      status: Joi.string()
        .valid("Aberto", "Em andamento", "Resolvido")
        .required(),
    }),
  }),
  TicketController.update
);

module.exports = router;
