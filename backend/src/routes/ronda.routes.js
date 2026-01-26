/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ROTAS: Ronda de Vigilante
 * Define todas as rotas do módulo de rondas com validações e permissões
 *
 * IMPORTANTE: A ordem das rotas importa! Rotas específicas devem vir ANTES
 * das rotas com parâmetros dinâmicos (/:id)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requerPermissao } = require("../middleware/permissaoMiddleware");
const RondaController = require("../controllers/RondaController");
const PontoControleController = require("../controllers/PontoControleController");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS DE PONTOS DE CONTROLE
// Rotas específicas primeiro para não serem capturadas por /:id
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /rondas/pontos-controle/setores
 * Lista setores distintos dos pontos de controle
 * Permissão: ronda_pontos_controle_visualizar
 */
router.get(
  "/pontos-controle/setores",
  authMiddleware,
  requerPermissao("ronda_pontos_controle_visualizar"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      empresa_id: Joi.number().integer().positive().allow(null),
    }),
  }),
  PontoControleController.listarSetores,
);

/**
 * GET /rondas/pontos-controle/estatisticas
 * Estatísticas dos pontos de controle
 * Permissão: ronda_pontos_controle_gerenciar
 */
router.get(
  "/pontos-controle/estatisticas",
  authMiddleware,
  requerPermissao("ronda_pontos_controle_gerenciar"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      empresa_id: Joi.number().integer().positive().allow(null),
      data_inicio: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow("", null),
      data_fim: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow("", null),
    }),
  }),
  PontoControleController.estatisticas,
);

/**
 * PUT /rondas/pontos-controle/reordenar
 * Reordena os pontos de controle
 * Permissão: ronda_pontos_controle_gerenciar
 */
router.put(
  "/pontos-controle/reordenar",
  authMiddleware,
  requerPermissao("ronda_pontos_controle_gerenciar"),
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      ordenacao: Joi.array()
        .items(
          Joi.object().keys({
            id: Joi.number().integer().positive().required(),
            ordem: Joi.number().integer().min(0).required(),
          }),
        )
        .min(1)
        .required(),
    }),
  }),
  PontoControleController.reordenar,
);

/**
 * GET /rondas/pontos-controle
 * Lista todos os pontos de controle
 * Permissão: ronda_pontos_controle_visualizar
 */
router.get(
  "/pontos-controle",
  authMiddleware,
  requerPermissao("ronda_pontos_controle_visualizar"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      empresa_id: Joi.number().integer().positive().allow(null),
      ativo: Joi.string().valid("true", "false").allow("", null),
      obrigatorio: Joi.string().valid("true", "false").allow("", null),
      setor: Joi.string().max(100).allow("", null),
    }),
  }),
  PontoControleController.listar,
);

/**
 * POST /rondas/pontos-controle
 * Cria um novo ponto de controle
 * Permissão: ronda_pontos_controle_gerenciar
 */
router.post(
  "/pontos-controle",
  authMiddleware,
  requerPermissao("ronda_pontos_controle_gerenciar"),
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      empresa_id: Joi.number().integer().positive().allow(null),
      nome: Joi.string().min(3).max(100).required().messages({
        "string.min": "Nome deve ter pelo menos 3 caracteres",
        "any.required": "Nome é obrigatório",
      }),
      descricao: Joi.string().max(500).allow("", null),
      codigo: Joi.string().max(50).allow("", null),
      latitude: Joi.number().min(-90).max(90).required().messages({
        "any.required": "Latitude é obrigatória",
      }),
      longitude: Joi.number().min(-180).max(180).required().messages({
        "any.required": "Longitude é obrigatória",
      }),
      raio: Joi.number().min(5).max(500).default(30).messages({
        "number.min": "Raio mínimo é 5 metros",
        "number.max": "Raio máximo é 500 metros",
      }),
      ordem: Joi.number().integer().min(0).allow(null),
      obrigatorio: Joi.boolean().default(true),
      local_referencia: Joi.string().max(200).allow("", null),
      setor: Joi.string().max(100).allow("", null),
      tipo: Joi.string()
        .valid("checkpoint", "entrada", "saida", "ponto_critico", "area_comum")
        .default("checkpoint"),
      foto_url: Joi.string().uri().max(500).allow("", null),
      tempo_minimo_segundos: Joi.number().integer().min(0).max(600).default(30),
    }),
  }),
  PontoControleController.criar,
);

/**
 * GET /rondas/pontos-controle/:id
 * Busca um ponto de controle específico
 * Permissão: ronda_pontos_controle_visualizar
 */
