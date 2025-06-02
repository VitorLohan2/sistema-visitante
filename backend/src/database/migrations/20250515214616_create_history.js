
exports.up = function(knex) {
    return knex.schema.createTable('history', function(table) {
    table.increments();
    table.string('name').notNullable();
    table.string('cpf').notNullable();
    table.string('company').notNullable();
    table.string('sector').notNullable();
    table.timestamp('entry_date').notNullable();
    table.timestamp('exit_date').notNullable();
    table.string('ong_id').notNullable();
    
    table.foreign('ong_id').references('id').inTable('ongs');
  });
};

exports.down = function(knex) {
   return knex.schema.dropTable('history');
};
