/**
 * Rotas de Autenticação
 * /auth/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const AuthController = require("../controllers/AuthController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// LOGIN (email + senha)
// POST /auth/login
// ═══════════════════════════════════════════════════════════════
router.post(
  "/login",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      email: Joi.string().required().email(),
      senha: Joi.string().required().min(1),
    }),
  }),
  AuthController.login
);

// ═══════════════════════════════════════════════════════════════
// LOGIN LEGADO (por ID) - Mantido para compatibilidade
// POST /auth/login-id
// ═══════════════════════════════════════════════════════════════
router.post(
  "/login-id",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),
  AuthController.loginPorId
);

// ═══════════════════════════════════════════════════════════════
// CRIAR SENHA (primeiro acesso)
// POST /auth/criar-senha
// ═══════════════════════════════════════════════════════════════
router.post(
  "/criar-senha",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      userId: Joi.string().required(),
      senha: Joi.string().required().min(6),
      confirmarSenha: Joi.string().required().min(6),
    }),
  }),
  AuthController.criarSenha
);

// ═══════════════════════════════════════════════════════════════
// ESQUECI SENHA (solicitar redefinição)
// POST /auth/esqueci-senha
// ═══════════════════════════════════════════════════════════════
router.post(
  "/esqueci-senha",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      email: Joi.string().required().email(),
    }),
  }),
  AuthController.esqueciSenha
);

// ═══════════════════════════════════════════════════════════════
// REDEFINIR SENHA (com token)
// POST /auth/redefinir-senha
// ═══════════════════════════════════════════════════════════════
router.post(
  "/redefinir-senha",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      token: Joi.string().required(),
      novaSenha: Joi.string().required().min(6),
      confirmarSenha: Joi.string().required().min(6),
    }),
  }),
  AuthController.redefinirSenha
);

// ═══════════════════════════════════════════════════════════════
// ALTERAR SENHA (usuário logado)
// PUT /auth/alterar-senha
// ═══════════════════════════════════════════════════════════════
router.put(
  "/alterar-senha",
  authMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      senhaAtual: Joi.string().required(),
      novaSenha: Joi.string().required().min(6),
      confirmarSenha: Joi.string().required().min(6),
    }),
  }),
  AuthController.alterarSenha
);

// ═══════════════════════════════════════════════════════════════
// VERIFICAR TOKEN
// GET /auth/verificar
// ═══════════════════════════════════════════════════════════════
router.get("/verificar", authMiddleware, AuthController.verificarToken);

// ═══════════════════════════════════════════════════════════════
// RECUPERAR ID (legado)
// POST /auth/recuperar-id
// ═══════════════════════════════════════════════════════════════
router.post(
  "/recuperar-id",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      email: Joi.string().required().email(),
      data_nascimento: Joi.string()
        .required()
        .regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  }),
  AuthController.recuperarId
);

module.exports = router;
