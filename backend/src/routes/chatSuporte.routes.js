/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHAT SUPORTE ROUTES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Rotas do sistema de chat de suporte híbrido (IA + humano).
 *
 * ESTRUTURA:
 * /chat-suporte/
 *   ├── /conversas/              (Rotas de usuário/visitante)
 *   │   ├── POST /iniciar        (Pública - inicia como visitante)
 *   │   ├── GET /                (Auth - lista conversas do usuário)
 *   │   ├── POST /               (Auth - cria conversa)
 *   │   └── /:id/...             (Operações em conversa específica)
 *   │
 *   ├── /atendente/              (Rotas do atendente - requer permissão)
 *   │   ├── GET /fila            (Lista fila de atendimento)
 *   │   ├── GET /conversas       (Lista conversas do atendente)
 *   │   ├── POST /aceitar/:id    (Aceita conversa)
 *   │   ├── POST /mensagem/:id   (Envia mensagem)
 *   │   └── POST /finalizar/:id  (Finaliza atendimento)
 *   │
 *   └── /admin/                  (Rotas administrativas)
 *       ├── GET /estatisticas    (Métricas do chat)
 *       ├── GET /auditoria       (Logs de auditoria)
 *       ├── GET /conversas       (Todas as conversas)
 *       └── /faq/                (Gerenciamento de FAQs)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const ChatSuporteController = require("../controllers/ChatSuporteController");
const {
  authMiddleware,
  authOptional,
} = require("../middleware/authMiddleware");
const { requerPermissao } = require("../middleware/permissaoMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// ROTAS PÚBLICAS (Visitantes não logados)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /chat-suporte/conversas/iniciar
 * Inicia uma conversa como visitante (não precisa estar logado)
 */
router.post(
  "/conversas/iniciar",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required().min(2).max(255),
      email: Joi.string().required().email(),
      assunto: Joi.string().max(255),
    }),
  }),
  ChatSuporteController.iniciarConversaVisitante
);

/**
 * POST /chat-suporte/visitante/conversas/:id/mensagens
 * Visitante envia mensagem (usa token temporário)
 */
router.post(
  "/visitante/conversas/:id/mensagens",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      mensagem: Joi.string().required().min(1).max(2000),
      token: Joi.string().required(),
    }),
  }),
  ChatSuporteController.enviarMensagemVisitante
);

/**
 * GET /chat-suporte/visitante/conversas/:id
 * Visitante busca sua conversa (usa token no header)
 */
router.get(
  "/visitante/conversas/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),
  ChatSuporteController.buscarConversaVisitante
);

/**
 * POST /chat-suporte/visitante/conversas/:id/solicitar-atendente
 * Visitante solicita atendimento humano
 */
router.post(
  "/visitante/conversas/:id/solicitar-atendente",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      token: Joi.string().required(),
    }),
  }),
  ChatSuporteController.solicitarAtendenteVisitante
);

// ═══════════════════════════════════════════════════════════════════════════
// ROTAS DO USUÁRIO (Autenticado)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /chat-suporte/conversas
 * Lista conversas do usuário logado
 */
router.get(
  "/conversas",
  authMiddleware,
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      status: Joi.string().max(100), // Permite status único ou múltiplos separados por vírgula
      limite: Joi.number().integer().min(1).max(100),
    }),
  }),
  ChatSuporteController.listarConversas
);

/**
 * POST /chat-suporte/conversas
 * Cria nova conversa (usuário logado)
 */
router.post(
  "/conversas",
  authMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      assunto: Joi.string().max(255),
    }),
  }),
  ChatSuporteController.criarConversa
);

/**
 * GET /chat-suporte/conversas/:id
 * Busca detalhes de uma conversa
 */
router.get(
  "/conversas/:id",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),
  ChatSuporteController.buscarConversa
);

/**
 * GET /chat-suporte/conversas/:id/mensagens
 * Busca mensagens de uma conversa
 */
router.get(
  "/conversas/:id/mensagens",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.QUERY]: Joi.object().keys({
      limite: Joi.number().integer().min(1).max(500),
      offset: Joi.number().integer().min(0),
    }),
  }),
  ChatSuporteController.buscarMensagens
);

/**
 * POST /chat-suporte/conversas/:id/mensagens
 * Envia mensagem em uma conversa
 */
router.post(
  "/conversas/:id/mensagens",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      mensagem: Joi.string().required().min(1).max(2000),
    }),
  }),
  ChatSuporteController.enviarMensagem
);

/**
 * POST /chat-suporte/conversas/:id/solicitar-atendente
 * Solicita atendimento humano
 */
router.post(
  "/conversas/:id/solicitar-atendente",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),
  ChatSuporteController.solicitarAtendente
);

/**
 * POST /chat-suporte/conversas/:id/finalizar
 * Finaliza uma conversa
 */
router.post(
  "/conversas/:id/finalizar",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      motivo: Joi.string().max(255),
    }),
  }),
  ChatSuporteController.finalizarConversa
);

/**
 * POST /chat-suporte/conversas/:id/avaliar
 * Avalia o atendimento
 */
router.post(
  "/conversas/:id/avaliar",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      nota: Joi.number().integer().required().min(1).max(5),
      comentario: Joi.string().max(1000),
    }),
  }),
  ChatSuporteController.avaliarAtendimento
);

