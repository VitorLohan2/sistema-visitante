/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('tickets', function(table) {
    table.increments('id').primary();

    // Dados do usuário que abriu o ticket
    table.string('ong_id').notNullable(); // FK para ongs
    table.string('nome_usuario').notNullable();
    table.string('setor_usuario').notNullable();

    // Detalhes do ticket
    table.string('funcionario').notNullable();
    table.string('motivo').notNullable();
    table.text('descricao').notNullable();
    table.string('setor_responsavel').notNullable();

    // Status e datas
    table.string('status').defaultTo('Aberto');
    table.timestamp('data_criacao').defaultTo(knex.fn.now());
    table.timestamp('data_finalizacao').nullable();

    // Relação
    table.foreign('ong_id').references('id').inTable('ongs');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('tickets');
};
