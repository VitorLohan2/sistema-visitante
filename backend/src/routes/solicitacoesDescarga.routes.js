// routes/solicitacoesDescarga.routes.js
const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const SolicitacaoDescargaController = require("../controllers/SolicitacaoDescargaController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requerPermissao } = require("../middleware/permissaoMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// ROTA PÚBLICA (SEM AUTENTICAÇÃO) - Para empresas externas
// ═══════════════════════════════════════════════════════════════

/**
 * POST /solicitacoes-descarga
 * Criar nova solicitação de descarga (PÚBLICO)
 */
router.post(
  "/",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      empresa_nome: Joi.string().required().max(150),
      empresa_cnpj: Joi.string().required().min(14).max(18),
      empresa_email: Joi.string().required().email(),
      empresa_contato: Joi.string().max(100).allow("", null),
      empresa_telefone: Joi.string().max(20).allow("", null),
      motorista_nome: Joi.string().required().max(150),
      motorista_cpf: Joi.string().required().min(11).max(14),
      placa_veiculo: Joi.string().required().max(10),
      tipo_veiculo: Joi.string().max(50).allow("", null),
      tipo_carga: Joi.string().required().max(100),
      observacao: Joi.string().allow("", null),
      horario_solicitado: Joi.string().required().isoDate(),
    }),
  }),
  SolicitacaoDescargaController.create
);

// ═══════════════════════════════════════════════════════════════
// ROTAS INTERNAS (COM AUTENTICAÇÃO E RBAC)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /solicitacoes-descarga/pendentes/count
 * Contar solicitações pendentes (para badge no menu)
 */
router.get(
  "/pendentes/count",
  authMiddleware,
  SolicitacaoDescargaController.countPendentes
);

/**
 * GET /solicitacoes-descarga
 * Listar todas as solicitações (com filtros e paginação)
 */
router.get(
  "/",
  authMiddleware,
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      status: Joi.string().valid("PENDENTE", "APROVADO", "REJEITADO"),
      data_inicio: Joi.string().isoDate(),
      data_fim: Joi.string().isoDate(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
  }),
  SolicitacaoDescargaController.index
);

/**
 * GET /solicitacoes-descarga/:id
 * Buscar solicitação por ID (com histórico)
 */
router.get(
  "/:id",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),
  SolicitacaoDescargaController.show
);

/**
 * POST /solicitacoes-descarga/:id/aprovar
 * Aprovar solicitação (cria agendamento automaticamente)
 */
router.post(
  "/:id/aprovar",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      observacao: Joi.string().allow("", null),
    }),
  }),
  SolicitacaoDescargaController.aprovar
);

/**
 * POST /solicitacoes-descarga/:id/rejeitar
 * Rejeitar solicitação
 */
router.post(
  "/:id/rejeitar",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      observacao: Joi.string().allow("", null),
    }),
  }),
  SolicitacaoDescargaController.rejeitar
);

/**
 * POST /solicitacoes-descarga/:id/ajustar-horario
 * Ajustar horário da solicitação
 */
router.post(
  "/:id/ajustar-horario",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      novo_horario: Joi.string().required().isoDate(),
      observacao: Joi.string().allow("", null),
    }),
  }),
  SolicitacaoDescargaController.ajustarHorario
);

module.exports = router;
