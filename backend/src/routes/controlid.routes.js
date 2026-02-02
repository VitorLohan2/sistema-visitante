/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ROTAS: Control iD - Integração com Equipamentos de Controle de Acesso
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Define todas as rotas do módulo de integração com equipamentos Control iD.
 * Todas as rotas são protegidas por autenticação JWT e permissões RBAC.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requerPermissao } = require("../middleware/permissaoMiddleware");
const ControlIdController = require("../controllers/ControlIdController");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK E STATUS GERAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /controlid/health
 * Verifica se o microserviço está online
 * Permissão: controlid_visualizar
 */
router.get(
  "/health",
  authMiddleware,
  requerPermissao("controlid_visualizar"),
  ControlIdController.healthCheck,
);

/**
 * GET /controlid/devices/models
 * Lista modelos de equipamentos suportados
 * Permissão: controlid_visualizar
 */
router.get(
  "/devices/models",
  authMiddleware,
  requerPermissao("controlid_visualizar"),
  ControlIdController.listarModelos,
);

/**
 * GET /controlid/devices/status-summary
 * Resumo de status de todos os dispositivos
 * Permissão: controlid_status
 */
router.get(
  "/devices/status-summary",
  authMiddleware,
  requerPermissao("controlid_status"),
  ControlIdController.resumoStatus,
);

// ═══════════════════════════════════════════════════════════════════════════════
// DISPOSITIVOS - CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /controlid/devices
 * Lista todos os dispositivos cadastrados
 * Permissão: controlid_visualizar
 */
router.get(
  "/devices",
  authMiddleware,
  requerPermissao("controlid_visualizar"),
  ControlIdController.listarDispositivos,
);

/**
 * POST /controlid/devices
 * Cadastra um novo dispositivo
 * Permissão: controlid_cadastrar
 */
router.post(
  "/devices",
  authMiddleware,
  requerPermissao("controlid_cadastrar"),
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      name: Joi.string().max(100).required().messages({
        "string.empty": "Nome é obrigatório",
        "any.required": "Nome é obrigatório",
      }),
      ip: Joi.string()
        .ip({ version: ["ipv4"] })
        .required()
        .messages({
          "string.ip": "IP inválido",
          "any.required": "IP é obrigatório",
        }),
      port: Joi.number().integer().min(1).max(65535).default(80),
      login: Joi.string().max(50).default("admin"),
      password: Joi.string().max(100).default("admin"),
      model: Joi.string()
        .valid(
          "iDUHF",
          "iDFace",
          "iDFace Max",
          "iDBlock",
          "iDBlock Next",
          "iDFlex",
          "iDAccess",
          "iDAccess Pro",
          "iDAccess Nano",
          "iDBox",
          "iDFit",
        )
        .default("iDUHF"),
      description: Joi.string().max(255).allow("", null),
      location: Joi.string().max(100).allow("", null),
    }),
  }),
  ControlIdController.cadastrarDispositivo,
);

/**
 * GET /controlid/devices/:id
 * Busca um dispositivo pelo ID
 * Permissão: controlid_visualizar
 */
router.get(
  "/devices/:id",
  authMiddleware,
  requerPermissao("controlid_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.buscarDispositivo,
);

/**
 * PUT /controlid/devices/:id
 * Atualiza um dispositivo
 * Permissão: controlid_editar
 */
router.put(
  "/devices/:id",
  authMiddleware,
  requerPermissao("controlid_editar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      name: Joi.string().max(100),
      ip: Joi.string().ip({ version: ["ipv4"] }),
      port: Joi.number().integer().min(1).max(65535),
      login: Joi.string().max(50),
      password: Joi.string().max(100),
      model: Joi.string().valid(
        "iDUHF",
        "iDFace",
        "iDFace Max",
        "iDBlock",
        "iDBlock Next",
        "iDFlex",
        "iDAccess",
        "iDAccess Pro",
        "iDAccess Nano",
        "iDBox",
        "iDFit",
      ),
      description: Joi.string().max(255).allow("", null),
      location: Joi.string().max(100).allow("", null),
    }),
  }),
  ControlIdController.atualizarDispositivo,
);

