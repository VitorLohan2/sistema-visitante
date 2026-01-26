/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * KNEXFILE - Configuração para Knex CLI
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Este arquivo é usado pelo Knex CLI para executar migrations e seeds.
 * As configurações são importadas do arquivo centralizado de configuração.
 *
 * Comandos disponíveis:
 * - npx knex migrate:latest --env docker
 * - npx knex migrate:rollback --env docker
 * - npx knex seed:run --env docker
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Importa todas as configurações do arquivo centralizado
module.exports = require("./src/config/database");
