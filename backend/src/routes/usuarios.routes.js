/**
 * Rotas de Usuários
 * /usuarios/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const UsuarioController = require("../controllers/UsuarioController");
const {
  authMiddleware,
  authOptional,
} = require("../middleware/authMiddleware");
const { requerPermissao } = require("../middleware/permissaoMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// LISTAR TODOS OS USUÁRIOS
// GET /usuarios
// ═══════════════════════════════════════════════════════════════
router.get(
  "/",
  authMiddleware,
  requerPermissao("usuario_visualizar"),
  UsuarioController.index,
);

// ═══════════════════════════════════════════════════════════════
// CRIAR NOVO USUÁRIO (Cadastro público - com código de acesso)
// POST /usuarios
// ═══════════════════════════════════════════════════════════════
router.post(
  "/",
  celebrate({
    [Segments.BODY]: Joi.object()
      .keys({
        // Campos novos (português)
        nome: Joi.string(),
        data_nascimento: Joi.string(),
        cidade: Joi.string(),
        // Campos antigos (inglês) - para compatibilidade (DEPRECATED - usar os novos)
        name: Joi.string(),
        nascimento: Joi.string(),
        // Campos comuns
        cpf: Joi.string()
          .required()
          .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/),
        empresa_id: Joi.number().integer().required(),
        setor_id: Joi.number().integer().required(),
        email: Joi.string().required().email(),
        whatsapp: Joi.string().required().min(10).max(11),
        uf: Joi.string().required().length(2),
        tipo: Joi.string().valid("USER").default("USER"), // Apenas USER - admin via papéis
        codigo_acesso: Joi.when("tipo", {
          is: "USER",
          then: Joi.string()
            .required()
            .pattern(/^[A-Z0-9]{3,20}$/),
          otherwise: Joi.string().optional(),
        }),
        senha: Joi.string().min(6).optional(), // Senha opcional no cadastro
      })
      .or("nome", "name"), // Pelo menos um dos dois
  }),
  UsuarioController.create,
);

// ═══════════════════════════════════════════════════════════════
// CRIAR USUÁRIO INTERNO (sem código de acesso)
// POST /usuarios/interno
// ═══════════════════════════════════════════════════════════════
router.post(
  "/interno",
  authMiddleware,
  requerPermissao("usuario_criar"),
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required(),
      data_nascimento: Joi.string().allow("", null),
      cpf: Joi.string()
        .required()
        .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/),
      empresa_id: Joi.number().integer().allow(null),
      setor_id: Joi.number().integer().allow(null),
      email: Joi.string().required().email(),
      whatsapp: Joi.string().min(10).max(11).allow("", null),
      cidade: Joi.string().allow("", null),
      uf: Joi.string().length(2).allow("", null),
      papel_id: Joi.number().integer().required(), // Papel obrigatório para vincular em usuarios_papeis
      senha: Joi.string().min(6).required(), // Senha obrigatória para usuário interno
    }),
  }),
  UsuarioController.createInterno,
);

// ═══════════════════════════════════════════════════════════════
// BUSCAR PERFIL DO USUÁRIO LOGADO
// GET /usuarios/perfil
// ═══════════════════════════════════════════════════════════════
router.get("/perfil", authMiddleware, UsuarioController.perfil);

// ═══════════════════════════════════════════════════════════════
// BUSCAR USUÁRIO ESPECÍFICO
// GET /usuarios/:id
// ═══════════════════════════════════════════════════════════════
router.get(
  "/:id",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),
  UsuarioController.show,
);

// ═══════════════════════════════════════════════════════════════
// ATUALIZAR USUÁRIO
// PUT /usuarios/:id
// ═══════════════════════════════════════════════════════════════
router.put(
  "/:id",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required(),
    }),
    [Segments.BODY]: Joi.object()
      .keys({
        nome: Joi.string(),
        name: Joi.string(),
        data_nascimento: Joi.string(),
        nascimento: Joi.string(),
        cpf: Joi.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/),
        empresa_id: Joi.number().integer(),
        setor_id: Joi.number().integer(),
        email: Joi.string().email(),
        whatsapp: Joi.string().min(10).max(11),
        cidade: Joi.string(),
        uf: Joi.string().length(2),
      })
      .min(1),
  }),
  UsuarioController.update,
);

// ═══════════════════════════════════════════════════════════════
// DELETAR USUÁRIO
// DELETE /usuarios/:id
// ═══════════════════════════════════════════════════════════════
router.delete(
  "/:id",
  authMiddleware,
  requerPermissao("usuario_deletar"),
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),
  UsuarioController.delete,
);

module.exports = router;