router.get(
  "/pontos-controle/:id",
  authMiddleware,
  requerPermissao("ronda_pontos_controle_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  PontoControleController.buscarPorId,
);

/**
 * PUT /rondas/pontos-controle/:id
 * Atualiza um ponto de controle
 * Permissão: ronda_pontos_controle_gerenciar
 */
router.put(
  "/pontos-controle/:id",
  authMiddleware,
  requerPermissao("ronda_pontos_controle_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().min(3).max(100),
      descricao: Joi.string().max(500).allow("", null),
      codigo: Joi.string().max(50).allow("", null),
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180),
      raio: Joi.number().min(5).max(500),
      ordem: Joi.number().integer().min(0),
      obrigatorio: Joi.boolean(),
      ativo: Joi.boolean(),
      local_referencia: Joi.string().max(200).allow("", null),
      setor: Joi.string().max(100).allow("", null),
      tipo: Joi.string().valid(
        "checkpoint",
        "entrada",
        "saida",
        "ponto_critico",
        "area_comum",
      ),
      foto_url: Joi.string().uri().max(500).allow("", null),
      tempo_minimo_segundos: Joi.number().integer().min(0).max(600),
    }),
  }),
  PontoControleController.atualizar,
);

/**
 * DELETE /rondas/pontos-controle/:id
 * Exclui ou desativa um ponto de controle
 * Permissão: ronda_pontos_controle_gerenciar
 */
router.delete(
  "/pontos-controle/:id",
  authMiddleware,
  requerPermissao("ronda_pontos_controle_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  PontoControleController.excluir,
);

/**
 * POST /rondas/pontos-controle/:id/validar-proximidade
 * Valida se coordenadas estão dentro do raio do ponto
 * Permissão: ronda_pontos_controle_visualizar
 */
router.post(
  "/pontos-controle/:id/validar-proximidade",
  authMiddleware,
  requerPermissao("ronda_pontos_controle_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().positive().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
    }),
  }),
  PontoControleController.validarProximidade,
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS DE GESTÃO (painel de gerenciamento de rondas)
// DEVEM VIR PRIMEIRO para não serem capturadas por /:id
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /rondas/gestao/listar
 * Lista todas as rondas (painel de gestão)
 * Permissão: ronda_gerenciar
 */
router.get(
  "/gestao/listar",
  authMiddleware,
  requerPermissao("ronda_gerenciar"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      pagina: Joi.number().integer().min(1).default(1),
      limite: Joi.number().integer().min(1).max(100).default(20),
      usuario_id: Joi.string().allow("", null),
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
  RondaController.listarTodasRondas,
);

/**
 * GET /rondas/gestao/estatisticas
 * Estatísticas de rondas
 * Permissão: ronda_gerenciar
 */
router.get(
  "/gestao/estatisticas",
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
  RondaController.estatisticas,
);

/**
 * GET /rondas/gestao/auditoria
 * Lista registros de auditoria
 * Permissão: ronda_gerenciar
 */
router.get(
  "/gestao/auditoria",
  authMiddleware,
  requerPermissao("ronda_gerenciar"),
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      pagina: Joi.number().integer().min(1).default(1),
      limite: Joi.number().integer().min(1).max(100).default(50),
      ronda_id: Joi.number().integer().positive().allow(null),
      usuario_id: Joi.string().allow("", null),
      tipo_acao: Joi.string()
        .valid(
          "INICIO",
          "CHECKPOINT",
          "TRAJETO",
          "FINALIZACAO",
          "CANCELAMENTO",
          "VISUALIZACAO",
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
  RondaController.listarAuditoria,
);

/**
 * GET /rondas/gestao/vigilantes
 * Lista vigilantes disponíveis para filtros
 * Permissão: ronda_gerenciar
 */
router.get(
  "/gestao/vigilantes",
  authMiddleware,
  requerPermissao("ronda_gerenciar"),
  RondaController.listarVigilantes,
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS DO VIGILANTE (usuário que realiza a ronda)
// Rotas específicas primeiro, depois as com parâmetros
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
  RondaController.iniciar,
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
  RondaController.buscarEmAndamento,
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
  RondaController.listarHistorico,
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS COM PARÂMETROS DINÂMICOS (/:id)
// DEVEM VIR POR ÚLTIMO para não capturar outras rotas
// ═══════════════════════════════════════════════════════════════════════════════

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
  RondaController.buscarDetalhes,
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
      // Campos para validação de ponto de controle
      ponto_controle_id: Joi.number().integer().positive().allow(null),
      distancia: Joi.number().min(0).allow(null),
      precisao: Joi.number().min(0).allow(null),
    }),
  }),
  RondaController.registrarCheckpoint,
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
  RondaController.registrarTrajeto,
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
  RondaController.finalizar,
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
  RondaController.cancelar,
);

module.exports = router;
