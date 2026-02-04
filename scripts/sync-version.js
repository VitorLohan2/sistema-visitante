#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNC VERSION SCRIPT - Sincroniza versão antes do deploy
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este script sincroniza a versão em todos os arquivos do projeto:
 * - frontend/package.json
 * - backend/package.json
 * - frontend/public/version.json
 *
 * Uso:
 *   node scripts/sync-version.js          # Incrementa patch (2.2.7 -> 2.2.8)
 *   node scripts/sync-version.js minor    # Incrementa minor (2.2.7 -> 2.3.0)
 *   node scripts/sync-version.js major    # Incrementa major (2.2.7 -> 3.0.0)
 *   node scripts/sync-version.js 2.3.0    # Define versão específica
 *
 *   npm run version                       # Mesmos comandos via npm scripts | Incrementa patch
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Caminhos dos arquivos
const rootDir = path.join(__dirname, "..");
const paths = {
  frontendPackage: path.join(rootDir, "frontend", "package.json"),
  backendPackage: path.join(rootDir, "backend", "package.json"),
  versionJson: path.join(rootDir, "frontend", "public", "version.json"),
};

/**
 * Lê um arquivo JSON
 */
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`❌ Erro ao ler ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Escreve um arquivo JSON
 */
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

/**
 * Obtém a última tag do Git
 */
function getLatestTag() {
  try {
    // Comando cross-platform que funciona em Windows e Linux
    const allTags = execSync('git tag -l "v*" --sort=-v:refname', {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (!allTags) return "v0.0.0";

    // Filtra apenas tags no formato v*.*.* (ignora controlid-v*, etc)
    const tags = allTags
      .split("\n")
      .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag));

    return tags[0] || "v0.0.0";
  } catch {
    return "v0.0.0";
  }
}

/**
 * Incrementa a versão
 */
function incrementVersion(version, type) {
  const [major, minor, patch] = version.split(".").map(Number);

  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Valida formato de versão
 */
function isValidVersion(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

console.log("═══════════════════════════════════════════════════════════════");
console.log("🔄 SYNC VERSION - Sincronização de Versão");
console.log(
  "═══════════════════════════════════════════════════════════════\n",
);

// Obtém versão atual
const frontendPkg = readJson(paths.frontendPackage);
const currentVersion = frontendPkg?.version || "0.0.0";
const latestTag = getLatestTag().replace(/^v/, "");

console.log(`📌 Versão atual (package.json): ${currentVersion}`);
console.log(`🏷️  Última tag (Git): v${latestTag}`);

// Determina nova versão
const arg = process.argv[2];
let newVersion;

if (!arg) {
  // Sem argumento: incrementa patch da última tag
  newVersion = incrementVersion(latestTag, "patch");
  console.log(`\n🔼 Incrementando patch: ${latestTag} -> ${newVersion}`);
} else if (["major", "minor", "patch"].includes(arg)) {
  // Incrementa conforme tipo
  newVersion = incrementVersion(latestTag, arg);
  console.log(`\n🔼 Incrementando ${arg}: ${latestTag} -> ${newVersion}`);
} else if (isValidVersion(arg)) {
  // Versão específica
  newVersion = arg;
  console.log(`\n📝 Definindo versão: ${newVersion}`);
} else {
  console.error(`\n❌ Argumento inválido: ${arg}`);
  console.log("   Use: patch, minor, major ou uma versão (ex: 2.3.0)");
  process.exit(1);
}

console.log(
  "\n═══════════════════════════════════════════════════════════════",
);
console.log("📝 Atualizando arquivos...");
console.log(
  "═══════════════════════════════════════════════════════════════\n",
);

// Atualiza frontend/package.json
if (frontendPkg) {
  frontendPkg.version = newVersion;
  writeJson(paths.frontendPackage, frontendPkg);
  console.log(`✅ frontend/package.json -> ${newVersion}`);
}

// Atualiza backend/package.json
const backendPkg = readJson(paths.backendPackage);
if (backendPkg) {
  backendPkg.version = newVersion;
  writeJson(paths.backendPackage, backendPkg);
  console.log(`✅ backend/package.json -> ${newVersion}`);
}

// Atualiza version.json
const versionData = {
  version: newVersion,
  buildTime: new Date().toISOString(),
  buildNumber: Date.now(),
};
writeJson(paths.versionJson, versionData);
console.log(
  `✅ frontend/public/version.json -> ${newVersion} (build: ${versionData.buildNumber})`,
);

console.log(
  "\n═══════════════════════════════════════════════════════════════",
);
console.log("✅ SINCRONIZAÇÃO CONCLUÍDA!");
console.log("═══════════════════════════════════════════════════════════════");
console.log(`\n🏷️  Nova versão: v${newVersion}`);
console.log("\n📋 Próximos passos:");
console.log("   1. git add .");
console.log(`   2. git commit -m "chore: bump version to ${newVersion}"`);
console.log("   3. git push origin main");
console.log(
  "\n   O workflow vai criar a tag v" + newVersion + " automaticamente!",
);
console.log(
  "═══════════════════════════════════════════════════════════════\n",
);
