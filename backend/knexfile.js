// Update with your config settings.
// knexfile.js

require('dotenv').config();

module.exports = {

  // development: {
  //   client: process.env.DB_CLIENT || 'pg',
  //   connection: {
  //     host: process.env.DB_HOST || 'localhost',
  //     user: process.env.DB_USER || 'postgres',
  //     password: process.env.DB_PASSWORD || '',
  //     database: process.env.DB_NAME || 'db_sistema_visitante',
  //     port: process.env.DB_PORT || 5432,
  //     ssl: { rejectUnauthorized: false },
  //   },
  //   migrations: {
  //     directory: './src/database/migrations',
  //   },
  //   useNullAsDefault: true,
  // },

  staging: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL_STAGING,
      ssl: { rejectUnauthorized: false }, // necessário para o Neon
    },
    migrations: {
      directory: './src/database/migrations',
    },
    useNullAsDefault: true,
  },

  // CONFIGURAÇÃO PARA PRODUÇÃO LOCAL
  production_local: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'database',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'neondb_owner_prod',
      password: process.env.DB_PASSWORD || 'npg_prod_senha',
      database: process.env.DB_NAME || 'neondb_prod',
      ssl: false, // ✅ SSL DESABILITADO para PostgreSQL local
    },
    migrations: {
      directory: './src/database/migrations'
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

  docker: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST_DOCKER || 'database', // hostname do serviço no docker-compose
      port: process.env.DB_PORT_DOCKER || 5432,
      user: process.env.DB_USER_DOCKER || 'neondb_owner',
      password: process.env.DB_PASSWORD_DOCKER || 'npg_df6zhWi2aobk',
      database: process.env.DB_NAME_DOCKER || 'neondb',
      ssl: false,
    },
    migrations: {
      directory: './src/database/migrations',
    },
    useNullAsDefault: true,
  },

};

