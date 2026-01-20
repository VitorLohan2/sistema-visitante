/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ROTAS: Ronda de Vigilante
 * Define todas as rotas do módulo de rondas com validações e permissões
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requerPermissao } = require("../middleware/permissaoMiddleware");
const RondaController = require("../controllers/RondaController");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS DO VIGILANTE (usuário que realiza a ronda)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /rondas/iniciar
 * Inicia uma nova ronda
 * Permissão: ronda_iniciar
 */
router.post(
  "/iniciar",
  authMiddleware,
  requerPermissao("ronda_iniciar"),
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      latitude: Joi.number().min(-90).max(90).required().messages({
        "number.min": "Latitude deve ser maior ou igual a -90",
        "number.max": "Latitude deve ser menor ou igual a 90",
        "any.required": "Latitude é obrigatória para iniciar a ronda",
      }),
      longitude: Joi.number().min(-180).max(180).required().messages({
        "number.min": "Longitude deve ser maior ou igual a -180",
        "number.max": "Longitude deve ser menor ou igual a 180",
        "any.required": "Longitude é obrigatória para iniciar a ronda",
      }),
      observacoes: Joi.string().max(1000).allow("", null),
    }),
  }),
  RondaController.iniciar
);

/**
 * GET /rondas/em-andamento
 * Busca a ronda em andamento do usuário logado
 * Permissão: ronda_iniciar
 */
router.get(
  "/em-andamento",
  authMiddleware,
  requerPermissao("ronda_iniciar"),
  RondaController.buscarEmAndamento
);

/**
 * POST /rondas/:id/checkpoint
 * Registra um checkpoint na ronda
 * Permissão: ronda_registrar_checkpoint
 */
router.post(
  "/:id/checkpoint",
  authMiddleware,
  requerPermissao("ronda_registrar_checkpoint"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      latitude: Joi.number().min(-90).max(90).required().messages({
        "any.required": "Latitude é obrigatória para registrar o checkpoint",
      }),
      longitude: Joi.number().min(-180).max(180).required().messages({
        "any.required": "Longitude é obrigatória para registrar o checkpoint",
      }),
      descricao: Joi.string().max(500).allow("", null),
      foto_url: Joi.string().uri().max(500).allow("", null),
    }),
  }),
  RondaController.registrarCheckpoint
);

/**
 * POST /rondas/:id/trajeto
 * Registra um ponto do trajeto GPS
 * Permissão: ronda_registrar_trajeto
 */
router.post(
  "/:id/trajeto",
  authMiddleware,
  requerPermissao("ronda_registrar_trajeto"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
      precisao: Joi.number().min(0).max(1000).allow(null),
      altitude: Joi.number().allow(null),
      velocidade: Joi.number().min(0).allow(null),
    }),
  }),
  RondaController.registrarTrajeto
);

/**
 * PUT /rondas/:id/finalizar
 * Finaliza uma ronda em andamento
 * Permissão: ronda_finalizar
 */
router.put(
  "/:id/finalizar",
  authMiddleware,
  requerPermissao("ronda_finalizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      latitude: Joi.number().min(-90).max(90).allow(null),
      longitude: Joi.number().min(-180).max(180).allow(null),
      observacoes: Joi.string().max(1000).allow("", null),
    }),
  }),
  RondaController.finalizar
);

/**
 * PUT /rondas/:id/cancelar
 * Cancela uma ronda em andamento
 * Permissão: ronda_cancelar
 */
router.put(
  "/:id/cancelar",
  authMiddleware,
  requerPermissao("ronda_cancelar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      motivo: Joi.string().max(500).allow("", null),
    }),
  }),
  RondaController.cancelar
);

/**
 * GET /rondas/historico
 * Lista o histórico de rondas do usuário logado
 * Permissão: ronda_visualizar_historico
 */
router.get(
  "/historico",
  authMiddleware,
  requerPermissao("ronda_visualizar_historico"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      pagina: Joi.number().integer().min(1).default(1),
      limite: Joi.number().integer().min(1).max(100).default(10),
      data_inicio: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow("", null),
      data_fim: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow("", null),
    }),
  }),
  RondaController.listarHistorico
);

/**
 * GET /rondas/:id
 * Busca detalhes de uma ronda específica
 * Permissão: ronda_visualizar_historico ou ronda_gerenciar
 */
router.get(
  "/:id",
  authMiddleware,
  requerPermissao(["ronda_visualizar_historico", "ronda_gerenciar"]),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  RondaController.buscarDetalhes
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS ADMINISTRATIVAS (painel de gestão)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /rondas/admin/listar
 * Lista todas as rondas (painel administrativo)
 * Permissão: ronda_gerenciar
 */
router.get(
  "/admin/listar",
  authMiddleware,
  requerPermissao("ronda_gerenciar"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      pagina: Joi.number().integer().min(1).default(1),
      limite: Joi.number().integer().min(1).max(100).default(20),
      usuario_id: Joi.number().integer().positive().allow(null),
      status: Joi.string()
        .valid("em_andamento", "finalizada", "cancelada")
        .allow("", null),
      data_inicio: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow("", null),
      data_fim: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow("", null),
      empresa_id: Joi.number().integer().positive().allow(null),
    }),
  }),
  RondaController.listarTodasRondas
);

/**
 * GET /rondas/admin/estatisticas
 * Estatísticas de rondas
 * Permissão: ronda_gerenciar
 */
router.get(
  "/admin/estatisticas",
  authMiddleware,
  requerPermissao("ronda_gerenciar"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      data_inicio: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow("", null),
      data_fim: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow("", null),
      empresa_id: Joi.number().integer().positive().allow(null),
    }),
  }),
  RondaController.estatisticas
);

/**
 * GET /rondas/admin/auditoria
 * Lista registros de auditoria
 * Permissão: ronda_gerenciar
 */
router.get(
  "/admin/auditoria",
  authMiddleware,
  requerPermissao("ronda_gerenciar"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      pagina: Joi.number().integer().min(1).default(1),
      limite: Joi.number().integer().min(1).max(100).default(50),
      ronda_id: Joi.number().integer().positive().allow(null),
      usuario_id: Joi.number().integer().positive().allow(null),
      tipo_acao: Joi.string()
        .valid(
          "INICIO",
          "CHECKPOINT",
          "TRAJETO",
          "FINALIZACAO",
          "CANCELAMENTO",
          "VISUALIZACAO"
        )
        .allow("", null),
      data_inicio: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow("", null),
      data_fim: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow("", null),
    }),
  }),
  RondaController.listarAuditoria
);

/**
 * GET /rondas/admin/vigilantes
 * Lista vigilantes disponíveis para filtros
 * Permissão: ronda_gerenciar
 */
router.get(
  "/admin/vigilantes",
  authMiddleware,
  requerPermissao("ronda_gerenciar"),
  RondaController.listarVigilantes
);

module.exports = router;
