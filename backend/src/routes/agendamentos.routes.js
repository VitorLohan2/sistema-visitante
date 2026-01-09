/**
 * Rotas de Agendamentos
 * /agendamentos/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const multer = require("multer");
const uploadAgendamento = require("../config/multerAgendamentos");
const AgendamentoController = require("../controllers/AgendamentoController");
const {
  authMiddleware,
  authOptional,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Middleware de tratamento de erros de upload
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: "Erro no upload",
      details:
        err.code === "LIMIT_FILE_SIZE"
          ? "Tamanho máximo permitido: 3MB"
          : err.message,
    });
  }
  next(err);
};

// ═══════════════════════════════════════════════════════════════
// LISTAR AGENDAMENTOS (público)
// GET /agendamentos
// ═══════════════════════════════════════════════════════════════
router.get("/", AgendamentoController.index);

// ═══════════════════════════════════════════════════════════════
// RELATÓRIO DE PRESENÇAS
// GET /agendamentos/relatorio/presencas
// ═══════════════════════════════════════════════════════════════
router.get(
  "/relatorio/presencas",
  authMiddleware,
  AgendamentoController.relatorioPresencas
);

// ═══════════════════════════════════════════════════════════════
// CRIAR AGENDAMENTO
// POST /agendamentos
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  authMiddleware,
  uploadAgendamento.single("foto_colaborador"),
  handleUploadErrors,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required().max(100),
      cpf: Joi.string()
        .required()
        .regex(/^\d{11}$/),
      setor_id: Joi.number().integer().required(),
      setor: Joi.string().required().max(100),
      horario_agendado: Joi.date().iso().required(),
      observacao: Joi.string().allow("", null).max(500),
      criado_por: Joi.string().required().max(100),
      foto_colaborador: Joi.any().optional(),
    }),
  }),
  AgendamentoController.create
);

// ═══════════════════════════════════════════════════════════════
// CONFIRMAR AGENDAMENTO
// PUT /agendamentos/:id/confirmar
// ═══════════════════════════════════════════════════════════════
router.put(
  "/:id/confirmar",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),
  AgendamentoController.confirmar
);

// ═══════════════════════════════════════════════════════════════
// REGISTRAR PRESENÇA
// PUT /agendamentos/:id/presenca
// ═══════════════════════════════════════════════════════════════
router.put("/:id/presenca", AgendamentoController.presenca);

// ═══════════════════════════════════════════════════════════════
// DELETAR AGENDAMENTO
// DELETE /agendamentos/:id
// ═══════════════════════════════════════════════════════════════
router.delete(
  "/:id",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),
  AgendamentoController.delete
);

module.exports = router;
