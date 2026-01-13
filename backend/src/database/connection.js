const knex = require("knex");
const configuration = require("../../knexfile");

// Configurar o pg para NÃO converter timestamps para Date do JavaScript
// Isso evita problemas de timezone pois o PostgreSQL retorna a string como foi salva
const pg = require("pg");
const types = pg.types;

// Tipo 1114 = TIMESTAMP WITHOUT TIMEZONE
// Mantém como string para evitar conversão de timezone
types.setTypeParser(1114, (stringValue) => {
  return stringValue; // Retorna a string como está, sem converter para Date
});

const environment =
  process.env.NODE_ENV === "docker"
    ? "docker"
    : process.env.NODE_ENV || "development";
const config = configuration[environment];

const connection = knex(config);

module.exports = connection;
