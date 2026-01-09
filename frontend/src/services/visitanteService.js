import api from "./api";

/**
 * Service para operações com Visitantes (cadastro_visitantes)
 * Centraliza todas as chamadas de API relacionadas a visitantes
 */

const visitanteService = {
  /**
   * Lista visitantes cadastrados com paginação
   * @param {Object} params - Parâmetros de filtro e paginação
   * @param {number} params.page - Página atual
   * @param {number} params.limit - Itens por página
   * @returns {Promise<Object>} { data: Array, total: number, totalPages: number }
   */
  listar: async (params = {}) => {
    const response = await api.get("/cadastro-visitantes", { params });
    return response.data;
  },

  /**
   * Busca um visitante pelo ID
   * @param {number} id - ID do visitante
   * @returns {Promise<Object>} Dados do visitante
   */
  buscarPorId: async (id) => {
    const response = await api.get(`/cadastro-visitantes/${id}`);
    return response.data;
  },

  /**
   * Busca visitantes por termo (nome, CPF, etc)
   * @param {string} termo - Termo de busca
   * @returns {Promise<Array>} Lista de visitantes encontrados
   */
  buscar: async (termo) => {
    const response = await api.get("/cadastro-visitantes/buscar", {
      params: { termo },
    });
    return response.data;
  },

  /**
   * Cadastra um novo visitante
   * @param {FormData} formData - Dados do visitante (incluindo foto)
   * @returns {Promise<Object>} Visitante cadastrado
   */
  cadastrar: async (formData) => {
    const response = await api.post("/cadastro-visitantes", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  /**
   * Atualiza um visitante
   * @param {number} id - ID do visitante
   * @param {FormData|Object} dados - Dados a atualizar
   * @returns {Promise<Object>} Visitante atualizado
   */
  atualizar: async (id, dados) => {
    const config =
      dados instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : {};
    const response = await api.put(`/cadastro-visitantes/${id}`, dados, config);
    return response.data;
  },

  /**
   * Remove um visitante
   * @param {number} id - ID do visitante
   * @returns {Promise<void>}
   */
  remover: async (id) => {
    await api.delete(`/cadastro-visitantes/${id}`);
  },

  /**
   * Bloqueia um visitante
   * @param {number} id - ID do visitante
   * @param {string} motivo - Motivo do bloqueio
   * @returns {Promise<Object>} Resultado da operação
   */
  bloquear: async (id, motivo) => {
    const response = await api.put(`/cadastro-visitantes/${id}/bloquear`, {
      motivo,
    });
    return response.data;
  },

  /**
   * Verifica se CPF já está cadastrado
   * @param {string} cpf - CPF a verificar
   * @returns {Promise<Object>} { existe: boolean, visitante?: Object }
   */
  verificarCpf: async (cpf) => {
    const response = await api.get(`/cpf-existe/${cpf}`);
    return response.data;
  },

  /**
   * Busca dados do crachá do visitante
   * @param {number} id - ID do visitante
   * @returns {Promise<Object>} Dados para o crachá
   */
  buscarCracha: async (id) => {
    const response = await api.get(`/cadastro-visitantes/${id}/badge`);
    return response.data;
  },

  /**
   * Lista empresas de visitantes
   * @returns {Promise<Array>} Lista de empresas
   */
  listarEmpresas: async () => {
    const response = await api.get("/empresas-visitantes");
    return response.data;
  },

  /**
   * Lista setores de visitantes
   * @returns {Promise<Array>} Lista de setores
   */
  listarSetores: async () => {
    const response = await api.get("/setores-visitantes");
    return response.data;
  },
};

export default visitanteService;
