/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVIÇO: Ronda de Vigilante
 * Gerencia operações de ronda baseada em Pontos de Controle
 *
 * ARQUITETURA:
 * - Pontos de controle pré-cadastrados com coordenadas e raio
 * - Validação de presença por proximidade GPS
 * - Suporte offline com sincronização posterior
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import api from "./api";

// ═══════════════════════════════════════════════════════════════════════════════
// PONTOS DE CONTROLE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lista pontos de controle disponíveis para ronda
 * @param {number} [empresaId] - ID da empresa (opcional)
 * @returns {Promise} Lista de pontos de controle
 */
export async function listarPontosControle(empresaId) {
  const params = empresaId ? { empresa_id: empresaId } : {};
  const response = await api.get("/rondas/pontos-controle", { params });
  return response.data;
}

/**
 * Busca detalhes de um ponto de controle específico
 * @param {number} pontoId - ID do ponto de controle
 * @returns {Promise} Dados do ponto de controle
 */
export async function buscarPontoControle(pontoId) {
  const response = await api.get(`/rondas/pontos-controle/${pontoId}`);
  return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RONDA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Inicia uma nova ronda
 * @param {object} posicaoInicial - Coordenadas iniciais {latitude, longitude}
 */
export async function iniciarRonda(posicaoInicial) {
  const response = await api.post("/rondas/iniciar", {
    latitude: posicaoInicial.latitude,
    longitude: posicaoInicial.longitude,
    observacoes: posicaoInicial.observacoes || null,
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
 * Registra checkpoint na ronda (validação de ponto de controle)
 * @param {number} rondaId - ID da ronda
 * @param {object} dados - Dados do checkpoint
 * @param {number} dados.ponto_controle_id - ID do ponto de controle validado
 * @param {number} dados.latitude - Latitude do vigilante no momento da validação
 * @param {number} dados.longitude - Longitude do vigilante no momento da validação
 * @param {number} dados.distancia - Distância do ponto de controle em metros
 * @param {string} [dados.observacao] - Observação opcional
 */
export async function registrarCheckpoint(rondaId, dados) {
  const response = await api.post(`/rondas/${rondaId}/checkpoint`, {
    ponto_controle_id: dados.ponto_controle_id || dados.checkpoint_id,
    latitude: dados.latitude,
    longitude: dados.longitude,
    distancia: dados.distancia,
    precisao: dados.precisao || null,
    descricao: dados.descricao || dados.observacao || null,
    foto_url: dados.foto_url || null,
  });
  return response.data;
}

/**
 * @deprecated Não utilizar - trajeto contínuo foi substituído por pontos de controle
 * Mantido para compatibilidade
 */
export async function registrarTrajeto(rondaId, posicao) {
  console.warn(
    "registrarTrajeto está deprecado. Use validação por pontos de controle.",
  );
  return { success: false, message: "Método deprecado" };
}

/**
 * Finaliza ronda
 * @param {number} rondaId - ID da ronda
 * @param {object} dados - Dados finais {latitude, longitude, observacoes}
 */
export async function finalizarRonda(rondaId, dados) {
  const response = await api.put(`/rondas/${rondaId}/finalizar`, {
    latitude: dados.latitude || null,
    longitude: dados.longitude || null,
    observacoes: dados.observacoes || dados.observacao || null,
  });
  return response.data;
}

/**
 * Cancela ronda
 * @param {number} rondaId - ID da ronda
 * @param {string} motivo - Motivo do cancelamento
 */
export async function cancelarRonda(rondaId, motivo) {
  const response = await api.put(`/rondas/${rondaId}/cancelar`, {
    motivo: motivo || null,
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
  // Pontos de Controle
  listarPontosControle,
  buscarPontoControle,

  // Ronda
  iniciarRonda,
  buscarRondaEmAndamento,
  registrarCheckpoint,
  registrarTrajeto, // deprecado
  finalizarRonda,
  cancelarRonda,
  listarHistorico,
  buscarRonda,
};
