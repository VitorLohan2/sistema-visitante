// Update with your config settings.
// knexfile.js

require('dotenv').config();

module.exports = {

  development: {
    client: process.env.DB_CLIENT || 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'db_sistema_visitante',
      port: process.env.DB_PORT || 5432,
      ssl: { rejectUnauthorized: false },
    },
    migrations: {
      directory: './src/database/migrations',
    },
    useNullAsDefault: true,
  },

  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // necessário para o Neon
    },
    migrations: {
      directory: './src/database/migrations'
    },
    useNullAsDefault: true,
  },
};

