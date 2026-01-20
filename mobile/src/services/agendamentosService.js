/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVIÇO: Agendamentos
 * Gerencia agendamentos de visitantes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import api from "./api";

/**
 * Lista agendamentos
 * GET /agendamentos
 * @param {object} filtros - Filtros opcionais {data, setor_id, status, page, limit}
 */
async function listar(filtros = {}) {
  const response = await api.get("/agendamentos", { params: filtros });
  return response.data;
}

/**
 * Busca agendamento por ID
 * GET /agendamentos/:id
 * @param {number} id - ID do agendamento
 */
async function buscarPorId(id) {
  const response = await api.get(`/agendamentos/${id}`);
  return response.data;
}

/**
 * Cria novo agendamento
 * POST /agendamentos
 * @param {FormData|object} dados - Dados do agendamento
 */
async function criar(dados) {
  const isFormData = dados instanceof FormData;
  const config = isFormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {};

  const response = await api.post("/agendamentos", dados, config);
  return response.data;
}

/**
 * Atualiza agendamento
 * PUT /agendamentos/:id
 * @param {number} id - ID do agendamento
 * @param {object} dados - Dados atualizados
 */
async function atualizar(id, dados) {
  const response = await api.put(`/agendamentos/${id}`, dados);
  return response.data;
}

/**
 * Confirma agendamento
 * PUT /agendamentos/:id/confirmar
 * @param {number} id - ID do agendamento
 */
async function confirmar(id) {
  const response = await api.put(`/agendamentos/${id}/confirmar`);
  return response.data;
}

/**
 * Cancela agendamento
 * DELETE /agendamentos/:id
 * @param {number} id - ID do agendamento
 */
async function cancelar(id) {
  const response = await api.delete(`/agendamentos/${id}`);
  return response.data;
}

/**
 * Confirma chegada do agendamento
 * PUT /agendamentos/:id/chegou
 * @param {number} id - ID do agendamento
 */
async function confirmarChegada(id) {
  const response = await api.put(`/agendamentos/${id}/chegou`);
  return response.data;
}

export default {
  listar,
  buscarPorId,
  criar,
  atualizar,
  confirmar,
  cancelar,
  confirmarChegada,
};
