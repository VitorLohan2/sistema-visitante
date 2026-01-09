/**
 * Tipos de usuário do sistema
 * Centraliza os valores para evitar strings hardcoded
 */

export const TIPOS_USUARIO = {
  ADMIN: "ADM",
  ADMINISTRADOR: "ADMIN", // Alias
  COMUM: "COMUM",
  PORTEIRO: "PORTEIRO",
  RECEPCIONISTA: "RECEPCIONISTA",
};

/**
 * Verifica se o tipo é de administrador
 * @param {string} tipo - Tipo do usuário
 * @returns {boolean}
 */
export const ehAdmin = (tipo) => {
  return tipo === TIPOS_USUARIO.ADMIN || tipo === TIPOS_USUARIO.ADMINISTRADOR;
};

/**
 * Lista de tipos que podem cadastrar visitantes
 */
export const TIPOS_CADASTRO_VISITANTE = [
  TIPOS_USUARIO.ADMIN,
  TIPOS_USUARIO.ADMINISTRADOR,
  TIPOS_USUARIO.PORTEIRO,
  TIPOS_USUARIO.RECEPCIONISTA,
  TIPOS_USUARIO.COMUM,
];

/**
 * Lista de tipos que podem gerenciar funcionários
 */
export const TIPOS_GERENCIA_FUNCIONARIOS = [
  TIPOS_USUARIO.ADMIN,
  TIPOS_USUARIO.ADMINISTRADOR,
];

export default TIPOS_USUARIO;
