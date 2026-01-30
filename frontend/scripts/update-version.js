/**
 * Script para atualizar version.json antes do build
 * Executado automaticamente pelo npm run build
 */

const fs = require("fs");
const path = require("path");

const versionFilePath = path.join(__dirname, "..", "public", "version.json");
const packageJsonPath = path.join(__dirname, "..", "package.json");

// Lê a versão do package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Cria objeto de versão com timestamp único
const versionData = {
  version: packageJson.version,
  buildTime: new Date().toISOString(),
  buildNumber: Date.now(),
};

// Escreve no arquivo
fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));

console.log("✅ version.json atualizado:");
console.log(`   Versão: ${versionData.version}`);
console.log(`   Build Time: ${versionData.buildTime}`);
console.log(`   Build Number: ${versionData.buildNumber}`);
