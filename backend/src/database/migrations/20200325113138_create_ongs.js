
exports.up = function(knex) {
  return knex.schema.createTable('ongs', function (table) {
    table.string('id').primary()
    table.string('name').notNullable()
    table.string('birthdate').notNullable() // Adicionando data de nascimento
    table.string('cpf', 11).notNullable() // Adicionando CPF (11 dígitos)
    table.string('empresa').notNullable() // Adicionando empresa
    table.string('setor').notNullable() // Adicionando setor
    table.string('email').notNullable()
    table.string('whatsapp').notNullable()
    table.string('city').notNullable()
    table.string('uf', 2).notNullable()
    table.string('type').notNullable().defaultTo('USER'); // Novo campo com valor padrão
  })
};

exports.down = function(knex) {
  return knex.schema.dropTable('ongs')
};
