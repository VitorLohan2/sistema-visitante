const initSqlJs = require("sql.js");
const path = require("path");
const fs = require("fs");
const config = require("./index");
const logger = require("./logger");

// Criar diretório do banco se não existir
const dbDir = path.dirname(config.database.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;
let dbReady = null;

// Inicializar banco de dados SQLite com sql.js
const initDatabase = async () => {
  logger.info("Inicializando banco de dados...");

  const SQL = await initSqlJs();

  // Carregar banco existente ou criar novo
  if (fs.existsSync(config.database.path)) {
    const fileBuffer = fs.readFileSync(config.database.path);
    db = new SQL.Database(fileBuffer);
    logger.info("Banco de dados carregado de arquivo existente");
  } else {
    db = new SQL.Database();
    logger.info("Novo banco de dados criado");
  }

  // Criar tabelas
  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ip TEXT NOT NULL,
      port INTEGER DEFAULT 80,
      login TEXT DEFAULT 'admin',
      password TEXT DEFAULT 'admin',
      model TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'unknown',
      last_seen_at TEXT,
      serial_number TEXT,
      firmware_version TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tabela de sessões (cache de tokens)
  db.run(`
    CREATE TABLE IF NOT EXISTS device_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      session_token TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    )
  `);

  // Tabela de logs de operações
  db.run(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT,
      operation TEXT NOT NULL,
      endpoint TEXT,
      request_data TEXT,
      response_data TEXT,
      status TEXT,
      error_message TEXT,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
    )
  `);

  // Tabela de status histórico dos equipamentos
  db.run(`
    CREATE TABLE IF NOT EXISTS device_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      status TEXT NOT NULL,
      uptime_days INTEGER,
      uptime_hours INTEGER,
      uptime_minutes INTEGER,
      memory_free INTEGER,
      memory_total INTEGER,
      disk_free INTEGER,
      disk_total INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    )
  `);

  // Índices para melhor performance
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_device_sessions_device_id ON device_sessions(device_id)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_operation_logs_device_id ON operation_logs(device_id)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_device_status_history_device_id ON device_status_history(device_id)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_device_status_history_created_at ON device_status_history(created_at)`,
  );

  // Salvar banco em disco
  saveDatabase();

  logger.info("Banco de dados inicializado com sucesso");
  return db;
};

// Salvar banco em disco
const saveDatabase = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.database.path, buffer);
  }
};

// Wrapper síncrono para compatibilidade com código existente
const dbWrapper = {
  // Prepara e executa um statement
  prepare: (sql) => {
    if (!db) throw new Error("Database not initialized");
    return {
      run: (...params) => {
        db.run(sql, params);
        saveDatabase();
        return {
          changes: db.getRowsModified(),
          lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]
            ?.values[0]?.[0],
        };
      },
      get: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params) => {
        const result = db.exec(sql, params);
        if (result.length === 0) return [];
        const columns = result[0].columns;
        return result[0].values.map((row) => {
          const obj = {};
          columns.forEach((col, i) => (obj[col] = row[i]));
          return obj;
        });
      },
    };
  },
  exec: (sql) => {
    if (!db) throw new Error("Database not initialized");
    db.run(sql);
    saveDatabase();
  },
  pragma: () => {}, // sql.js não suporta pragma
  close: () => {
    if (db) {
      saveDatabase();
      db.close();
      db = null;
    }
  },
};

// Inicializar banco e expor promise
dbReady = initDatabase();

module.exports = dbWrapper;
module.exports.ready = dbReady;
