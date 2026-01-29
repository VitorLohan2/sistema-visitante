/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONFIGURAÇÃO DE BANCO DE DADOS - CENTRALIZADA E SEGURA
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Este arquivo centraliza todas as configurações de banco de dados.
 * As credenciais DEVEM vir de variáveis de ambiente (.env)
 *
 * Ambientes suportados:
 * - docker: Desenvolvimento local com container PostgreSQL
 * - production_local: Produção em servidor próprio
 * - production: Produção na nuvem (Neon)
 * - staging: Ambiente de testes
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Carregar env PRIMEIRO (se ainda não foi carregado)
require("./env");

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO DE VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS
// ═══════════════════════════════════════════════════════════════════════════════

const requiredEnvVars = {
  docker: [
    "DB_HOST_DOCKER",
    "DB_USER_DOCKER",
    "DB_PASSWORD_DOCKER",
    "DB_NAME_DOCKER",
  ],
  production_local: ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"],
  production: ["DATABASE_URL"],
  staging: ["DATABASE_URL_STAGING"],
};

/**
 * Valida se todas as variáveis de ambiente necessárias estão definidas
 */
function validateEnvironment(env) {
  const required = requiredEnvVars[env];
  if (!required) return true;

  const missing = required.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.warn(
      `⚠️  [Database Config] Variáveis de ambiente faltando para '${env}':`,
      missing.join(", "),
    );
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES DE CONEXÃO POR AMBIENTE
// ═══════════════════════════════════════════════════════════════════════════════

const configurations = {
  /**
   * DESENVOLVIMENTO
   * Usado para desenvolvimento local
   */
  desenvolvimento: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST_DOCKER,
      port: parseInt(process.env.DB_PORT_DOCKER, 10) || 5432,
      user: process.env.DB_USER_DOCKER,
      password: process.env.DB_PASSWORD_DOCKER,
      database: process.env.DB_NAME_DOCKER,
      ssl: false,
      timezone: "America/Sao_Paulo", // Horário de Brasília
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      afterCreate: (conn, done) => {
        // Define timezone para horário de Brasília em cada conexão
        conn.query("SET timezone='America/Sao_Paulo';", (err) => {
          done(err, conn);
        });
      },
    },
    migrations: {
      directory: "./src/database/migrations",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: "./src/database/seeds",
    },
    useNullAsDefault: true,
    debug: process.env.DB_DEBUG === "true",
  },

  /**
   * TESTE / STAGING
   * Simula produção mas usa banco de desenvolvimento (seguro para testes)
   */
  teste: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST_DOCKER,
      port: parseInt(process.env.DB_PORT_DOCKER, 10) || 5432,
      user: process.env.DB_USER_DOCKER,
      password: process.env.DB_PASSWORD_DOCKER,
      database: process.env.DB_NAME_DOCKER,
      ssl: false,
      timezone: "America/Sao_Paulo", // Horário de Brasília
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      afterCreate: (conn, done) => {
        // Define timezone para horário de Brasília em cada conexão
        conn.query("SET timezone='America/Sao_Paulo';", (err) => {
          done(err, conn);
        });
      },
    },
    migrations: {
      directory: "./src/database/migrations",
      tableName: "knex_migrations",
    },
    useNullAsDefault: true,
    debug: false,
  },

  /**
   * PRODUÇÃO
   * Banco de dados real de produção
   */
  producao: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: false,
      timezone: "America/Sao_Paulo", // Horário de Brasília
    },
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      afterCreate: (conn, done) => {
        // Define timezone para horário de Brasília em cada conexão
        conn.query("SET timezone='America/Sao_Paulo';", (err) => {
          done(err, conn);
        });
      },
    },
    migrations: {
      directory: "./src/database/migrations",
      tableName: "knex_migrations",
    },
    useNullAsDefault: true,
    debug: false,
  },

  // ═══════════════════════════════════════════════════════════════
  // COMPATIBILIDADE COM NOMES ANTIGOS (em inglês)
  // ═══════════════════════════════════════════════════════════════

  docker: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST_DOCKER,
      port: parseInt(process.env.DB_PORT_DOCKER, 10) || 5432,
      user: process.env.DB_USER_DOCKER,
      password: process.env.DB_PASSWORD_DOCKER,
      database: process.env.DB_NAME_DOCKER,
      ssl: false,
      timezone: "America/Sao_Paulo", // Horário de Brasília
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      afterCreate: (conn, done) => {
        // Define timezone para horário de Brasília em cada conexão
        conn.query("SET timezone='America/Sao_Paulo';", (err) => {
          done(err, conn);
        });
      },
    },
    migrations: {
      directory: "./src/database/migrations",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: "./src/database/seeds",
    },
    useNullAsDefault: true,
    debug: process.env.DB_DEBUG === "true",
  },

  production_local: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: false, // Ajuste conforme necessário
      timezone: "America/Sao_Paulo", // Horário de Brasília
    },
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      afterCreate: (conn, done) => {
        // Define timezone para horário de Brasília em cada conexão
        conn.query("SET timezone='America/Sao_Paulo';", (err) => {
          done(err, conn);
        });
      },
    },
    migrations: {
      directory: "./src/database/migrations",
      tableName: "knex_migrations",
    },
    useNullAsDefault: true,
    debug: false,
  },

  /**
   * PRODUÇÃO NA NUVEM (Neon)
   * Banco de dados PostgreSQL gerenciado na nuvem
   */
  production: {
    client: "pg",
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Necessário para Neon
    },
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      afterCreate: (conn, done) => {
        // Define timezone para horário de Brasília em cada conexão
        conn.query("SET timezone='America/Sao_Paulo';", (err) => {
          done(err, conn);
        });
      },
    },
    migrations: {
      directory: "./src/database/migrations",
      tableName: "knex_migrations",
    },
    useNullAsDefault: true,
    debug: false,
  },

  /**
   * STAGING / TESTES
   * Ambiente de testes e homologação
   */
  staging: {
    client: "pg",
    connection: {
      connectionString: process.env.DATABASE_URL_STAGING,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 1,
      max: 5,
    },
    migrations: {
      directory: "./src/database/migrations",
      tableName: "knex_migrations",
    },
    useNullAsDefault: true,
    debug: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS PARA OBTER CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtém o ambiente atual
 */
function getCurrentEnvironment() {
  return process.env.NODE_ENV || "docker";
}

/**
 * Obtém a configuração para o ambiente especificado
 */
function getConfig(env = null) {
  const environment = env || getCurrentEnvironment();

  if (!configurations[environment]) {
    console.error(
      `❌ [Database Config] Ambiente '${environment}' não configurado. Usando 'production_local'.`,
    );
    return configurations.production_local;
  }

  // Valida variáveis de ambiente
  validateEnvironment(environment);

  return configurations[environment];
}

/**
 * Retorna informações de conexão sanitizadas (sem senha)
 * Útil para logs e debug
 */
function getSafeConnectionInfo(env = null) {
  const config = getConfig(env);
  const conn = config.connection;

  if (conn.connectionString) {
    // Mascara a senha na connection string
    return {
      type: "connectionString",
      url: conn.connectionString.replace(/:([^@]+)@/, ":****@"),
      ssl: !!conn.ssl,
    };
  }

  return {
    type: "credentials",
    host: conn.host,
    port: conn.port,
    database: conn.database,
    user: conn.user,
    password: "****", // Nunca expor a senha
    ssl: !!conn.ssl,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTAÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Exportação padrão para Knex CLI
  ...configurations,

  // Helpers
  getConfig,
  getCurrentEnvironment,
  getSafeConnectionInfo,
  validateEnvironment,
};
