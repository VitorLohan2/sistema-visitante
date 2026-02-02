const express = require("express");
const router = express.Router();
const {
  DeviceRepository,
  DEVICE_MODELS,
  DEVICE_STATUS,
} = require("../repositories");
const { ControlIdApiService, DeviceMonitorService } = require("../services");
const { validate, deviceSchemas } = require("../middleware");

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
// ROTAS DE DISPOSITIVOS
// ===========================================

/**
 * GET /devices
 * Listar todos os dispositivos
 */
router.get("/", (req, res, next) => {
  try {
    const devices = deviceRepo.findAll();
    res.json({
      success: true,
      data: devices,
      total: devices.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /devices/models
 * Listar modelos suportados
 */
router.get("/models", (req, res) => {
  res.json({
    success: true,
    data: Object.values(DEVICE_MODELS),
  });
});

/**
 * GET /devices/status-summary
 * Resumo de status dos dispositivos
 */
router.get("/status-summary", (req, res) => {
  const summary = DeviceMonitorService.getStatusSummary();
  res.json({
    success: true,
    data: summary,
  });
});

/**
 * POST /devices
 * Criar novo dispositivo
 */
router.post("/", validate(deviceSchemas.create), (req, res, next) => {
  try {
    // Verificar se IP já existe
    const existing = deviceRepo.findByIp(req.body.ip);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Já existe um dispositivo cadastrado com este IP",
        code: "IP_ALREADY_EXISTS",
      });
    }

    const device = deviceRepo.create(req.body);
    res.status(201).json({
      success: true,
      data: device,
      message: "Dispositivo criado com sucesso",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /devices/:id
 * Buscar dispositivo por ID
 */
router.get("/:id", (req, res, next) => {
  try {
    const device = deviceRepo.findById(req.params.id);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: "Dispositivo não encontrado",
        code: "DEVICE_NOT_FOUND",
      });
    }
    res.json({
      success: true,
      data: device,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /devices/:id
 * Atualizar dispositivo
 */
router.put("/:id", validate(deviceSchemas.update), (req, res, next) => {
  try {
    const device = deviceRepo.findById(req.params.id);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: "Dispositivo não encontrado",
        code: "DEVICE_NOT_FOUND",
      });
    }

    // Verificar se novo IP já existe em outro dispositivo
    if (req.body.ip && req.body.ip !== device.ip) {
      const existing = deviceRepo.findByIp(req.body.ip);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: "Já existe um dispositivo cadastrado com este IP",
          code: "IP_ALREADY_EXISTS",
        });
      }
    }

    const updated = deviceRepo.update(req.params.id, req.body);
    res.json({
      success: true,
      data: updated,
      message: "Dispositivo atualizado com sucesso",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /devices/:id
 * Deletar dispositivo
 */
router.delete("/:id", (req, res, next) => {
  try {
    const deleted = deviceRepo.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Dispositivo não encontrado",
        code: "DEVICE_NOT_FOUND",
      });
    }
    res.json({
      success: true,
      message: "Dispositivo deletado com sucesso",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /devices/:id/check-status
 * Verificar status do dispositivo
 */
router.post("/:id/check-status", async (req, res, next) => {
  try {
    const result = await DeviceMonitorService.checkDeviceById(req.params.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /devices/:id/system-info
 * Obter informações do sistema do dispositivo
 */
router.get("/:id/system-info", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.id);
    const systemInfo = await api.getSystemInformation();
    await api.logout();

    res.json({
      success: true,
      data: systemInfo,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /devices/:id/configuration
 * Obter configurações do dispositivo
 */
router.get("/:id/configuration", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.id);
    const config = await api.getConfiguration();
    await api.logout();

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /devices/:id/doors-state
 * Verificar estado das portas
 */
router.get("/:id/doors-state", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.id);
    const state = await api.getDoorsState();
    await api.logout();

    res.json({
      success: true,
      data: state,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
