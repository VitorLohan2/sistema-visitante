// Update with your config settings.
// knexfile.js

require('dotenv').config();

module.exports = {

  development: {
    client: process.env.DB_CLIENT || 'pg',
    connection:
      process.env.DB_CLIENT === 'pg'
        ? {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'db_sistema_visitante',
            port: process.env.DB_PORT || 5432,
          }
        : {
            filename: './src/database/db.sqlite',
          },
    migrations: {
      directory: './src/database/migrations',
    },
    pool: {
      min: 2,
      max: 10,
    },
    useNullAsDefault: process.env.DB_CLIENT !== 'pg',
  },

  test: {
    client: 'sqlite3',
    connection: {
      filename: './src/database/test.sqlite',
    },
    migrations: {
      directory: './src/database/migrations',
    },
    useNullAsDefault: true,
  },

  production: {
    client: 'pg',
     connection: {
    connectionString: process.env.DATABASE_URL, // Necessário para conexão com Neon
    ssl: {
      rejectUnauthorized: false, 
    },
  }, // <- conexão direta com Neon
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
    },
  },
};

