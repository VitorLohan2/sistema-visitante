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
const { adminMiddleware } = require("../middleware/adminMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// LISTAR TODOS OS USUÁRIOS (Admin only)
// GET /usuarios
// ═══════════════════════════════════════════════════════════════
router.get("/", authMiddleware, adminMiddleware, UsuarioController.index);

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
        // Campos antigos (inglês) - para compatibilidade
        name: Joi.string(),
        birthdate: Joi.string(),
        city: Joi.string(),
        // Campos comuns
        cpf: Joi.string()
          .required()
          .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/),
        empresa_id: Joi.number().integer().required(),
        setor_id: Joi.number().integer().required(),
        email: Joi.string().required().email(),
        whatsapp: Joi.string().required().min(10).max(11),
        uf: Joi.string().required().length(2),
        tipo: Joi.string().valid("ADM", "ADMIN", "USER").default("USER"),
        type: Joi.string().valid("ADM", "ADMIN", "USER"), // compatibilidade
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
  UsuarioController.create
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
  UsuarioController.show
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
        birthdate: Joi.string(),
        cpf: Joi.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/),
        empresa_id: Joi.number().integer(),
        setor_id: Joi.number().integer(),
        email: Joi.string().email(),
        whatsapp: Joi.string().min(10).max(11),
        cidade: Joi.string(),
        city: Joi.string(),
        uf: Joi.string().length(2),
      })
      .min(1),
  }),
  UsuarioController.update
);

// ═══════════════════════════════════════════════════════════════
// DELETAR USUÁRIO (Admin only)
// DELETE /usuarios/:id
// ═══════════════════════════════════════════════════════════════
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),
  UsuarioController.delete
);

module.exports = router;
