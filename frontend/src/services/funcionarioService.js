import api from "./api";

/**
 * Service para operações com Funcionários
 * Centraliza todas as chamadas de API relacionadas a funcionários
 */

const funcionarioService = {
  /**
   * Lista todos os funcionários
   * @param {Object} params - Parâmetros de filtro
   * @param {boolean} params.mostrarInativos - Incluir funcionários inativos
   * @returns {Promise<Array>} Lista de funcionários
   */
  listar: async (params = {}) => {
    const response = await api.get("/funcionarios", { params });
    return response.data;
  },

  /**
   * Busca um funcionário pelo crachá
   * @param {string} cracha - Crachá do funcionário
   * @returns {Promise<Object>} Dados do funcionário
   */
  buscarPorCracha: async (cracha) => {
    const response = await api.get(`/funcionarios/${cracha}`);
    return response.data;
  },

  /**
   * Cadastra um novo funcionário
   * @param {Object} dados - Dados do funcionário
   * @returns {Promise<Object>} Funcionário cadastrado
   */
  cadastrar: async (dados) => {
    const response = await api.post("/funcionarios", dados);
    return response.data;
  },

  /**
   * Atualiza um funcionário
   * @param {string} cracha - Crachá do funcionário
   * @param {Object} dados - Dados a atualizar
   * @returns {Promise<Object>} Funcionário atualizado
   */
  atualizar: async (cracha, dados) => {
    const response = await api.put(`/funcionarios/${cracha}`, dados);
    return response.data;
  },

  /**
   * Inativa um funcionário
   * @param {string} cracha - Crachá do funcionário
   * @returns {Promise<Object>} Resultado da operação
   */
  inativar: async (cracha) => {
    const response = await api.put(`/funcionarios/${cracha}`, {
      ativo: false,
      data_demissao: new Date().toISOString().split("T")[0],
    });
    return response.data;
  },

  /**
   * Reativa um funcionário
   * @param {string} cracha - Crachá do funcionário
   * @returns {Promise<Object>} Resultado da operação
   */
  reativar: async (cracha) => {
    const response = await api.put(`/funcionarios/${cracha}`, {
      ativo: true,
      data_demissao: null,
    });
    return response.data;
  },

  /**
   * Busca histórico de ponto do funcionário
   * @param {string} cracha - Crachá do funcionário
   * @param {Object} params - Parâmetros de filtro (dataInicio, dataFim)
   * @returns {Promise<Array>} Histórico de pontos
   */
  buscarHistorico: async (cracha, params = {}) => {
    const response = await api.get(`/funcionarios/${cracha}/historico`, {
      params,
    });
    return response.data;
  },

  /**
   * Lista setores disponíveis
   * @returns {Promise<Array>} Lista de setores
   */
  listarSetores: async () => {
    const response = await api.get("/setores");
    return response.data;
  },
};

export default funcionarioService;
