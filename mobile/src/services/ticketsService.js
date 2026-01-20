/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVIÇO: Tickets
 * Gerencia tickets/comunicados de visitantes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import api from "./api";

/**
 * Busca dados do dashboard geral (estatísticas)
 * GET /dashboard/estatisticas-hoje
 */
async function buscarDashboard() {
  const response = await api.get("/dashboard/estatisticas-hoje");
  return response.data;
}

/**
 * Lista todos os tickets
 * GET /tickets
 * @param {object} filtros - Filtros opcionais {status, page, limit}
 */
async function listar(filtros = {}) {
  const response = await api.get("/tickets", { params: filtros });
  return response.data;
}

/**
 * Busca ticket por ID
 * GET /tickets/:id
 * @param {number} id - ID do ticket
 */
async function buscarPorId(id) {
  const response = await api.get(`/tickets/${id}`);
  return response.data;
}

/**
 * Cria novo ticket
 * POST /tickets
 * @param {object} dados - Dados do ticket
 */
async function criar(dados) {
  const response = await api.post("/tickets", dados);
  return response.data;
}

/**
 * Atualiza status do ticket
 * PUT /tickets/:id
 * @param {number} id - ID do ticket
 * @param {string} status - Novo status
 */
async function atualizarStatus(id, status) {
  const response = await api.put(`/tickets/${id}`, { status });
  return response.data;
}

/**
 * Conta tickets não visualizados
 * GET /tickets/unseen
 */
async function contarNaoVisualizados() {
  const response = await api.get("/tickets/unseen");
  return response.data;
}

export default {
  buscarDashboard,
  listar,
  buscarPorId,
  criar,
  atualizarStatus,
  contarNaoVisualizados,
};
