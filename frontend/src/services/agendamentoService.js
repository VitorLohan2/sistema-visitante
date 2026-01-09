import api from "./api";

/**
 * Service para operações com Agendamentos
 * Centraliza todas as chamadas de API relacionadas a agendamentos
 */

const agendamentoService = {
  /**
   * Lista agendamentos com filtros
   * @param {Object} params - Parâmetros de filtro
   * @param {string} params.data - Data do agendamento
   * @param {string} params.status - Status (pendente, confirmado, cancelado)
   * @returns {Promise<Array>} Lista de agendamentos
   */
  listar: async (params = {}) => {
    const response = await api.get("/agendamentos", { params });
    return response.data;
  },

  /**
   * Busca um agendamento pelo ID
   * @param {number} id - ID do agendamento
   * @returns {Promise<Object>} Dados do agendamento
   */
  buscarPorId: async (id) => {
    const response = await api.get(`/agendamentos/${id}`);
    return response.data;
  },

  /**
   * Cria um novo agendamento
   * @param {Object} dados - Dados do agendamento
   * @returns {Promise<Object>} Agendamento criado
   */
  criar: async (dados) => {
    const response = await api.post("/agendamentos", dados);
    return response.data;
  },

  /**
   * Atualiza um agendamento
   * @param {number} id - ID do agendamento
   * @param {Object} dados - Dados a atualizar
   * @returns {Promise<Object>} Agendamento atualizado
   */
  atualizar: async (id, dados) => {
    const response = await api.put(`/agendamentos/${id}`, dados);
    return response.data;
  },

  /**
   * Cancela um agendamento
   * @param {number} id - ID do agendamento
   * @param {string} motivo - Motivo do cancelamento
   * @returns {Promise<Object>} Resultado da operação
   */
  cancelar: async (id, motivo) => {
    const response = await api.put(`/agendamentos/${id}/cancelar`, { motivo });
    return response.data;
  },

  /**
   * Confirma um agendamento
   * @param {number} id - ID do agendamento
   * @returns {Promise<Object>} Resultado da operação
   */
  confirmar: async (id) => {
    const response = await api.put(`/agendamentos/${id}/confirmar`);
    return response.data;
  },

  /**
   * Remove um agendamento
   * @param {number} id - ID do agendamento
   * @returns {Promise<void>}
   */
  remover: async (id) => {
    await api.delete(`/agendamentos/${id}`);
  },

  /**
   * Lista agendamentos do dia
   * @returns {Promise<Array>} Lista de agendamentos de hoje
   */
  listarHoje: async () => {
    const hoje = new Date().toISOString().split("T")[0];
    const response = await api.get("/agendamentos", { params: { data: hoje } });
    return response.data;
  },
};

export default agendamentoService;