/**
 * DELETE /controlid/devices/:id
 * Remove um dispositivo
 * Permissão: controlid_excluir
 */
router.delete(
  "/devices/:id",
  authMiddleware,
  requerPermissao("controlid_excluir"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.removerDispositivo,
);

/**
 * POST /controlid/devices/:id/check-status
 * Verifica status de um dispositivo
 * Permissão: controlid_status
 */
router.post(
  "/devices/:id/check-status",
  authMiddleware,
  requerPermissao("controlid_status"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.verificarStatus,
);

/**
 * GET /controlid/devices/:id/system-info
 * Busca informações do sistema do dispositivo
 * Permissão: controlid_visualizar
 */
router.get(
  "/devices/:id/system-info",
  authMiddleware,
  requerPermissao("controlid_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.buscarInfoSistema,
);

// ═══════════════════════════════════════════════════════════════════════════════
// USUÁRIOS NO DISPOSITIVO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /controlid/devices/:id/users
 * Lista usuários de um dispositivo
 * Permissão: controlid_usuarios_visualizar
 */
router.get(
  "/devices/:id/users",
  authMiddleware,
  requerPermissao("controlid_usuarios_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.QUERY]: Joi.object().keys({
      limit: Joi.number().integer().min(1).max(1000).default(100),
      offset: Joi.number().integer().min(0).default(0),
    }),
  }),
  ControlIdController.listarUsuarios,
);

/**
 * POST /controlid/devices/:id/users
 * Cria um usuário no dispositivo
 * Permissão: controlid_usuarios_gerenciar
 */
router.post(
  "/devices/:id/users",
  authMiddleware,
  requerPermissao("controlid_usuarios_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      registration: Joi.string().max(50).required().messages({
        "any.required": "Matrícula é obrigatória",
      }),
      name: Joi.string().max(100).required().messages({
        "any.required": "Nome é obrigatório",
      }),
      user_type_id: Joi.number().integer().min(0).default(0),
      begin_time: Joi.number().integer().allow(null),
      end_time: Joi.number().integer().allow(null),
    }),
  }),
  ControlIdController.criarUsuario,
);

/**
 * GET /controlid/devices/:id/users/:userId
 * Busca um usuário pelo ID
 * Permissão: controlid_usuarios_visualizar
 */
router.get(
  "/devices/:id/users/:userId",
  authMiddleware,
  requerPermissao("controlid_usuarios_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
      userId: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.buscarUsuario,
);

/**
 * PUT /controlid/devices/:id/users/:userId
 * Atualiza um usuário no dispositivo
 * Permissão: controlid_usuarios_gerenciar
 */
router.put(
  "/devices/:id/users/:userId",
  authMiddleware,
  requerPermissao("controlid_usuarios_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
      userId: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      registration: Joi.string().max(50),
      name: Joi.string().max(100),
      user_type_id: Joi.number().integer().min(0),
      begin_time: Joi.number().integer().allow(null),
      end_time: Joi.number().integer().allow(null),
    }),
  }),
  ControlIdController.atualizarUsuario,
);

/**
 * DELETE /controlid/devices/:id/users/:userId
 * Remove um usuário do dispositivo
 * Permissão: controlid_usuarios_gerenciar
 */
