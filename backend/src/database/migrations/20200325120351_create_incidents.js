exports.up = function(knex) {
  return knex.schema.createTable('incidents', function (table) {
    table.increments()
    
    table.string('nome').notNullable()
    table.string('nascimento').notNullable()
    table.string('cpf').notNullable()
    table.string('empresa').notNullable()
    table.string('setor').notNullable()
    table.string('telefone')
    table.string('observacao')
    table.boolean('bloqueado').defaultTo(false);
    
    table.string('ong_id').notNullable()
    
    table.foreign('ong_id').references('id').inTable('ongs')
  })
};

exports.down = function(knex) {
  return knex.schema.dropTable('incidents');
};
