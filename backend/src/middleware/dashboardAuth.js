/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MIDDLEWARE: Dashboard Authentication
 * Autenticação com senha para acesso ao Dashboard e estatísticas
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Chave secreta para JWT do Dashboard (diferente da chave principal)
const DASHBOARD_SECRET =
  process.env.DASHBOARD_JWT_SECRET || crypto.randomBytes(32).toString("hex");

// Senha do Dashboard (hash bcrypt)
// Use: node -e "console.log(require('bcryptjs').hashSync('sua_senha_aqui', 10))"
const DASHBOARD_PASSWORD_HASH = process.env.DASHBOARD_PASSWORD_HASH;

// Token de sessão válido por 8 horas
const TOKEN_EXPIRY = "8h";

/**
 * Gera uma senha aleatória segura
 */
function generateSecurePassword(length = 16) {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  return password;
}

/**
 * Gera o hash de uma senha (usar para criar a senha inicial)
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

/**
 * Verifica a senha do Dashboard
 */
async function verifyDashboardPassword(password) {
  if (!DASHBOARD_PASSWORD_HASH) {
    console.warn(
      "⚠️ DASHBOARD_PASSWORD_HASH não configurado. Dashboard sem proteção de senha.",
    );
    return true; // Em desenvolvimento, permite acesso sem senha
  }

  return await bcrypt.compare(password, DASHBOARD_PASSWORD_HASH);
}

/**
 * Gera token JWT para o Dashboard
 */
function generateDashboardToken(ip, userAgent) {
  return jwt.sign(
    {
      type: "dashboard_access",
      ip: ip,
      userAgent: userAgent,
      timestamp: Date.now(),
    },
    DASHBOARD_SECRET,
    { expiresIn: TOKEN_EXPIRY },
  );
}

/**
 * Verifica token JWT do Dashboard
 */
function verifyDashboardToken(token) {
  try {
    const decoded = jwt.verify(token, DASHBOARD_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Middleware para proteger rotas do Dashboard
 */
function requireDashboardAuth(req, res, next) {
  // Em desenvolvimento sem senha configurada, permite acesso
  if (
    !DASHBOARD_PASSWORD_HASH &&
    (process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "desenvolvimento" ||
      process.env.NODE_ENV === "docker")
  ) {
    return next();
  }

  // Verifica token no header ou cookie
  const token =
    req.headers["x-dashboard-token"] ||
    req.cookies?.dashboardToken ||
    req.query?.dashboardToken;

  if (!token) {
    return res.status(401).json({
      error: "Acesso não autorizado",
      code: "DASHBOARD_AUTH_REQUIRED",
      message: "Token de acesso ao Dashboard necessário",
    });
  }

  const verification = verifyDashboardToken(token);

  if (!verification.valid) {
    return res.status(401).json({
      error: "Token inválido ou expirado",
      code: "DASHBOARD_TOKEN_INVALID",
      message: "Faça login novamente",
    });
  }

  // Adiciona informações do token ao request
  req.dashboardAuth = verification.decoded;
  next();
}

/**
 * Utilitário para gerar senha e hash (executar uma vez)
 */
function generatePasswordAndHash() {
  const password = generateSecurePassword(20);
  const hash = bcrypt.hashSync(password, 12);

  console.log(
    "\n═══════════════════════════════════════════════════════════════",
  );
  console.log("🔐 SENHA DO DASHBOARD GERADA");
  console.log(
    "═══════════════════════════════════════════════════════════════",
  );
  console.log(`\n   Senha: ${password}`);
  console.log(`\n   Hash (coloque no .env como DASHBOARD_PASSWORD_HASH):`);
  console.log(`   ${hash}`);
  console.log(
    "\n═══════════════════════════════════════════════════════════════\n",
  );

  return { password, hash };
}

module.exports = {
  verifyDashboardPassword,
  generateDashboardToken,
  verifyDashboardToken,
  requireDashboardAuth,
  generatePasswordAndHash,
  hashPassword,
  generateSecurePassword,
};