router.delete(
  "/devices/:id/users/:userId",
  authMiddleware,
  requerPermissao("controlid_usuarios_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
      userId: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.removerUsuario,
);

// ═══════════════════════════════════════════════════════════════════════════════
// CREDENCIAIS - CARTÕES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /controlid/devices/:id/cards
 * Lista cartões de um dispositivo
 * Permissão: controlid_credenciais_visualizar
 */
router.get(
  "/devices/:id/cards",
  authMiddleware,
  requerPermissao("controlid_credenciais_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.listarCartoes,
);

/**
 * POST /controlid/devices/:id/cards
 * Cria um cartão
 * Permissão: controlid_credenciais_gerenciar
 */
router.post(
  "/devices/:id/cards",
  authMiddleware,
  requerPermissao("controlid_credenciais_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      user_id: Joi.number().integer().positive().required(),
      value: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.criarCartao,
);

/**
 * DELETE /controlid/devices/:id/cards/:cardId
 * Remove um cartão
 * Permissão: controlid_credenciais_gerenciar
 */
router.delete(
  "/devices/:id/cards/:cardId",
  authMiddleware,
  requerPermissao("controlid_credenciais_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
      cardId: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.removerCartao,
);

// ═══════════════════════════════════════════════════════════════════════════════
// CREDENCIAIS - TAGS UHF
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /controlid/devices/:id/uhf-tags
 * Lista tags UHF de um dispositivo
 * Permissão: controlid_credenciais_visualizar
 */
router.get(
  "/devices/:id/uhf-tags",
  authMiddleware,
  requerPermissao("controlid_credenciais_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.listarTagsUHF,
);

/**
 * POST /controlid/devices/:id/uhf-tags
 * Cria uma tag UHF
 * Permissão: controlid_credenciais_gerenciar
 */
router.post(
  "/devices/:id/uhf-tags",
  authMiddleware,
  requerPermissao("controlid_credenciais_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      user_id: Joi.number().integer().positive().required(),
      value: Joi.string().max(100).required().messages({
        "any.required": "Tag UHF é obrigatória",
      }),
    }),
  }),
  ControlIdController.criarTagUHF,
);

/**
 * DELETE /controlid/devices/:id/uhf-tags/:tagId
 * Remove uma tag UHF
 * Permissão: controlid_credenciais_gerenciar
 */
router.delete(
  "/devices/:id/uhf-tags/:tagId",
  authMiddleware,
  requerPermissao("controlid_credenciais_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
      tagId: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.removerTagUHF,
);

// ═══════════════════════════════════════════════════════════════════════════════
// CREDENCIAIS - QR CODES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /controlid/devices/:id/qr-codes
 * Lista QR Codes de um dispositivo
 * Permissão: controlid_credenciais_visualizar
 */
router.get(
  "/devices/:id/qr-codes",
  authMiddleware,
  requerPermissao("controlid_credenciais_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.listarQRCodes,
);

/**
 * POST /controlid/devices/:id/qr-codes
 * Cria um QR Code
 * Permissão: controlid_credenciais_gerenciar
 */
router.post(
  "/devices/:id/qr-codes",
  authMiddleware,
  requerPermissao("controlid_credenciais_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      user_id: Joi.number().integer().positive().required(),
      value: Joi.string().max(255).required(),
    }),
  }),
  ControlIdController.criarQRCode,
);

/**
 * DELETE /controlid/devices/:id/qr-codes/:qrId
 * Remove um QR Code
 * Permissão: controlid_credenciais_gerenciar
 */
router.delete(
  "/devices/:id/qr-codes/:qrId",
  authMiddleware,
  requerPermissao("controlid_credenciais_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
      qrId: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.removerQRCode,
);

// ═══════════════════════════════════════════════════════════════════════════════
// AÇÕES DE CONTROLE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /controlid/devices/:id/actions/open-door
 * Abre porta/relé
 * Permissão: controlid_abrir_porta
 */
router.post(
  "/devices/:id/actions/open-door",
  authMiddleware,
  requerPermissao("controlid_abrir_porta"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      door_id: Joi.number().integer().min(1).max(4).default(1),
    }),
  }),
  ControlIdController.abrirPorta,
);

/**
 * POST /controlid/devices/:id/actions/open-sec-box
 * Abre via SecBox
 * Permissão: controlid_abrir_porta
 */
router.post(
  "/devices/:id/actions/open-sec-box",
  authMiddleware,
  requerPermissao("controlid_abrir_porta"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      secbox_id: Joi.number().integer().positive().required(),
      action: Joi.string().valid("open", "close", "trigger").default("open"),
    }),
  }),
  ControlIdController.abrirSecBox,
);

