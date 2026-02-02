const Joi = require("joi");
const { DEVICE_MODELS } = require("../repositories");

/**
 * Middleware de validação usando Joi
 */
const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      error.isJoi = true;
      return next(error);
    }

    req[property] = value;
    next();
  };
};

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================

// Dispositivos
const deviceSchemas = {
  create: Joi.object({
    id: Joi.string().uuid(),
    name: Joi.string().min(1).max(100).required(),
    ip: Joi.string()
      .ip({ version: ["ipv4"] })
      .required(),
    port: Joi.number().integer().min(1).max(65535).default(80),
    login: Joi.string().max(50).default("admin"),
    password: Joi.string().max(100).default("admin"),
    model: Joi.string()
      .valid(...Object.values(DEVICE_MODELS))
      .required(),
    description: Joi.string().max(500),
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(100),
    ip: Joi.string().ip({ version: ["ipv4"] }),
    port: Joi.number().integer().min(1).max(65535),
    login: Joi.string().max(50),
    password: Joi.string().max(100),
    model: Joi.string().valid(...Object.values(DEVICE_MODELS)),
    description: Joi.string().max(500).allow(null, ""),
  }),
};

// Usuários no dispositivo
const userSchemas = {
  create: Joi.object({
    id: Joi.number().integer().positive(),
    registration: Joi.string().max(50).required(),
    name: Joi.string().max(100).required(),
    password: Joi.string().max(100),
    user_type_id: Joi.number().integer().valid(0, 1), // 0 = usuário, 1 = visitante
    begin_time: Joi.number().integer().min(0),
    end_time: Joi.number().integer().min(0),
  }),

  update: Joi.object({
    registration: Joi.string().max(50),
    name: Joi.string().max(100),
    password: Joi.string().max(100),
    user_type_id: Joi.number().integer().valid(0, 1),
    begin_time: Joi.number().integer().min(0),
    end_time: Joi.number().integer().min(0),
  }),
};

// Cartões
const cardSchemas = {
  create: Joi.object({
    user_id: Joi.number().integer().positive().required(),
    value: Joi.number().integer().positive().required(),
  }),
};

// Tags UHF
const uhfTagSchemas = {
  create: Joi.object({
    user_id: Joi.number().integer().positive().required(),
    value: Joi.string().max(100).required(),
  }),
};

// QR Codes
const qrCodeSchemas = {
  create: Joi.object({
    user_id: Joi.number().integer().positive().required(),
    value: Joi.string().max(500).required(),
  }),
};

// Grupos
const groupSchemas = {
  create: Joi.object({
    name: Joi.string().max(100).required(),
  }),
};

// Regras de acesso
const accessRuleSchemas = {
  create: Joi.object({
    name: Joi.string().max(100).required(),
    type: Joi.number().integer().valid(0, 1).default(1), // 0 = bloqueio, 1 = permissão
    priority: Joi.number().integer().default(0),
  }),
};

// Horários
const timeZoneSchemas = {
  create: Joi.object({
    name: Joi.string().max(100).required(),
  }),

  timeSpan: Joi.object({
    start: Joi.number().integer().min(0).max(86400).required(), // segundos desde 00:00
    end: Joi.number().integer().min(0).max(86400).required(),
    sun: Joi.number().integer().valid(0, 1).default(0),
    mon: Joi.number().integer().valid(0, 1).default(1),
    tue: Joi.number().integer().valid(0, 1).default(1),
    wed: Joi.number().integer().valid(0, 1).default(1),
    thu: Joi.number().integer().valid(0, 1).default(1),
    fri: Joi.number().integer().valid(0, 1).default(1),
    sat: Joi.number().integer().valid(0, 1).default(0),
    hol1: Joi.number().integer().valid(0, 1).default(0),
    hol2: Joi.number().integer().valid(0, 1).default(0),
    hol3: Joi.number().integer().valid(0, 1).default(0),
  }),
};

// Feriados
const holidaySchemas = {
  create: Joi.object({
    name: Joi.string().max(100).required(),
    start: Joi.number().integer().required(), // Unix timestamp
    end: Joi.number().integer().required(),
    hol1: Joi.number().integer().valid(0, 1).default(1),
    hol2: Joi.number().integer().valid(0, 1).default(0),
    hol3: Joi.number().integer().valid(0, 1).default(0),
    repeats: Joi.number().integer().valid(0, 1).default(0),
  }),
};

// Ações de controle
const actionSchemas = {
  openDoor: Joi.object({
    door_id: Joi.number().integer().min(1).max(10).default(1),
  }),

  openSecBox: Joi.object({
    sec_box_id: Joi.number().integer().default(65793),
    reason: Joi.number().integer().default(3),
  }),

  releaseTurnstile: Joi.object({
    direction: Joi.string()
      .valid("clockwise", "anticlockwise", "both")
      .default("both"),
  }),
};

// Logs de acesso
const accessLogSchemas = {
  query: Joi.object({
    start_time: Joi.number().integer(),
    end_time: Joi.number().integer(),
    user_id: Joi.number().integer(),
    limit: Joi.number().integer().min(1).max(10000).default(100),
    offset: Joi.number().integer().min(0).default(0),
  }),
};

module.exports = {
  validate,
  deviceSchemas,
  userSchemas,
  cardSchemas,
  uhfTagSchemas,
  qrCodeSchemas,
  groupSchemas,
  accessRuleSchemas,
  timeZoneSchemas,
  holidaySchemas,
  actionSchemas,
  accessLogSchemas,
};
