// testConnection.js
const knex = require('knex');
const config = require('./knexfile');
const env = process.env.NODE_ENV || 'development';
const connection = knex(config[env]);

console.log('🔍 Ambiente atual:', env);
console.log('🔗 Configuração usada:', config[env].connection);

connection.raw('SELECT NOW()')
  .then(res => {
    console.log('✅ Conexão bem-sucedida:', res.rows[0]);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao banco:', err.message);
    process.exit(1);
  });
