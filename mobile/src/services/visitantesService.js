/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVIÇO: Visitantes
 * Gerencia operações de cadastro de visitantes
 * Rotas Backend:
 *   - /cadastro-visitantes/* - Cadastro de visitantes
 *   - /visitantes/* - Visitas em tempo real (entrada/saída)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import api from "./api";

// ═══════════════════════════════════════════════════════════════════════════════
// CADASTRO DE VISITANTES (/cadastro-visitantes)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lista visitantes cadastrados com paginação
 * GET /cadastro-visitantes
 * @param {object} params - { page, limit, search }
 */
async function listar(params = {}) {
  const response = await api.get("/cadastro-visitantes", { params });
  return response.data;
}

/**
 * Busca visitante por termo (nome ou CPF)
 * GET /cadastro-visitantes/buscar?query=xxx
 * @param {string} query - Termo de busca
 */
async function buscar(query) {
  const response = await api.get("/cadastro-visitantes/buscar", {
    params: { query },
  });
  return response.data;
}

/**
 * Busca visitante por ID
 * GET /cadastro-visitantes/:id
 * @param {number} id - ID do visitante
 */
async function buscarPorId(id) {
  const response = await api.get(`/cadastro-visitantes/${id}`);
  return response.data;
}

/**
 * Busca visitante por CPF
 * GET /cadastro-visitantes/cpf/:cpf
 * @param {string} cpf - CPF do visitante
 */
async function buscarPorCpf(cpf) {
  const response = await api.get(`/cadastro-visitantes/cpf/${cpf}`);
  return response.data;
}

/**
 * Busca dados para crachá
 * GET /cadastro-visitantes/:id/cracha
 * @param {number} id - ID do visitante
 */
async function buscarCracha(id) {
  const response = await api.get(`/cadastro-visitantes/${id}/cracha`);
  return response.data;
}

/**
 * Busca visitante por código de crachá (usa CPF como identificador)
 * Utiliza a rota /cadastro-visitantes/cpf/:cpf
 * @param {string} codigo - Código do crachá (normalmente é o CPF)
 */
async function buscarPorCracha(codigo) {
  // Remove caracteres não numéricos do código
  const codigoLimpo = codigo.replace(/\D/g, "");
  const response = await api.get(`/cadastro-visitantes/cpf/${codigoLimpo}`);
  return response.data;
}

/**
 * Cadastra novo visitante
 * POST /cadastro-visitantes
 * @param {object|FormData} dados - Dados do visitante
 */
async function criar(dados) {
  const isFormData = dados instanceof FormData;
  const config = isFormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : {};

  const response = await api.post("/cadastro-visitantes", dados, config);
  return response.data;
}

/**
 * Atualiza visitante existente
 * PUT /cadastro-visitantes/:id
 * @param {number} id - ID do visitante
 * @param {object} dados - Dados atualizados
 */
async function atualizar(id, dados) {
  const response = await api.put(`/cadastro-visitantes/${id}`, dados);
  return response.data;
}

/**
 * Bloqueia/desbloqueia visitante
 * PUT /cadastro-visitantes/:id/bloquear
 * @param {number} id - ID do visitante
 * @param {boolean} bloqueado - Status de bloqueio
 */
async function bloquear(id, bloqueado) {
  const response = await api.put(`/cadastro-visitantes/${id}/bloquear`, {
    bloqueado,
  });
  return response.data;
}

/**
 * Deleta visitante
 * DELETE /cadastro-visitantes/:id
 * @param {number} id - ID do visitante
 */
async function deletar(id) {
  const response = await api.delete(`/cadastro-visitantes/${id}`);
  return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISITAS EM TEMPO REAL (/visitantes)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lista visitantes em visita (atualmente no local)
 * GET /visitantes
 */
async function listarEmVisita() {
  const response = await api.get("/visitantes");
  return response.data;
}

/**
 * Registra entrada de visitante
 * POST /visitantes
 * @param {object} dados - Dados da visita
 */
async function registrarEntrada(dados) {
  const response = await api.post("/visitantes", dados);
  return response.data;
}

/**
 * Registra saída de visitante
 * PUT /visitantes/:id/exit
 * @param {number} id - ID da visita
 */
async function registrarSaida(id) {
  const response = await api.put(`/visitantes/${id}/exit`);
  return response.data;
}

/**
 * Busca histórico de visitas
 * GET /visitantes/historico
 * @param {object} params - Parâmetros de filtro
 */
async function listarHistorico(params = {}) {
  const response = await api.get("/visitantes/historico", { params });
  return response.data;
}

/**
 * Lista responsáveis para liberar visitantes
 * GET /visitantes/responsaveis
 */
async function listarResponsaveis() {
  const response = await api.get("/visitantes/responsaveis");
  return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Cadastro
  listar,
  buscar,
  buscarPorId,
  buscarPorCpf,
  buscarCracha,
  buscarPorCracha,
  criar,
  atualizar,
  bloquear,
  deletar,
  // Visitas
  listarEmVisita,
  registrarEntrada,
  registrarSaida,
  listarHistorico,
  listarResponsaveis,
};