/**
 * POST /controlid/devices/:id/actions/release-turnstile
 * Libera catraca
 * Permissão: controlid_liberar_catraca
 */
router.post(
  "/devices/:id/actions/release-turnstile",
  authMiddleware,
  requerPermissao("controlid_liberar_catraca"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      direction: Joi.string()
        .valid("clockwise", "anticlockwise", "both")
        .default("clockwise"),
    }),
  }),
  ControlIdController.liberarCatraca,
);

/**
 * GET /controlid/devices/:id/actions/doors-state
 * Busca estado das portas
 * Permissão: controlid_status
 */
router.get(
  "/devices/:id/actions/doors-state",
  authMiddleware,
  requerPermissao("controlid_status"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.estadoPortas,
);

// ═══════════════════════════════════════════════════════════════════════════════
// LOGS DE ACESSO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /controlid/devices/:id/access-logs
 * Busca logs de acesso de um dispositivo
 * Permissão: controlid_logs_visualizar
 */
router.get(
  "/devices/:id/access-logs",
  authMiddleware,
  requerPermissao("controlid_logs_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.QUERY]: Joi.object().keys({
      start_time: Joi.number().integer(),
      end_time: Joi.number().integer(),
      limit: Joi.number().integer().min(1).max(1000).default(100),
      offset: Joi.number().integer().min(0).default(0),
    }),
  }),
  ControlIdController.buscarLogsAcesso,
);

/**
 * GET /controlid/devices/:id/alarm-logs
 * Busca logs de alarme de um dispositivo
 * Permissão: controlid_logs_visualizar
 */
router.get(
  "/devices/:id/alarm-logs",
  authMiddleware,
  requerPermissao("controlid_logs_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.QUERY]: Joi.object().keys({
      start_time: Joi.number().integer(),
      end_time: Joi.number().integer(),
      limit: Joi.number().integer().min(1).max(1000).default(100),
    }),
  }),
  ControlIdController.buscarLogsAlarme,
);

// ═══════════════════════════════════════════════════════════════════════════════
// GRUPOS E REGRAS DE ACESSO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /controlid/devices/:id/groups
 * Lista grupos de um dispositivo
 * Permissão: controlid_usuarios_visualizar
 */
router.get(
  "/devices/:id/groups",
  authMiddleware,
  requerPermissao("controlid_usuarios_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.listarGrupos,
);

/**
 * POST /controlid/devices/:id/groups
 * Cria um grupo
 * Permissão: controlid_usuarios_gerenciar
 */
router.post(
  "/devices/:id/groups",
  authMiddleware,
  requerPermissao("controlid_usuarios_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      name: Joi.string().max(100).required(),
    }),
  }),
  ControlIdController.criarGrupo,
);

/**
 * GET /controlid/devices/:id/access-rules
 * Lista regras de acesso
 * Permissão: controlid_usuarios_visualizar
 */
router.get(
  "/devices/:id/access-rules",
  authMiddleware,
  requerPermissao("controlid_usuarios_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  ControlIdController.listarRegrasAcesso,
);

// ═══════════════════════════════════════════════════════════════════════════════
// LOGS DO SISTEMA (Microserviço)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /controlid/logs
 * Busca logs de operação do microserviço
 * Permissão: controlid_gerenciar
 */
router.get(
  "/logs",
  authMiddleware,
  requerPermissao("controlid_gerenciar"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      limit: Joi.number().integer().min(1).max(500).default(50),
      device_id: Joi.number().integer().positive(),
      operation: Joi.string().max(50),
      success: Joi.boolean(),
    }),
  }),
  ControlIdController.buscarLogsOperacao,
);

/**
 * GET /controlid/logs/stats
 * Busca estatísticas de operações
 * Permissão: controlid_gerenciar
 */
router.get(
  "/logs/stats",
  authMiddleware,
  requerPermissao("controlid_gerenciar"),
  ControlIdController.estatisticasOperacoes,
);

module.exports = router;
