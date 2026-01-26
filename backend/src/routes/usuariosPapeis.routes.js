/**
 * Rotas de Gerenciamento de Usuários e Papéis
 * /usuarios-papeis/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const UsuarioPapelController = require("../controllers/UsuarioPapelController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requerPermissao } = require("../middleware/permissaoMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// BUSCAR MINHAS PERMISSÕES (USUÁRIO LOGADO) - DEVE VIR ANTES DAS ROTAS COM :usuario_id
// GET /usuarios-papeis/me/permissoes
// ═══════════════════════════════════════════════════════════════
router.get(
  "/me/permissoes",
  authMiddleware,
  UsuarioPapelController.minhasPermissoes
);

// ═══════════════════════════════════════════════════════════════
// LISTAR TODOS OS USUÁRIOS COM SEUS PAPÉIS
// GET /usuarios-papeis
// ═══════════════════════════════════════════════════════════════
router.get(
  "/",
  authMiddleware,
  requerPermissao("usuario_gerenciar"),
  UsuarioPapelController.index
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR PAPÉIS DE UM USUÁRIO
// GET /usuarios-papeis/:usuario_id
// ═══════════════════════════════════════════════════════════════
router.get(
  "/:usuario_id",
  authMiddleware,
  requerPermissao("usuario_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      usuario_id: Joi.string().required(),
    }),
  }),
  UsuarioPapelController.show
);

// ═══════════════════════════════════════════════════════════════
// ATRIBUIR PAPÉIS A UM USUÁRIO
// POST /usuarios-papeis/:usuario_id/papeis
// ═══════════════════════════════════════════════════════════════
router.post(
  "/:usuario_id/papeis",
  authMiddleware,
  requerPermissao("usuario_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      usuario_id: Joi.string().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      papel_ids: Joi.array().items(Joi.number().integer()).required(),
    }),
  }),
  UsuarioPapelController.atribuirPapeis
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR PERMISSÕES DE UM USUÁRIO
// GET /usuarios-papeis/:usuario_id/permissoes
// ═══════════════════════════════════════════════════════════════
router.get(
  "/:usuario_id/permissoes",
  authMiddleware,
  requerPermissao("usuario_gerenciar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      usuario_id: Joi.string().required(),
    }),
  }),
  UsuarioPapelController.buscarPermissoes
);

module.exports = router;
