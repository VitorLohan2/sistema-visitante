const authMiddleware = require("./authMiddleware");
const errorHandler = require("./errorHandler");
const {
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
} = require("./validation");

module.exports = {
  authMiddleware,
  errorHandler,
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
