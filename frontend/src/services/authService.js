import api from "./api";

/**
 * Service para operações de Autenticação
 * Centraliza todas as chamadas de API relacionadas a login/sessão
 */

const authService = {
  /**
   * Realiza login do usuário
   * @param {Object} credenciais - Email e senha
   * @returns {Promise<Object>} { token, usuario }
   */
  login: async (credenciais) => {
    const response = await api.post("/sessions", credenciais);
    return response.data;
  },

  /**
   * Registra novo usuário
   * @param {Object} dados - Dados do novo usuário
   * @returns {Promise<Object>} Usuário criado
   */
  registrar: async (dados) => {
    const response = await api.post("/usuarios", dados);
    return response.data;
  },

  /**
   * Valida código de cadastro
   * @param {string} codigo - Código de validação
   * @returns {Promise<Object>} { valido: boolean, empresa?: Object }
   */
  validarCodigo: async (codigo) => {
    const response = await api.get(`/codigos/validar/${codigo}`);
    return response.data;
  },

  /**
   * Solicita recuperação de senha
   * @param {string} email - Email do usuário
   * @returns {Promise<Object>} Resultado da operação
   */
  recuperarSenha: async (email) => {
    const response = await api.post("/auth/recuperar-senha", { email });
    return response.data;
  },

  /**
   * Redefine senha com token
   * @param {string} token - Token de recuperação
   * @param {string} novaSenha - Nova senha
   * @returns {Promise<Object>} Resultado da operação
   */
  redefinirSenha: async (token, novaSenha) => {
    const response = await api.post("/auth/redefinir-senha", {
      token,
      novaSenha,
    });
    return response.data;
  },

  /**
   * Verifica se token ainda é válido
   * @returns {Promise<boolean>} Se está autenticado
   */
  verificarToken: async () => {
    try {
      await api.get("/auth/verificar");
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Faz logout (limpa dados locais)
   */
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("ongId");
    localStorage.removeItem("ongName");
    localStorage.removeItem("ongType");
  },
};

export default authService;
