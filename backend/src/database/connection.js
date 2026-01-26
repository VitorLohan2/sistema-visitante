/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONEXÃO COM BANCO DE DADOS - PostgreSQL via Knex
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Este arquivo gerencia a conexão com o banco de dados usando Knex.
 * A configuração é obtida do arquivo centralizado de configuração.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const knex = require("knex");
const {
  getConfig,
  getCurrentEnvironment,
  getSafeConnectionInfo,
} = require("../config/database");

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE TIPOS DO POSTGRESQL
// ═══════════════════════════════════════════════════════════════════════════════

// Configurar o pg para NÃO converter timestamps para Date do JavaScript
// Isso evita problemas de timezone pois o PostgreSQL retorna a string como foi salva
const pg = require("pg");
const types = pg.types;

// Tipo 1114 = TIMESTAMP WITHOUT TIMEZONE
// Mantém como string para evitar conversão de timezone
types.setTypeParser(1114, (stringValue) => {
  return stringValue; // Retorna a string como está, sem converter para Date
});

// ═══════════════════════════════════════════════════════════════════════════════
// CRIAÇÃO DA CONEXÃO
// ═══════════════════════════════════════════════════════════════════════════════

const environment = getCurrentEnvironment();
const config = getConfig(environment);

// Log de inicialização (sem expor dados sensíveis)
console.log(`🔗 [Database] Conectando ao ambiente: ${environment}`);
console.log(`📊 [Database] Configuração:`, getSafeConnectionInfo(environment));

const connection = knex(config);

// ═══════════════════════════════════════════════════════════════════════════════
// TESTE DE CONEXÃO (OPCIONAL - APENAS EM DESENVOLVIMENTO)
// ═══════════════════════════════════════════════════════════════════════════════

if (process.env.DB_TEST_CONNECTION === "true") {
  connection
    .raw("SELECT 1")
    .then(() => {
      console.log("✅ [Database] Conexão estabelecida com sucesso!");
    })
    .catch((err) => {
      console.error("❌ [Database] Falha na conexão:", err.message);
    });
}

module.exports = connection;
