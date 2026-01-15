/**
 * Rotas de Veículos e Dados de Apoio para Visitantes
 * /veiculos-visitantes, /funcoes-visitantes, /cores-veiculos-visitantes, /tipos-veiculos-visitantes
 */

const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");
const FuncaoVisitanteController = require("../controllers/FuncaoVisitanteController");
const CorVeiculoVisitanteController = require("../controllers/CorVeiculoVisitanteController");
const TipoVeiculoVisitanteController = require("../controllers/TipoVeiculoVisitanteController");
const VeiculoVisitanteController = require("../controllers/VeiculoVisitanteController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES DE VISITANTES
// ═══════════════════════════════════════════════════════════════

// GET /funcoes-visitantes - Listar todas as funções
router.get("/funcoes-visitantes", FuncaoVisitanteController.index);

// GET /funcoes-visitantes/:id - Buscar função por ID
router.get(
  "/funcoes-visitantes/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
  }),
  FuncaoVisitanteController.show
);

// POST /funcoes-visitantes - Criar nova função (admin)
router.post(
  "/funcoes-visitantes",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required(),
    }),
  }),
  FuncaoVisitanteController.create
);

// PUT /funcoes-visitantes/:id - Atualizar função (admin)
router.put(
  "/funcoes-visitantes/:id",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required(),
    }),
  }),
  FuncaoVisitanteController.update
);

// DELETE /funcoes-visitantes/:id - Deletar função (admin)
router.delete(
  "/funcoes-visitantes/:id",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
  }),
  FuncaoVisitanteController.delete
);

// ═══════════════════════════════════════════════════════════════
// CORES DE VEÍCULOS
// ═══════════════════════════════════════════════════════════════

// GET /cores-veiculos-visitantes - Listar todas as cores
router.get("/cores-veiculos-visitantes", CorVeiculoVisitanteController.index);

// GET /cores-veiculos-visitantes/:id - Buscar cor por ID
router.get(
  "/cores-veiculos-visitantes/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
  }),
  CorVeiculoVisitanteController.show
);

// POST /cores-veiculos-visitantes - Criar nova cor (admin)
router.post(
  "/cores-veiculos-visitantes",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required(),
    }),
  }),
  CorVeiculoVisitanteController.create
);

// PUT /cores-veiculos-visitantes/:id - Atualizar cor (admin)
router.put(
  "/cores-veiculos-visitantes/:id",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required(),
    }),
  }),
  CorVeiculoVisitanteController.update
);

// DELETE /cores-veiculos-visitantes/:id - Deletar cor (admin)
router.delete(
  "/cores-veiculos-visitantes/:id",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
  }),
  CorVeiculoVisitanteController.delete
);

// ═══════════════════════════════════════════════════════════════
// TIPOS DE VEÍCULOS
// ═══════════════════════════════════════════════════════════════

// GET /tipos-veiculos-visitantes - Listar todos os tipos
router.get("/tipos-veiculos-visitantes", TipoVeiculoVisitanteController.index);

// GET /tipos-veiculos-visitantes/:id - Buscar tipo por ID
router.get(
  "/tipos-veiculos-visitantes/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
  }),
  TipoVeiculoVisitanteController.show
);

// POST /tipos-veiculos-visitantes - Criar novo tipo (admin)
router.post(
  "/tipos-veiculos-visitantes",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required(),
    }),
  }),
  TipoVeiculoVisitanteController.create
);

// PUT /tipos-veiculos-visitantes/:id - Atualizar tipo (admin)
router.put(
  "/tipos-veiculos-visitantes/:id",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required(),
    }),
  }),
  TipoVeiculoVisitanteController.update
);

// DELETE /tipos-veiculos-visitantes/:id - Deletar tipo (admin)
router.delete(
  "/tipos-veiculos-visitantes/:id",
  authMiddleware,
  adminMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
  }),
  TipoVeiculoVisitanteController.delete
);

// ═══════════════════════════════════════════════════════════════
// VEÍCULOS DE VISITANTES
// ═══════════════════════════════════════════════════════════════

// GET /veiculos-visitantes - Listar todos os veículos
router.get(
  "/veiculos-visitantes",
  authMiddleware,
  VeiculoVisitanteController.index
);

// GET /veiculos-visitantes/:id - Buscar veículo por ID
router.get(
  "/veiculos-visitantes/:id",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
  }),
  VeiculoVisitanteController.show
);

// GET /veiculos-visitantes/visitante/:visitanteId - Buscar veículo por visitante
router.get(
  "/veiculos-visitantes/visitante/:visitanteId",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      visitanteId: Joi.number().required(),
    }),
  }),
  VeiculoVisitanteController.showByVisitante
);

// POST /veiculos-visitantes - Criar ou atualizar veículo
router.post(
  "/veiculos-visitantes",
  authMiddleware,
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      visitante_id: Joi.number().required(),
      placa_veiculo: Joi.string().allow("", null).optional(),
      cor_veiculo_visitante_id: Joi.number().allow(null).optional(),
      tipo_veiculo_visitante_id: Joi.number().allow(null).optional(),
    }),
  }),
  VeiculoVisitanteController.createOrUpdate
);

// DELETE /veiculos-visitantes/:id - Deletar veículo
router.delete(
  "/veiculos-visitantes/:id",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
  }),
  VeiculoVisitanteController.delete
);

// DELETE /veiculos-visitantes/visitante/:visitanteId - Deletar veículo por visitante
router.delete(
  "/veiculos-visitantes/visitante/:visitanteId",
  authMiddleware,
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      visitanteId: Joi.number().required(),
    }),
  }),
  VeiculoVisitanteController.deleteByVisitante
);

module.exports = router;
