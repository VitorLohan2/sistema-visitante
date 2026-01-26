/**
 * Rotas de Empresas e Setores
 * /empresas/*, /setores/*, /empresas-visitantes/*, /setores-visitantes/*
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const EmpresasController = require("../controllers/EmpresasController");
const SetoresController = require("../controllers/SetoresController");
const EmpresasVisitantesController = require("../controllers/EmpresasVisitantesController");
const SetoresVisitantesController = require("../controllers/SetoresVisitantesController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// EMPRESAS (dos usuários do sistema)
// ═══════════════════════════════════════════════════════════════
router.get("/empresas", EmpresasController.index);

// ═══════════════════════════════════════════════════════════════
// SETORES (dos usuários do sistema)
// ═══════════════════════════════════════════════════════════════
router.get("/setores", SetoresController.index);

// ═══════════════════════════════════════════════════════════════
// EMPRESAS VISITANTES (empresas de onde vêm os visitantes)
// ═══════════════════════════════════════════════════════════════
router.get("/empresas-visitantes", EmpresasVisitantesController.index);

router.get("/empresas-visitantes/:id", EmpresasVisitantesController.show);

router.post(
  "/empresas-visitantes",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required().max(100),
      cnpj: Joi.string().max(14).allow(null, ""),
      telefone: Joi.string().max(11).allow(null, ""),
      email: Joi.string().email().max(100).allow(null, ""),
      endereco: Joi.string().max(255).allow(null, ""),
    }),
  }),
  EmpresasVisitantesController.create
);

router.put(
  "/empresas-visitantes/:id",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required().max(100),
      cnpj: Joi.string().max(14).allow(null, ""),
      telefone: Joi.string().max(11).allow(null, ""),
      email: Joi.string().email().max(100).allow(null, ""),
      endereco: Joi.string().max(255).allow(null, ""),
    }),
  }),
  EmpresasVisitantesController.update
);

router.delete(
  "/empresas-visitantes/:id",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
  }),
  EmpresasVisitantesController.delete
);

// ═══════════════════════════════════════════════════════════════
// SETORES VISITANTES (setores para onde os visitantes vão)
// ═══════════════════════════════════════════════════════════════
router.get("/setores-visitantes", SetoresVisitantesController.index);

module.exports = router;
