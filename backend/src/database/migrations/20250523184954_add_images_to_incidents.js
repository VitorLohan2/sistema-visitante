// migration: add_images_to_incidents.js
exports.up = function(knex) {
  return knex.schema.table('incidents', function(table) {
    table.string('imagem1');
    table.string('imagem2');
    table.string('imagem3');
  });
};

exports.down = function(knex) {
  return knex.schema.table('incidents', function(table) {
    table.dropColumn('imagem1');
    table.dropColumn('imagem2');
    table.dropColumn('imagem3');
  });
};
