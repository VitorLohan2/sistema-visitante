/**
 * Exporta todos os hooks customizados do sistema
 * Facilita importação: import { useAutenticacaoAdmin, useTratamentoErro } from '../hooks';
 */

export { useAuth } from "./useAuth";
export { useAutenticacaoAdmin, useUsuarioLogado } from "./useAutenticacaoAdmin";
export { useCarregamentoProgresso } from "./useCarregamentoProgresso";
export { useTratamentoErro } from "./useTratamentoErro";
