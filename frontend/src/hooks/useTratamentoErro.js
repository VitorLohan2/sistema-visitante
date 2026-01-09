import { useCallback } from "react";
import { useHistory } from "react-router-dom";

/**
 * Hook para tratamento padronizado de erros da API
 * Centraliza o tratamento de erros 401 (não autenticado) e 403 (sem permissão)
 *
 * @returns {Object} { tratarErro, tratarErroAsync }
 */
export function useTratamentoErro() {
  const history = useHistory();

  /**
   * Trata erros de resposta da API
   * @param {Error} erro - Erro capturado
   * @param {string} mensagemPadrao - Mensagem padrão caso não seja erro específico
   * @returns {boolean} true se o erro foi tratado (redirecionamento), false caso contrário
   */
  const tratarErro = useCallback(
    (erro, mensagemPadrao = "Ocorreu um erro. Tente novamente.") => {
      // Erro de autenticação (token expirado/inválido)
      if (erro.response?.status === 401) {
        localStorage.clear();
        alert("Sessão expirada. Faça login novamente.");
        history.push("/");
        return true;
      }

      // Erro de permissão
      if (erro.response?.status === 403) {
        alert("Você não tem permissão para realizar esta ação.");
        history.push("/listagem-visitante");
        return true;
      }

      // Erro 404 - Não encontrado
      if (erro.response?.status === 404) {
        alert("Recurso não encontrado.");
        return false;
      }

      // Erro de validação
      if (erro.response?.status === 400) {
        const mensagemErro =
          erro.response?.data?.message ||
          erro.response?.data?.error ||
          mensagemPadrao;
        alert(mensagemErro);
        return false;
      }

      // Erro de rede/servidor
      if (!erro.response) {
        alert("Erro de conexão. Verifique sua internet.");
        return false;
      }

      // Outros erros
      const mensagemErro =
        erro.response?.data?.message ||
        erro.response?.data?.error ||
        mensagemPadrao;
      alert(mensagemErro);
      return false;
    },
    [history]
  );

  /**
   * Wrapper para usar em funções async com try/catch automático
   * @param {Function} funcaoAsync - Função assíncrona a executar
   * @param {string} mensagemPadrao - Mensagem de erro padrão
   * @returns {Function} Função wrapped com tratamento de erro
   */
  const tratarErroAsync = useCallback(
    (funcaoAsync, mensagemPadrao = "Ocorreu um erro. Tente novamente.") => {
      return async (...args) => {
        try {
          return await funcaoAsync(...args);
        } catch (erro) {
          tratarErro(erro, mensagemPadrao);
          throw erro;
        }
      };
    },
    [tratarErro]
  );

  return {
    tratarErro,
    tratarErroAsync,
  };
}

export default useTratamentoErro;
