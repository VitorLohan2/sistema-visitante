/**
 * Rotas de Permissões
 * /permissoes/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const PermissaoController = require("../controllers/PermissaoController");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  requerPermissao,
  requerAdmin,
} = require("../middleware/permissaoMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// LISTAR TODAS AS PERMISSÕES
// GET /permissoes
// ═══════════════════════════════════════════════════════════════
router.get(
  "/",
  authMiddleware,
  requerPermissao("permissao_visualizar"),
  PermissaoController.index
);

// ═══════════════════════════════════════════════════════════════
// LISTAR PERMISSÕES AGRUPADAS POR MÓDULO
// GET /permissoes/modulos
// ═══════════════════════════════════════════════════════════════
router.get(
  "/modulos",
  authMiddleware,
  requerPermissao("permissao_visualizar"),
  PermissaoController.listarPorModulo
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR PERMISSÃO POR ID
// GET /permissoes/:id
// ═══════════════════════════════════════════════════════════════
router.get(
  "/:id",
  authMiddleware,
  requerPermissao("permissao_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),
  PermissaoController.show
);

// ═══════════════════════════════════════════════════════════════
// CRIAR NOVA PERMISSÃO
// POST /permissoes
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  authMiddleware,
  requerAdmin(),
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      chave: Joi.string()
        .required()
        .min(3)
        .max(150)
        .pattern(/^[a-z_]+$/),
      descricao: Joi.string().allow("", null).optional(),
    }),
  }),
  PermissaoController.create
);

// ═══════════════════════════════════════════════════════════════
// ATUALIZAR PERMISSÃO
// PUT /permissoes/:id
// ═══════════════════════════════════════════════════════════════
router.put(
  "/:id",
  authMiddleware,
  requerAdmin(),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      chave: Joi.string()
        .min(3)
        .max(150)
        .pattern(/^[a-z_]+$/)
        .optional(),
      descricao: Joi.string().allow("", null).optional(),
    }),
  }),
  PermissaoController.update
);

// ═══════════════════════════════════════════════════════════════
// DELETAR PERMISSÃO
// DELETE /permissoes/:id
// ═══════════════════════════════════════════════════════════════
router.delete(
  "/:id",
  authMiddleware,
  requerAdmin(),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),
  PermissaoController.delete
);

module.exports = router;
