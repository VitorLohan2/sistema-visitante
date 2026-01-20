/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVIÇO: Ronda de Vigilante
 * Gerencia operações de ronda com GPS em tempo real
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import api from "./api";

/**
 * Inicia uma nova ronda
 * @param {object} posicaoInicial - Coordenadas iniciais {latitude, longitude, precisao}
 */
export async function iniciarRonda(posicaoInicial) {
  const response = await api.post("/rondas/iniciar", {
    latitude_inicio: posicaoInicial.latitude,
    longitude_inicio: posicaoInicial.longitude,
    precisao_gps: posicaoInicial.precisao,
  });
  return response.data;
}

/**
 * Busca ronda em andamento do usuário
 */
export async function buscarRondaEmAndamento() {
  const response = await api.get("/rondas/em-andamento");
  return response.data;
}

/**
 * Registra checkpoint na ronda
 * @param {number} rondaId - ID da ronda
 * @param {object} dados - Dados do checkpoint
 */
export async function registrarCheckpoint(rondaId, dados) {
  const response = await api.post(`/rondas/${rondaId}/checkpoints`, {
    latitude: dados.latitude,
    longitude: dados.longitude,
    precisao_gps: dados.precisao,
    descricao: dados.descricao,
  });
  return response.data;
}

/**
 * Registra ponto do trajeto (posição GPS)
 * @param {number} rondaId - ID da ronda
 * @param {object} posicao - Coordenadas {latitude, longitude, precisao}
 */
export async function registrarTrajeto(rondaId, posicao) {
  const response = await api.post(`/rondas/${rondaId}/trajeto`, {
    latitude: posicao.latitude,
    longitude: posicao.longitude,
    precisao_gps: posicao.precisao,
    altitude: posicao.altitude,
    velocidade: posicao.velocidade,
  });
  return response.data;
}

/**
 * Finaliza ronda
 * @param {number} rondaId - ID da ronda
 * @param {object} dados - Dados finais {latitude, longitude, observacao}
 */
export async function finalizarRonda(rondaId, dados) {
  const response = await api.post(`/rondas/${rondaId}/finalizar`, {
    latitude_fim: dados.latitude,
    longitude_fim: dados.longitude,
    precisao_gps: dados.precisao,
    observacao: dados.observacao,
  });
  return response.data;
}

/**
 * Cancela ronda
 * @param {number} rondaId - ID da ronda
 * @param {string} motivo - Motivo do cancelamento
 */
export async function cancelarRonda(rondaId, motivo) {
  const response = await api.post(`/rondas/${rondaId}/cancelar`, {
    motivo,
  });
  return response.data;
}

/**
 * Lista histórico de rondas
 * @param {object} filtros - Filtros opcionais
 */
export async function listarHistorico(filtros = {}) {
  const response = await api.get("/rondas/historico", { params: filtros });
  return response.data;
}

/**
 * Busca detalhes de uma ronda específica
 * @param {number} rondaId - ID da ronda
 */
export async function buscarRonda(rondaId) {
  const response = await api.get(`/rondas/${rondaId}`);
  return response.data;
}

export default {
  iniciarRonda,
  buscarRondaEmAndamento,
  registrarCheckpoint,
  registrarTrajeto,
  finalizarRonda,
  cancelarRonda,
  listarHistorico,
  buscarRonda,
};
