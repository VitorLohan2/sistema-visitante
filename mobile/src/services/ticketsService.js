/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVIÇO: Tickets
 * Gerencia tickets de suporte para visitantes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import api from "./api";

/**
 * Busca dados do dashboard (estatísticas calculadas dos tickets)
 * GET /tickets - Calcula estatísticas localmente
 */
async function buscarDashboard() {
  try {
    const response = await api.get("/tickets");
    const tickets = Array.isArray(response.data) ? response.data : [];

    // Calcula estatísticas
    const total = tickets.length;
    const abertos = tickets.filter(
      (t) => t.status?.toLowerCase() === "aberto",
    ).length;
    const em_andamento = tickets.filter(
      (t) =>
        t.status?.toLowerCase() === "em andamento" ||
        t.status?.toLowerCase() === "em_andamento",
    ).length;
    const concluidos = tickets.filter(
      (t) =>
        t.status?.toLowerCase() === "resolvido" ||
        t.status?.toLowerCase() === "fechado" ||
        t.status?.toLowerCase() === "concluido",
    ).length;

    return {
      total,
      abertos,
      em_andamento,
      concluidos,
    };
  } catch (error) {
    console.error("Erro ao buscar dashboard de tickets:", error);
    return { total: 0, abertos: 0, em_andamento: 0, concluidos: 0 };
  }
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
