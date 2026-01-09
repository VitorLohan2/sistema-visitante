const crypto = require("crypto");

/**
 * Gera hash de senha usando PBKDF2 (não precisa de bcrypt)
 * @param {string} senha - Senha em texto plano
 * @returns {string} Hash da senha (salt:hash)
 */
function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(senha, salt, 10000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifica se a senha corresponde ao hash
 * @param {string} senha - Senha em texto plano
 * @param {string} hashArmazenado - Hash armazenado no banco (salt:hash)
 * @returns {boolean} true se a senha for válida
 */
function verificarSenha(senha, hashArmazenado) {
  if (!hashArmazenado || !hashArmazenado.includes(":")) {
    return false;
  }

  const [salt, hashOriginal] = hashArmazenado.split(":");
  const hashTeste = crypto
    .pbkdf2Sync(senha, salt, 10000, 64, "sha512")
    .toString("hex");
  return hashTeste === hashOriginal;
}

/**
 * Gera uma senha temporária aleatória
 * @param {number} tamanho - Tamanho da senha (padrão: 8)
 * @returns {string} Senha temporária
 */
function gerarSenhaTemporaria(tamanho = 8) {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let senha = "";
  for (let i = 0; i < tamanho; i++) {
    senha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return senha;
}

/**
 * Gera um token de redefinição de senha
 * @returns {Object} { token, expiracao }
 */
function gerarTokenRedefinicao() {
  const token = crypto.randomBytes(32).toString("hex");
  const expiracao = new Date(Date.now() + 3600000); // 1 hora
  return { token, expiracao };
}

module.exports = {
  hashSenha,
  verificarSenha,
  gerarSenhaTemporaria,
  gerarTokenRedefinicao,
};
