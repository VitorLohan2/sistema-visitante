#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HELPER DE AMBIENTE - Sistema Liberaê
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Script auxiliar para gerenciar ambientes de forma visual e intuitiva
 *
 * Uso:
 *   node switch-env.js
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Cores para o terminal
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

// Configurações dos ambientes
const environments = {
  development: {
    name: "Desenvolvimento (Docker)",
    emoji: "🐳",
    file: ".env.development",
    color: colors.cyan,
    description: "Banco de dados de teste, porta 3001, auto-reload",
  },
  production: {
    name: "Produção (Local)",
    emoji: "🏢",
    file: ".env.production",
    color: colors.yellow,
    description: "Banco de dados real, porta 3707, sem auto-reload",
  },
};

// Limpar console
function clearConsole() {
  console.clear();
}

// Banner
function showBanner() {
  console.log(colors.bright + colors.blue);
  console.log(
    "═══════════════════════════════════════════════════════════════════════",
  );
  console.log("        GERENCIADOR DE AMBIENTE - Sistema Liberaê");
  console.log(
    "═══════════════════════════════════════════════════════════════════════",
  );
  console.log(colors.reset);
}

// Detectar ambiente atual
function getCurrentEnvironment() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return null;
  }

  const envContent = fs.readFileSync(envPath, "utf8");

  if (
    envContent.includes("NODE_ENV=docker") ||
    envContent.includes("NODE_ENV=development")
  ) {
    return "development";
  } else if (
    envContent.includes("NODE_ENV=production_local") ||
    envContent.includes("NODE_ENV=production")
  ) {
    return "production";
  }

  return null;
}

// Mostrar status atual
function showCurrentStatus() {
  const current = getCurrentEnvironment();

  if (!current) {
    console.log(
      `${colors.yellow}⚠️  Nenhum ambiente ativo no momento${colors.reset}\n`,
    );
    return;
  }

  const env = environments[current];
  console.log(
    `${colors.green}✅ Ambiente Atual:${colors.reset} ${env.color}${env.emoji} ${env.name}${colors.reset}`,
  );
  console.log(`${colors.green}📁 Arquivo:${colors.reset} ${env.file}\n`);
}

// Mostrar menu
function showMenu() {
  console.log(`${colors.bright}Selecione o ambiente:${colors.reset}\n`);

  Object.entries(environments).forEach(([key, env], index) => {
    console.log(
      `  ${colors.bright}${index + 1}.${colors.reset} ${env.color}${env.emoji} ${env.name}${colors.reset}`,
    );
    console.log(`     ${colors.reset}${env.description}${colors.reset}\n`);
  });

  console.log(
    `  ${colors.bright}0.${colors.reset} ${colors.red}❌ Sair${colors.reset}\n`,
  );
}

// Trocar ambiente
function switchEnvironment(envKey) {
  const env = environments[envKey];

  if (!env) {
    console.log(`${colors.red}❌ Ambiente inválido!${colors.reset}`);
    return false;
  }

  const sourcePath = path.join(__dirname, env.file);
  const targetPath = path.join(__dirname, ".env");

  // Verificar se o arquivo fonte existe
  if (!fs.existsSync(sourcePath)) {
    console.log(
      `${colors.red}❌ Arquivo ${env.file} não encontrado!${colors.reset}`,
    );
    console.log(
      `${colors.yellow}💡 Dica: Copie o .env.example para ${env.file} e configure${colors.reset}`,
    );
    return false;
  }

  try {
    // Copiar arquivo
    fs.copyFileSync(sourcePath, targetPath);

    console.log(
      `\n${colors.green}✅ Ambiente alterado com sucesso!${colors.reset}`,
    );
    console.log(
      `${colors.cyan}📁 Arquivo ativo:${colors.reset} .env (copiado de ${env.file})`,
    );
    console.log(
      `\n${colors.bright}${env.color}${env.emoji} Ambiente: ${env.name}${colors.reset}`,
    );
    console.log(`${colors.reset}${env.description}${colors.reset}\n`);

    console.log(
      `${colors.yellow}⚠️  Reinicie o servidor para aplicar as mudanças:${colors.reset}`,
    );

    if (envKey === "development") {
      console.log(`${colors.cyan}   npm run dev${colors.reset}\n`);
    } else {
      console.log(`${colors.cyan}   npm run prod${colors.reset}\n`);
    }

    return true;
  } catch (error) {
    console.log(
      `${colors.red}❌ Erro ao trocar ambiente: ${error.message}${colors.reset}`,
    );
    return false;
  }
}

// Menu interativo
async function interactiveMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `${colors.bright}Digite o número da opção:${colors.reset} `,
      (answer) => {
        rl.close();
        resolve(answer.trim());
      },
    );
  });
}

// Main
async function main() {
  clearConsole();
  showBanner();
  showCurrentStatus();
  showMenu();

  const choice = await interactiveMenu();

  switch (choice) {
    case "1":
      switchEnvironment("development");
      break;
    case "2":
      switchEnvironment("production");
      break;
    case "0":
      console.log(`\n${colors.cyan}👋 Até logo!${colors.reset}\n`);
      break;
    default:
      console.log(`\n${colors.red}❌ Opção inválida!${colors.reset}\n`);
  }
}

// Executar
if (require.main === module) {
  main().catch((error) => {
    console.error(`${colors.red}Erro:${colors.reset}`, error.message);
    process.exit(1);
  });
}

module.exports = { switchEnvironment, getCurrentEnvironment };
