const express = require("express");
const router = express.Router();
const { DeviceRepository } = require("../repositories");
const { ControlIdApiService } = require("../services");
const {
  validate,
  groupSchemas,
  accessRuleSchemas,
  timeZoneSchemas,
  holidaySchemas,
  accessLogSchemas,
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
// ROTAS DE GRUPOS
// ===========================================

/**
 * GET /devices/:deviceId/groups
 * Listar grupos do dispositivo
 */
router.get("/:deviceId/groups", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.listGroups();
    await api.logout();

    res.json({
      success: true,
      data: result.groups || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /devices/:deviceId/groups
 * Criar grupo no dispositivo
 */
router.post(
  "/:deviceId/groups",
  validate(groupSchemas.create),
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.createGroup(req.body.name);
      await api.logout();

      res.status(201).json({
        success: true,
        data: result,
        message: "Grupo criado no dispositivo com sucesso",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /devices/:deviceId/groups/:groupId/users/:userId
 * Adicionar usuário ao grupo
 */
router.post(
  "/:deviceId/groups/:groupId/users/:userId",
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.addUserToGroup(
        parseInt(req.params.userId),
        parseInt(req.params.groupId),
      );
      await api.logout();

      res.json({
        success: true,
        data: result,
        message: "Usuário adicionado ao grupo com sucesso",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /devices/:deviceId/groups/:groupId/users/:userId
 * Remover usuário do grupo
 */
router.delete(
  "/:deviceId/groups/:groupId/users/:userId",
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.removeUserFromGroup(
        parseInt(req.params.userId),
        parseInt(req.params.groupId),
      );
      await api.logout();

      res.json({
        success: true,
        data: result,
        message: "Usuário removido do grupo com sucesso",
      });
    } catch (error) {
      next(error);
    }
  },
);

// ===========================================
// ROTAS DE REGRAS DE ACESSO
// ===========================================

/**
 * GET /devices/:deviceId/access-rules
 * Listar regras de acesso do dispositivo
 */
router.get("/:deviceId/access-rules", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.listAccessRules();
    await api.logout();

    res.json({
      success: true,
      data: result.access_rules || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /devices/:deviceId/access-rules
 * Criar regra de acesso no dispositivo
 */
router.post(
  "/:deviceId/access-rules",
  validate(accessRuleSchemas.create),
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.createAccessRule(
        req.body.name,
        req.body.type,
        req.body.priority,
      );
      await api.logout();

      res.status(201).json({
        success: true,
        data: result,
        message: "Regra de acesso criada no dispositivo com sucesso",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /devices/:deviceId/access-rules/:ruleId/groups/:groupId
 * Vincular grupo a regra de acesso
 */
router.post(
  "/:deviceId/access-rules/:ruleId/groups/:groupId",
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.addGroupToAccessRule(
        parseInt(req.params.groupId),
        parseInt(req.params.ruleId),
      );
      await api.logout();

      res.json({
        success: true,
        data: result,
        message: "Grupo vinculado à regra de acesso com sucesso",
      });
    } catch (error) {
      next(error);
    }
  },
);

// ===========================================
// ROTAS DE HORÁRIOS
// ===========================================

/**
 * GET /devices/:deviceId/time-zones
 * Listar horários do dispositivo
 */
router.get("/:deviceId/time-zones", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.listTimeZones();
    await api.logout();

    res.json({
      success: true,
      data: result.time_zones || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /devices/:deviceId/time-zones
 * Criar horário no dispositivo
 */
router.post(
  "/:deviceId/time-zones",
  validate(timeZoneSchemas.create),
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.createTimeZone(req.body.name);
      await api.logout();

      res.status(201).json({
        success: true,
        data: result,
        message: "Horário criado no dispositivo com sucesso",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /devices/:deviceId/time-zones/:timeZoneId/time-spans
 * Listar intervalos de um horário
 */
router.get(
  "/:deviceId/time-zones/:timeZoneId/time-spans",
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.listTimeSpans(parseInt(req.params.timeZoneId));
      await api.logout();

      res.json({
        success: true,
        data: result.time_spans || [],
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /devices/:deviceId/time-zones/:timeZoneId/time-spans
 * Criar intervalo de horário
 */
router.post(
  "/:deviceId/time-zones/:timeZoneId/time-spans",
  validate(timeZoneSchemas.timeSpan),
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.createTimeSpan(
        parseInt(req.params.timeZoneId),
        req.body,
      );
      await api.logout();

      res.status(201).json({
        success: true,
        data: result,
        message: "Intervalo criado no dispositivo com sucesso",
      });
    } catch (error) {
      next(error);
    }
  },
);

// ===========================================
// ROTAS DE FERIADOS
// ===========================================

/**
 * GET /devices/:deviceId/holidays
 * Listar feriados do dispositivo
 */
router.get("/:deviceId/holidays", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.listHolidays();
    await api.logout();

    res.json({
      success: true,
      data: result.holidays || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /devices/:deviceId/holidays
 * Criar feriado no dispositivo
 */
router.post(
  "/:deviceId/holidays",
  validate(holidaySchemas.create),
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);
      const result = await api.createHoliday(req.body);
      await api.logout();

      res.status(201).json({
        success: true,
        data: result,
        message: "Feriado criado no dispositivo com sucesso",
      });
    } catch (error) {
      next(error);
    }
  },
);

// ===========================================
// ROTAS DE ÁREAS E PORTAIS
// ===========================================

/**
 * GET /devices/:deviceId/areas
 * Listar áreas do dispositivo
 */
router.get("/:deviceId/areas", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.listAreas();
    await api.logout();

    res.json({
      success: true,
      data: result.areas || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /devices/:deviceId/portals
 * Listar portais do dispositivo
 */
router.get("/:deviceId/portals", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.listPortals();
    await api.logout();

    res.json({
      success: true,
      data: result.portals || [],
    });
  } catch (error) {
    next(error);
  }
});

// ===========================================
// ROTAS DE LOGS DE ACESSO
// ===========================================

/**
 * GET /devices/:deviceId/access-logs
 * Listar logs de acesso do dispositivo
 */
router.get(
  "/:deviceId/access-logs",
  validate(accessLogSchemas.query, "query"),
  async (req, res, next) => {
    try {
      const { api } = getDeviceApi(req.params.deviceId);

      const options = {
        limit: req.query.limit,
        offset: req.query.offset,
        order: ["time", "descending"],
      };

      // Filtros opcionais
      if (req.query.start_time || req.query.end_time || req.query.user_id) {
        options.where = { access_logs: {} };

        if (req.query.start_time && req.query.end_time) {
          options.where.access_logs.time = {
            ">=": req.query.start_time,
            "<=": req.query.end_time,
          };
        } else if (req.query.start_time) {
          options.where.access_logs.time = { ">=": req.query.start_time };
        } else if (req.query.end_time) {
          options.where.access_logs.time = { "<=": req.query.end_time };
        }

        if (req.query.user_id) {
          options.where.access_logs.user_id = req.query.user_id;
        }
      }

      const result = await api.listAccessLogs(options);
      await api.logout();

      res.json({
        success: true,
        data: result.access_logs || [],
        total: result.access_logs?.length || 0,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ===========================================
// ROTAS DE ALARMES
// ===========================================

/**
 * GET /devices/:deviceId/alarm-logs
 * Listar logs de alarme do dispositivo
 */
router.get("/:deviceId/alarm-logs", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);

    const options = {};
    if (req.query.limit) options.limit = parseInt(req.query.limit);
    if (req.query.offset) options.offset = parseInt(req.query.offset);

    const result = await api.listAlarmLogs(options);
    await api.logout();

    res.json({
      success: true,
      data: result.alarm_logs || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /devices/:deviceId/alarm-zones
 * Listar zonas de alarme do dispositivo
 */
router.get("/:deviceId/alarm-zones", async (req, res, next) => {
  try {
    const { api } = getDeviceApi(req.params.deviceId);
    const result = await api.listAlarmZones();
    await api.logout();

    res.json({
      success: true,
      data: result.alarm_zones || [],
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
