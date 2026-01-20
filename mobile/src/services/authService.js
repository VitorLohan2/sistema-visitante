/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVIÇO: Autenticação
 * Gerencia login, logout e sessão do usuário
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import api from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { limparCachePermissoes } from "./permissoesService";

/**
 * Realiza login do usuário
 * @param {string} email - Email do usuário
 * @param {string} senha - Senha do usuário
 * @returns {Promise<{token: string, usuario: object}>}
 */
export async function login(email, senha) {
  const response = await api.post("/auth/login", {
    email: email.toLowerCase().trim(),
    senha,
  });

  const { token, usuario } = response.data;

  // Salva dados de autenticação
  await AsyncStorage.multiSet([
    ["@Auth:token", token],
    ["@Auth:usuario", JSON.stringify(usuario)],
  ]);

  return { token, usuario };
}

/**
 * Realiza logout do usuário
 */
export async function logout() {
  // Limpa todos os dados de autenticação e cache
  await AsyncStorage.multiRemove(["@Auth:token", "@Auth:usuario"]);

  // Limpa cache de permissões
  await limparCachePermissoes();
}

/**
 * Verifica se usuário está autenticado
 * @returns {Promise<boolean>}
 */
export async function verificarAutenticacao() {
  const token = await AsyncStorage.getItem("@Auth:token");
  return !!token;
}

/**
 * Obtém dados do usuário logado
 * @returns {Promise<object|null>}
 */
export async function obterUsuario() {
  try {
    const usuarioStr = await AsyncStorage.getItem("@Auth:usuario");
    return usuarioStr ? JSON.parse(usuarioStr) : null;
  } catch {
    return null;
  }
}

/**
 * Obtém token de autenticação
 * @returns {Promise<string|null>}
 */
export async function obterToken() {
  return AsyncStorage.getItem("@Auth:token");
}

/**
 * Solicita recuperação de senha
 * @param {string} email - Email do usuário
 */
export async function recuperarSenha(email) {
  return api.post("/auth/recuperar-senha", {
    email: email.toLowerCase().trim(),
  });
}

/**
 * Redefine senha do usuário
 * @param {string} token - Token de recuperação
 * @param {string} novaSenha - Nova senha
 */
export async function redefinirSenha(token, novaSenha) {
  return api.post("/auth/redefinir-senha", {
    token,
    novaSenha,
  });
}

export default {
  login,
  logout,
  verificarAutenticacao,
  obterUsuario,
  obterToken,
  recuperarSenha,
  redefinirSenha,
};
