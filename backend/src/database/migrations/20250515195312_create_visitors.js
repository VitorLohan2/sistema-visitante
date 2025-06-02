
exports.up = function(knex) {
   return knex.schema.createTable('visitors', function(table) {
    table.increments(); // ID auto-increment
    table.string('name').notNullable();
    table.string('cpf').notNullable();
    table.string('company').notNullable();
    table.string('sector').notNullable();
    table.timestamp('entry_date').defaultTo(knex.fn.now()); // Pode ser automático
    table.timestamp('created_at').defaultTo(knex.fn.now()); // Adicione esta linha
    table.string('ong_id').notNullable();

        // Chave estrangeira para a tabela ongs
        table.foreign('ong_id').references('id').inTable('ongs');
    });
};

exports.down = function(knex) {
   return knex.schema.dropTable('visitors');
};
