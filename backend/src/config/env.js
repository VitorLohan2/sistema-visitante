/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOADER DE VARIÁVEIS DE AMBIENTE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Carrega o arquivo .env correto baseado no ambiente
 * Deve ser importado ANTES de qualquer outro módulo que use process.env
 *
 * Ambientes suportados:
 * - desenvolvimento: Desenvolvimento local (porta 3001, banco dev)
 * - teste: Teste/Staging (porta 3707, banco dev)
 * - producao: Produção (porta 3707, banco prod)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const path = require("path");
const fs = require("fs");

// Determinar qual arquivo .env usar
const NODE_ENV = process.env.NODE_ENV || "desenvolvimento";

let envPath;

// Diretório raiz do backend (onde está o package.json)
const backendRoot = path.resolve(__dirname, "..", "..");

// Mapeamento de ambientes para arquivos
const envFileMap = {
  desenvolvimento: ".env.desenvolvimento",
  teste: ".env.teste",
  producao: ".env.producao",
  // Compatibilidade com nomes antigos (em inglês)
  development: ".env.desenvolvimento",
  docker: ".env.desenvolvimento",
  staging: ".env.teste",
  production: ".env.producao",
  production_local: ".env.producao",
};

const envFileName = envFileMap[NODE_ENV] || ".env.desenvolvimento";
envPath = path.resolve(backendRoot, envFileName);

// Fallback se o arquivo não existir
if (!fs.existsSync(envPath)) {
  console.warn(
    `⚠️  Arquivo ${envFileName} não encontrado, tentando .env.desenvolvimento`,
  );
  envPath = path.resolve(backendRoot, ".env.desenvolvimento");

  if (!fs.existsSync(envPath)) {
    console.error(`❌ Nenhum arquivo de ambiente encontrado!`);
    console.error(`Crie .env.desenvolvimento copiando de .env.exemplo`);
    process.exit(1);
  }
}

// Carregar variáveis de ambiente
require("dotenv").config({ path: envPath });

console.log(`📁 [Config] Carregando variáveis de: ${path.basename(envPath)}`);

module.exports = {
  envPath,
  NODE_ENV: process.env.NODE_ENV || "desenvolvimento",
};
