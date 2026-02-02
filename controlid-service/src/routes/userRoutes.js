const express = require("express");
const router = express.Router();
const { DeviceRepository } = require("../repositories");
const { ControlIdApiService } = require("../services");
const {
  validate,
  userSchemas,
  cardSchemas,
  uhfTagSchemas,
  qrCodeSchemas,
} = require("../middleware");

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
// ROTAS DE USUÁRIOS NO DISPOSITIVO
// ===========================================

/**
 * GET /devices/:deviceId/users
 * Listar usuários do dispositivo
 */
router.get("/:deviceId/users", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);

    const options = {};
    if (req.query.limit) options.limit = parseInt(req.query.limit);
    if (req.query.offset) options.offset = parseInt(req.query.offset);

    const result = await api.listUsers(options);
    await api.logout();

    res.json({
      success: true,
      data: result.users || [],
      total: result.users?.length || 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /devices/:deviceId/users
 * Criar usuário no dispositivo
 */
router.post(
  "/:deviceId/users",
  validate(userSchemas.create),
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.createUser(req.body);
      await api.logout();

      res.status(201).json({
        success: true,
        data: result,
        message: "Usuário criado no dispositivo com sucesso",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /devices/:deviceId/users/:userId
 * Buscar usuário específico no dispositivo
 */
router.get("/:deviceId/users/:userId", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const user = await api.getUserById(parseInt(req.params.userId));
    await api.logout();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Usuário não encontrado no dispositivo",
        code: "USER_NOT_FOUND",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /devices/:deviceId/users/registration/:registration
 * Buscar usuário por matrícula no dispositivo
 */
router.get(
  "/:deviceId/users/registration/:registration",
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const user = await api.getUserByRegistration(req.params.registration);
      await api.logout();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "Usuário não encontrado no dispositivo",
          code: "USER_NOT_FOUND",
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /devices/:deviceId/users/:userId
 * Atualizar usuário no dispositivo
 */
router.put(
  "/:deviceId/users/:userId",
  validate(userSchemas.update),
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.updateUser(
        parseInt(req.params.userId),
        req.body,
      );
      await api.logout();

      res.json({
        success: true,
        data: result,
        message: "Usuário atualizado no dispositivo com sucesso",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /devices/:deviceId/users/:userId
 * Deletar usuário no dispositivo
 */
router.delete("/:deviceId/users/:userId", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.deleteUser(parseInt(req.params.userId));
    await api.logout();

    res.json({
      success: true,
      data: result,
      message: "Usuário deletado do dispositivo com sucesso",
    });
  } catch (error) {
    next(error);
  }
});

// ===========================================
// ROTAS DE CARTÕES
// ===========================================

/**
 * GET /devices/:deviceId/cards
 * Listar cartões do dispositivo
 */
router.get("/:deviceId/cards", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.listCards();
    await api.logout();

    res.json({
      success: true,
      data: result.cards || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /devices/:deviceId/cards
 * Criar cartão no dispositivo
 */
router.post(
  "/:deviceId/cards",
  validate(cardSchemas.create),
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.createCard(req.body.user_id, req.body.value);
      await api.logout();

      res.status(201).json({
        success: true,
        data: result,
        message: "Cartão criado no dispositivo com sucesso",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /devices/:deviceId/cards/:cardId
 * Deletar cartão do dispositivo
 */
router.delete("/:deviceId/cards/:cardId", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.deleteCard(parseInt(req.params.cardId));
    await api.logout();

    res.json({
      success: true,
      data: result,
      message: "Cartão deletado do dispositivo com sucesso",
    });
  } catch (error) {
    next(error);
  }
});

// ===========================================
// ROTAS DE TAGS UHF
// ===========================================

/**
 * GET /devices/:deviceId/uhf-tags
 * Listar tags UHF do dispositivo
 */
router.get("/:deviceId/uhf-tags", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.listUhfTags();
    await api.logout();

    res.json({
      success: true,
      data: result.uhf_tags || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /devices/:deviceId/uhf-tags
 * Criar tag UHF no dispositivo
 */
router.post(
  "/:deviceId/uhf-tags",
  validate(uhfTagSchemas.create),
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.createUhfTag(req.body.user_id, req.body.value);
      await api.logout();

      res.status(201).json({
        success: true,
        data: result,
        message: "Tag UHF criada no dispositivo com sucesso",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /devices/:deviceId/uhf-tags/:tagId
 * Deletar tag UHF do dispositivo
 */
router.delete("/:deviceId/uhf-tags/:tagId", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.deleteUhfTag(parseInt(req.params.tagId));
    await api.logout();

    res.json({
      success: true,
      data: result,
      message: "Tag UHF deletada do dispositivo com sucesso",
    });
  } catch (error) {
    next(error);
  }
});

// ===========================================
// ROTAS DE QR CODES
// ===========================================

/**
 * GET /devices/:deviceId/qr-codes
 * Listar QR Codes do dispositivo
 */
router.get("/:deviceId/qr-codes", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.listQrCodes();
    await api.logout();

    res.json({
      success: true,
      data: result.qrcodes || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /devices/:deviceId/qr-codes
 * Criar QR Code no dispositivo
 */
router.post(
  "/:deviceId/qr-codes",
  validate(qrCodeSchemas.create),
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.createQrCode(req.body.user_id, req.body.value);
      await api.logout();

      res.status(201).json({
        success: true,
        data: result,
        message: "QR Code criado no dispositivo com sucesso",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /devices/:deviceId/qr-codes/:qrId
 * Deletar QR Code do dispositivo
 */
router.delete("/:deviceId/qr-codes/:qrId", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.deleteQrCode(parseInt(req.params.qrId));
    await api.logout();

    res.json({
      success: true,
      data: result,
      message: "QR Code deletado do dispositivo com sucesso",
    });
  } catch (error) {
    next(error);
  }
});

// ===========================================
// ROTAS DE TEMPLATES BIOMÉTRICOS
// ===========================================

/**
 * GET /devices/:deviceId/templates
 * Listar templates biométricos do dispositivo
 */
router.get("/:deviceId/templates", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const userId = req.query.user_id ? parseInt(req.query.user_id) : null;
    const result = await api.listTemplates(userId);
    await api.logout();

    res.json({
      success: true,
      data: result.templates || [],
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
