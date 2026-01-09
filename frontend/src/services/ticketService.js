import api from "./api";

/**
 * Service para operações com Tickets/Suporte
 * Centraliza todas as chamadas de API relacionadas a tickets
 */

const ticketService = {
  /**
   * Lista tickets com filtros
   * @param {Object} params - Parâmetros de filtro
   * @param {string} params.status - Status do ticket
   * @param {number} params.page - Página atual
   * @returns {Promise<Array>} Lista de tickets
   */
  listar: async (params = {}) => {
    const response = await api.get("/tickets", { params });
    return response.data;
  },

  /**
   * Busca um ticket pelo ID
   * @param {number} id - ID do ticket
   * @returns {Promise<Object>} Dados do ticket
   */
  buscarPorId: async (id) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  /**
   * Cria um novo ticket
   * @param {Object} dados - Dados do ticket
   * @returns {Promise<Object>} Ticket criado
   */
  criar: async (dados) => {
    const response = await api.post("/tickets", dados);
    return response.data;
  },

  /**
   * Atualiza um ticket
   * @param {number} id - ID do ticket
   * @param {Object} dados - Dados a atualizar
   * @returns {Promise<Object>} Ticket atualizado
   */
  atualizar: async (id, dados) => {
    const response = await api.put(`/tickets/${id}`, dados);
    return response.data;
  },

  /**
   * Fecha um ticket
   * @param {number} id - ID do ticket
   * @param {string} resolucao - Descrição da resolução
   * @returns {Promise<Object>} Resultado da operação
   */
  fechar: async (id, resolucao) => {
    const response = await api.put(`/tickets/${id}/fechar`, { resolucao });
    return response.data;
  },

  /**
   * Adiciona comentário a um ticket
   * @param {number} id - ID do ticket
   * @param {string} comentario - Texto do comentário
   * @returns {Promise<Object>} Comentário adicionado
   */
  comentar: async (id, comentario) => {
    const response = await api.post(`/tickets/${id}/comentarios`, {
      comentario,
    });
    return response.data;
  },

  /**
   * Conta tickets não resolvidos
   * @returns {Promise<number>} Quantidade de tickets pendentes
   */
  contarPendentes: async () => {
    const response = await api.get("/tickets/pendentes/count");
    return response.data.count || 0;
  },
};

export default ticketService;
