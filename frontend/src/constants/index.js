/**
 * Exporta todas as constantes do sistema
 * Facilita importação: import { ROTAS, TIPOS_USUARIO, MENSAGENS } from '../constants';
 */

export { ROTAS, default as rotas } from "./rotas";
export {
  TIPOS_USUARIO,
  ehAdmin,
  TIPOS_CADASTRO_VISITANTE,
  TIPOS_GERENCIA_FUNCIONARIOS,
} from "./tiposUsuario";
export { MENSAGENS, default as mensagens } from "./mensagens";
