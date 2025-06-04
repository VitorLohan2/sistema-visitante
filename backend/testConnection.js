// testConnection.js
const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  },
});

db.raw('SELECT 1')
  .then(() => {
    console.log('✅ Conexão com o Neon funcionando!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erro de conexão:', err);
    process.exit(1);
  });