// ═══════════════════════════════════════════════════════════════════════════
// ROTAS DO ATENDENTE (Requer permissão: chat_atendente_acessar_painel)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /chat-suporte/atendente/fila
 * Lista fila de atendimento
 */
router.get(
  "/atendente/fila",
  authMiddleware,
  requerPermissao("chat_atendente_acessar_painel"),
  ChatSuporteController.listarFila
);

/**
 * GET /chat-suporte/atendente/conversas
 * Lista conversas do atendente
 */
router.get(
  "/atendente/conversas",
  authMiddleware,
  requerPermissao("chat_atendente_acessar_painel"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      status: Joi.string(),
      limite: Joi.number().integer().min(1).max(100),
    }),
  }),
  ChatSuporteController.listarConversasAtendente
);

/**
 * GET /chat-suporte/atendente/minhas-conversas
 * Lista conversas ativas do atendente (alias)
 */
router.get(
  "/atendente/minhas-conversas",
  authMiddleware,
  requerPermissao("chat_atendente_acessar_painel"),
  ChatSuporteController.listarConversasAtendente
);

/**
 * GET /chat-suporte/atendente/historico
 * Lista histórico de conversas do atendente
 */
router.get(
  "/atendente/historico",
  authMiddleware,
  requerPermissao("chat_atendente_acessar_painel"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      page: Joi.number().integer().min(1),
      search: Joi.string().allow(""),
      limite: Joi.number().integer().min(1).max(100),
    }),
  }),
  ChatSuporteController.listarHistoricoAtendente
);

/**
 * POST /chat-suporte/atendente/aceitar/:id
 * Aceita uma conversa da fila
 */
router.post(
  "/atendente/aceitar/:id",
  authMiddleware,
  requerPermissao("chat_atendente_aceitar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),
  ChatSuporteController.aceitarConversa
);

/**
 * POST /chat-suporte/atendente/mensagem/:id
 * Envia mensagem como atendente
 */
router.post(
  "/atendente/mensagem/:id",
  authMiddleware,
  requerPermissao("chat_atendente_acessar_painel"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      mensagem: Joi.string().required().min(1).max(2000),
    }),
  }),
  ChatSuporteController.enviarMensagemAtendente
);

/**
 * POST /chat-suporte/atendente/finalizar/:id
 * Finaliza atendimento
 */
router.post(
  "/atendente/finalizar/:id",
  authMiddleware,
  requerPermissao("chat_atendente_finalizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      motivo: Joi.string().max(255),
    }),
  }),
  ChatSuporteController.finalizarAtendimento
);

// ═══════════════════════════════════════════════════════════════════════════
// ROTAS ADMINISTRATIVAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /chat-suporte/admin/estatisticas
 * Obtém estatísticas do chat
 */
router.get(
  "/admin/estatisticas",
  authMiddleware,
  requerPermissao("chat_visualizar_relatorios"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      dataInicio: Joi.date().iso(),
      dataFim: Joi.date().iso(),
    }),
  }),
  ChatSuporteController.obterEstatisticas
);

/**
 * GET /chat-suporte/admin/auditoria
 * Lista logs de auditoria
 */
router.get(
  "/admin/auditoria",
  authMiddleware,
  requerPermissao("chat_visualizar_auditoria"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      dataInicio: Joi.date().iso(),
      dataFim: Joi.date().iso(),
      acao: Joi.string(),
      conversa_id: Joi.number().integer(),
      limite: Joi.number().integer().min(1).max(500),
      offset: Joi.number().integer().min(0),
    }),
  }),
  ChatSuporteController.listarAuditoria
);

/**
 * GET /chat-suporte/admin/conversas
 * Lista todas as conversas (admin)
 */
router.get(
  "/admin/conversas",
  authMiddleware,
  requerPermissao("chat_visualizar_relatorios"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      status: Joi.string(),
      limite: Joi.number().integer().min(1).max(500),
    }),
  }),
  ChatSuporteController.listarTodasConversas
);

/**
 * GET /chat-suporte/admin/faq
 * Lista FAQs
 */
router.get(
  "/admin/faq",
  authMiddleware,
  requerPermissao("chat_gerenciar_faq"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      categoria: Joi.string(),
      apenasAtivos: Joi.boolean(),
    }),
  }),
  ChatSuporteController.listarFAQs
);

/**
 * POST /chat-suporte/admin/faq
 * Cria ou atualiza FAQ
 */
router.post(
  "/admin/faq",
  authMiddleware,
  requerPermissao("chat_gerenciar_faq"),
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      id: Joi.number().integer(),
      pergunta: Joi.string().required().min(5).max(1000),
      resposta: Joi.string().required().min(10).max(5000),
      palavras_chave: Joi.array().items(Joi.string()),
      categoria: Joi.string().max(100),
      ativo: Joi.boolean(),
    }),
  }),
  ChatSuporteController.salvarFAQ
);

/**
 * DELETE /chat-suporte/admin/faq/:id
 * Remove FAQ
 */
router.delete(
  "/admin/faq/:id",
  authMiddleware,
  requerPermissao("chat_gerenciar_faq"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),
  ChatSuporteController.removerFAQ
);

module.exports = router;
