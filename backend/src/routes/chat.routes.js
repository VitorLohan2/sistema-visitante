/**
 * Rotas do Chat de Suporte
 * /chat/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const ChatController = require("../controllers/ChatController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// LISTAR CONVERSAS DO USUÁRIO
// GET /chat/conversas
// ═══════════════════════════════════════════════════════════════
router.get("/conversas", authMiddleware, ChatController.listarConversas);

// ═══════════════════════════════════════════════════════════════
// CRIAR NOVA CONVERSA
// POST /chat/conversas
// ═══════════════════════════════════════════════════════════════
router.post(
  "/conversas",
  authMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      assunto: Joi.string().max(255),
    }),
  }),
  ChatController.criarConversa
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR MENSAGENS DE UMA CONVERSA
// GET /chat/conversas/:conversa_id/mensagens
// ═══════════════════════════════════════════════════════════════
router.get(
  "/conversas/:conversa_id/mensagens",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      conversa_id: Joi.number().integer().required(),
    }),
  }),
  ChatController.buscarMensagens
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR DETALHES DE UMA CONVERSA
// GET /chat/conversas/:conversa_id/detalhes
// ═══════════════════════════════════════════════════════════════
router.get(
  "/conversas/:conversa_id/detalhes",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      conversa_id: Joi.number().integer().required(),
    }),
  }),
  ChatController.buscarDetalhesConversa
);

// ═══════════════════════════════════════════════════════════════
// ENVIAR MENSAGEM
// POST /chat/conversas/:conversa_id/mensagens
// ═══════════════════════════════════════════════════════════════
router.post(
  "/conversas/:conversa_id/mensagens",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      conversa_id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      mensagem: Joi.string().required().max(1000),
    }),
  }),
  ChatController.enviarMensagem
);

// ═══════════════════════════════════════════════════════════════
// MARCAR CONVERSA COMO VISUALIZADA
// PUT /chat/conversas/:conversa_id/visualizar
// ═══════════════════════════════════════════════════════════════
router.put(
  "/conversas/:conversa_id/visualizar",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      conversa_id: Joi.number().integer().required(),
    }),
  }),
  ChatController.marcarComoVisualizada
);

// ═══════════════════════════════════════════════════════════════
// ATUALIZAR STATUS DA CONVERSA
// PUT /chat/conversas/:conversa_id/status
// ═══════════════════════════════════════════════════════════════
router.put(
  "/conversas/:conversa_id/status",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      conversa_id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      status: Joi.string()
        .valid("aberto", "em_atendimento", "resolvido", "fechado")
        .required(),
    }),
  }),
  ChatController.atualizarStatus
);

// ═══════════════════════════════════════════════════════════════
// CONTAR MENSAGENS NÃO LIDAS (ADM)
// GET /chat/nao-lidas
// ═══════════════════════════════════════════════════════════════
router.get("/nao-lidas", authMiddleware, ChatController.contarNaoLidas);

// ═══════════════════════════════════════════════════════════════
// LISTAR EQUIPE ONLINE
// GET /chat/equipe-online
// ═══════════════════════════════════════════════════════════════
router.get("/equipe-online", ChatController.listarEquipeOnline);

module.exports = router;
