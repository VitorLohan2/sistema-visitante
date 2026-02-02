const express = require("express");
const router = express.Router();
const { DeviceRepository } = require("../repositories");
const { ControlIdApiService } = require("../services");
const { validate, actionSchemas } = require("../middleware");

const deviceRepo = new DeviceRepository();

/**
 * Helper para obter serviço de API do dispositivo
 */
const getDeviceApi = (deviceId) => {
  const device = deviceRepo.findById(deviceId);
  if (!device) {
    const error = new Error("Dispositivo não encontrado");
    error.statusCode = 404;
    throw error;
  }
  return { device, api: new ControlIdApiService(device) };
};

// ===========================================
// ROTAS DE AÇÕES DE CONTROLE
// ===========================================

/**
 * POST /devices/:deviceId/actions/open-door
 * Abrir porta/relé (iDAccess, iDFit, iDBox, iDUHF)
 */
router.post(
  "/:deviceId/actions/open-door",
  validate(actionSchemas.openDoor),
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.openDoor(req.body.door_id);
      await api.logout();

      res.json({
        success: true,
        data: result,
        message: `Porta ${req.body.door_id} aberta com sucesso`,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /devices/:deviceId/actions/open-sec-box
 * Abrir porta via SecBox (iDFlex, iDAccess Pro, iDAccess Nano)
 */
router.post(
  "/:deviceId/actions/open-sec-box",
  validate(actionSchemas.openSecBox),
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.openSecBox(req.body.sec_box_id, req.body.reason);
      await api.logout();

      res.json({
        success: true,
        data: result,
        message: "SecBox acionada com sucesso",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /devices/:deviceId/actions/release-turnstile
 * Liberar catraca
 */
router.post(
  "/:deviceId/actions/release-turnstile",
  validate(actionSchemas.releaseTurnstile),
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.releaseTurnstile(req.body.direction);
      await api.logout();

      const directionMap = {
        clockwise: "sentido horário",
        anticlockwise: "sentido anti-horário",
        both: "ambos sentidos",
      };

      res.json({
        success: true,
        data: result,
        message: `Catraca liberada - ${directionMap[req.body.direction]}`,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /devices/:deviceId/actions/execute
 * Executar ações personalizadas
 */
router.post("/:deviceId/actions/execute", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);

    if (!req.body.actions || !Array.isArray(req.body.actions)) {
      return res.status(400).json({
        success: false,
        error: "Array de ações é obrigatório",
        code: "INVALID_ACTIONS",
      });
    }

    const result = await api.executeActions(req.body.actions);
    await api.logout();

    res.json({
      success: true,
      data: result,
      message: "Ações executadas com sucesso",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /devices/:deviceId/actions/doors-state
 * Verificar estado das portas
 */
router.get("/:deviceId/actions/doors-state", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.getDoorsState();
    await api.logout();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
