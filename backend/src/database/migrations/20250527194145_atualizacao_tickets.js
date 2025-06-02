/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Adiciona a coluna sem DEFAULT (SQLite não permite DEFAULT dinâmico em ALTER TABLE)
  await knex.schema.alterTable('tickets', table => {
    table.timestamp('data_atualizacao').nullable();
  });

  // 2. Atualiza os registros existentes com a data atual
  await knex('tickets').update({
    data_atualizacao: knex.fn.now()
  });

  // 3. Altera a coluna para NOT NULL (opcional)
  // SQLite não suporta ALTER COLUMN diretamente, então precisamos de uma abordagem alternativa
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('tickets', table => {
    table.dropColumn('data_atualizacao');
  });
};