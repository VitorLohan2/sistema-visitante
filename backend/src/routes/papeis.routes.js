/**
 * Rotas de Papéis (Roles)
 * /papeis/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const PapelController = require("../controllers/PapelController");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  requerPermissao,
  requerAdmin,
} = require("../middleware/permissaoMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// LISTAR TODOS OS PAPÉIS
// GET /papeis
// ═══════════════════════════════════════════════════════════════
router.get(
  "/",
  authMiddleware,
  requerPermissao("papel_visualizar"),
  PapelController.index
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR PAPEL POR ID
// GET /papeis/:id
// ═══════════════════════════════════════════════════════════════
router.get(
  "/:id",
  authMiddleware,
  requerPermissao("papel_visualizar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),
  PapelController.show
);

// ═══════════════════════════════════════════════════════════════
// CRIAR NOVO PAPEL
// POST /papeis
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  authMiddleware,
  requerPermissao("papel_criar"),
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required().min(2).max(100),
      descricao: Joi.string().allow("", null).optional(),
    }),
  }),
  PapelController.create
);

// ═══════════════════════════════════════════════════════════════
// ATUALIZAR PAPEL
// PUT /papeis/:id
// ═══════════════════════════════════════════════════════════════
router.put(
  "/:id",
  authMiddleware,
  requerPermissao("papel_editar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().min(2).max(100).optional(),
      descricao: Joi.string().allow("", null).optional(),
    }),
  }),
  PapelController.update
);

// ═══════════════════════════════════════════════════════════════
// DELETAR PAPEL
// DELETE /papeis/:id
// ═══════════════════════════════════════════════════════════════
router.delete(
  "/:id",
  authMiddleware,
  requerPermissao("papel_deletar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
  }),
  PapelController.delete
);

// ═══════════════════════════════════════════════════════════════
// ATRIBUIR PERMISSÕES A UM PAPEL
// POST /papeis/:id/permissoes
// ═══════════════════════════════════════════════════════════════
router.post(
  "/:id/permissoes",
  authMiddleware,
  requerPermissao("papel_gerenciar_permissoes"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      permissao_ids: Joi.array().items(Joi.number().integer()).required(),
    }),
  }),
  PapelController.atribuirPermissoes
);

module.exports = router;
