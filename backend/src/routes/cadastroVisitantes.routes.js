/**
 * Rotas de Cadastro de Visitantes
 * /cadastro-visitantes/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const multer = require("multer");
const multerConfig = require("../config/multer");
const CadastroVisitanteController = require("../controllers/CadastroVisitanteController");
const {
  authMiddleware,
  authOptional,
} = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

const router = express.Router();
const upload = multer(multerConfig);

// Middleware de tratamento de erros de upload
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: "Erro no upload",
      details:
        err.code === "LIMIT_FILE_SIZE"
          ? "Tamanho máximo por imagem: 3MB"
          : "Máximo de 3 imagens permitidas",
    });
  }
  next(err);
};

// ═══════════════════════════════════════════════════════════════
// LISTAR VISITANTES (paginado)
// GET /cadastro-visitantes
// ═══════════════════════════════════════════════════════════════
router.get(
  "/",
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      page: Joi.number().default(1),
      limit: Joi.number().default(10),
    }),
  }),
  CadastroVisitanteController.index
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR VISITANTES (por nome ou CPF) - PÚBLICO
// GET /cadastro-visitantes/buscar?query=xxx
// ═══════════════════════════════════════════════════════════════
router.get(
  "/buscar",
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      query: Joi.string().required(),
    }),
  }),
  CadastroVisitanteController.buscar
);

// ═══════════════════════════════════════════════════════════════
// VERIFICAR SE CPF EXISTE - PÚBLICO
// GET /cadastro-visitantes/cpf/:cpf
// ═══════════════════════════════════════════════════════════════
router.get(
  "/cpf/:cpf",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      cpf: Joi.string().required(),
    }),
  }),
  CadastroVisitanteController.verificarCpf
);

// ═══════════════════════════════════════════════════════════════
// CRIAR NOVO CADASTRO DE VISITANTE
// POST /cadastro-visitantes
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  authMiddleware,
  upload.array("fotos", 3),
  handleUploadErrors,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required(),
      nascimento: Joi.string().required(),
      cpf: Joi.string().required(),
      empresa: Joi.string().required(),
      setor: Joi.string().required(),
      telefone: Joi.string().required(),
      placa_veiculo: Joi.string().allow("", null).optional(),
      cor_veiculo: Joi.string().allow("", null).optional(),
      observacao: Joi.string().allow("", null),
    }),
  }),
  CadastroVisitanteController.create
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR VISITANTE ESPECÍFICO
// GET /cadastro-visitantes/:id
// ═══════════════════════════════════════════════════════════════
router.get(
  "/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
  }),
  CadastroVisitanteController.show
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR DADOS PARA CRACHÁ
// GET /cadastro-visitantes/:id/cracha
// ═══════════════════════════════════════════════════════════════
router.get(
  "/:id/cracha",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
  }),
  CadastroVisitanteController.cracha
);

// ═══════════════════════════════════════════════════════════════
// ATUALIZAR VISITANTE
// PUT /cadastro-visitantes/:id
// ═══════════════════════════════════════════════════════════════
router.put(
  "/:id",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required(),
      nascimento: Joi.string().required(),
      cpf: Joi.string().required(),
      empresa: Joi.string().required(),
      setor: Joi.string().required(),
      telefone: Joi.string().required(),
      placa_veiculo: Joi.string().allow("", null).optional(),
      cor_veiculo: Joi.string().allow("", null).optional(),
      observacao: Joi.string().allow("", null),
      bloqueado: Joi.boolean().optional(),
      avatar_imagem: Joi.string().uri().allow(null, ""),
    }),
  }),
  CadastroVisitanteController.update
);

// ═══════════════════════════════════════════════════════════════
// BLOQUEAR/DESBLOQUEAR VISITANTE (Admin only)
// PUT /cadastro-visitantes/:id/bloquear
// ═══════════════════════════════════════════════════════════════
router.put(
  "/:id/bloquear",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      bloqueado: Joi.boolean().required(),
    }),
  }),
  CadastroVisitanteController.bloquear
);

// ═══════════════════════════════════════════════════════════════
// DELETAR VISITANTE (Admin only)
// DELETE /cadastro-visitantes/:id
// ═══════════════════════════════════════════════════════════════
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
  }),
  CadastroVisitanteController.delete
);

module.exports = router;
