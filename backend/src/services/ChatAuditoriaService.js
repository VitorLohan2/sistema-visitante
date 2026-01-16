/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHAT AUDITORIA SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Serviço centralizado para registro de auditoria do sistema de chat.
 * Todas as ações relevantes devem ser registradas através deste serviço.
 *
 * AÇÕES DISPONÍVEIS:
 * - CONVERSA_CRIADA
 * - MENSAGEM_ENVIADA
 * - MENSAGEM_BOT_ENVIADA
 * - USUARIO_SOLICITOU_ATENDENTE
 * - CONVERSA_ENTROU_FILA
 * - ATENDENTE_ACEITOU
 * - ATENDENTE_TRANSFERIU
 * - CONVERSA_FINALIZADA
 * - CONVERSA_REABERTA
 * - AVALIACAO_ENVIADA
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const db = require("../database/connection");

/**
 * Registra uma ação de auditoria
 * @param {Object} params - Parâmetros da auditoria
 * @param {number} params.conversa_id - ID da conversa
 * @param {string} params.acao - Tipo da ação
 * @param {string} [params.usuario_id] - ID do usuário que executou a ação
 * @param {string} [params.usuario_nome] - Nome do usuário
 * @param {string} [params.usuario_tipo] - Tipo: VISITANTE, USUARIO, ATENDENTE, SISTEMA
 * @param {Object} [params.detalhes] - Detalhes adicionais em JSON
 * @param {string} [params.ip_address] - Endereço IP
 * @param {string} [params.user_agent] - User Agent do navegador
 * @returns {Promise<Object>} Registro de auditoria criado
 */
async function registrar({
  conversa_id,
  acao,
  usuario_id = null,
  usuario_nome = null,
  usuario_tipo = null,
  detalhes = null,
  ip_address = null,
  user_agent = null,
}) {
  try {
    const [registro] = await db("chat_auditoria")
      .insert({
        conversa_id,
        usuario_id,
        usuario_nome,
        usuario_tipo,
        acao,
        detalhes: detalhes ? JSON.stringify(detalhes) : null,
        ip_address,
        user_agent,
      })
      .returning("*");

    console.log(`📝 [Auditoria] ${acao} - Conversa #${conversa_id}`);
    return registro;
  } catch (error) {
    console.error("❌ Erro ao registrar auditoria:", error);
    // Não lança erro para não interromper o fluxo principal
    return null;
  }
}

/**
 * Busca logs de auditoria de uma conversa
 * @param {number} conversa_id - ID da conversa
 * @returns {Promise<Array>} Lista de logs de auditoria
 */
async function buscarPorConversa(conversa_id) {
  return db("chat_auditoria")
    .where({ conversa_id })
    .orderBy("criado_em", "asc")
    .select("*");
}

/**
 * Busca logs de auditoria por usuário
 * @param {string} usuario_id - ID do usuário
 * @param {Object} [opcoes] - Opções de filtro
 * @param {number} [opcoes.limite=100] - Limite de registros
 * @param {number} [opcoes.offset=0] - Offset para paginação
 * @returns {Promise<Array>} Lista de logs de auditoria
 */
async function buscarPorUsuario(usuario_id, { limite = 100, offset = 0 } = {}) {
  return db("chat_auditoria")
    .where({ usuario_id })
    .orderBy("criado_em", "desc")
    .limit(limite)
    .offset(offset)
    .select("*");
}

/**
 * Busca logs de auditoria por período
 * @param {Object} params - Parâmetros de busca
 * @param {Date} [params.dataInicio] - Data inicial
 * @param {Date} [params.dataFim] - Data final
 * @param {string} [params.acao] - Filtrar por tipo de ação
 * @param {number} [params.limite=100] - Limite de registros
 * @param {number} [params.offset=0] - Offset para paginação
 * @returns {Promise<Array>} Lista de logs de auditoria
 */
async function buscarPorPeriodo({
  dataInicio,
  dataFim,
  acao,
  limite = 100,
  offset = 0,
} = {}) {
  let query = db("chat_auditoria")
    .leftJoin(
      "chat_conversas",
      "chat_auditoria.conversa_id",
      "chat_conversas.id"
    )
    .select(
      "chat_auditoria.*",
      "chat_conversas.nome_visitante",
      "chat_conversas.email_visitante"
    )
    .orderBy("chat_auditoria.criado_em", "desc")
    .limit(limite)
    .offset(offset);

  if (dataInicio) {
    query = query.where("chat_auditoria.criado_em", ">=", dataInicio);
  }

  if (dataFim) {
    query = query.where("chat_auditoria.criado_em", "<=", dataFim);
  }

  if (acao) {
    query = query.where("chat_auditoria.acao", acao);
  }

  return query;
}

/**
 * Conta total de ações por tipo em um período
 * @param {Object} params - Parâmetros de busca
 * @param {Date} [params.dataInicio] - Data inicial
 * @param {Date} [params.dataFim] - Data final
 * @returns {Promise<Array>} Contagem por tipo de ação
 */
async function contarPorAcao({ dataInicio, dataFim } = {}) {
  let query = db("chat_auditoria")
    .select("acao")
    .count("* as total")
    .groupBy("acao");

  if (dataInicio) {
    query = query.where("criado_em", ">=", dataInicio);
  }

  if (dataFim) {
    query = query.where("criado_em", "<=", dataFim);
  }

  return query;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS PARA AÇÕES ESPECÍFICAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registra criação de conversa
 */
async function conversaCriada(
  conversa_id,
  { nome, email, usuario_id, ip_address, user_agent }
) {
  return registrar({
    conversa_id,
    acao: "CONVERSA_CRIADA",
    usuario_id,
    usuario_nome: nome,
    usuario_tipo: usuario_id ? "USUARIO" : "VISITANTE",
    detalhes: { email },
    ip_address,
    user_agent,
  });
}

/**
 * Registra mensagem enviada pelo usuário
 */
async function mensagemEnviada(
  conversa_id,
  { usuario_id, usuario_nome, mensagem_preview }
) {
  return registrar({
    conversa_id,
    acao: "MENSAGEM_ENVIADA",
    usuario_id,
    usuario_nome,
    usuario_tipo: usuario_id ? "USUARIO" : "VISITANTE",
    detalhes: { preview: mensagem_preview?.substring(0, 100) },
  });
}

/**
 * Registra mensagem enviada pelo bot
 */
async function mensagemBotEnviada(conversa_id, { confianca }) {
  return registrar({
    conversa_id,
    acao: "MENSAGEM_BOT_ENVIADA",
    usuario_tipo: "SISTEMA",
    detalhes: { confianca },
  });
}

/**
 * Registra solicitação de atendente humano
 */
async function usuarioSolicitouAtendente(
  conversa_id,
  { usuario_id, usuario_nome }
) {
  return registrar({
    conversa_id,
    acao: "USUARIO_SOLICITOU_ATENDENTE",
    usuario_id,
    usuario_nome,
    usuario_tipo: usuario_id ? "USUARIO" : "VISITANTE",
  });
}

/**
 * Registra entrada na fila
 */
async function conversaEntrouFila(conversa_id, { posicao }) {
  return registrar({
    conversa_id,
    acao: "CONVERSA_ENTROU_FILA",
    usuario_tipo: "SISTEMA",
    detalhes: { posicao },
  });
}

/**
 * Registra aceitação pelo atendente
 */
async function atendenteAceitou(conversa_id, { atendente_id, atendente_nome }) {
  return registrar({
    conversa_id,
    acao: "ATENDENTE_ACEITOU",
    usuario_id: atendente_id,
    usuario_nome: atendente_nome,
    usuario_tipo: "ATENDENTE",
  });
}

/**
 * Registra transferência de conversa
 */
async function atendenteTransferiu(
  conversa_id,
  { atendente_origem_id, atendente_origem_nome, motivo }
) {
  return registrar({
    conversa_id,
    acao: "ATENDENTE_TRANSFERIU",
    usuario_id: atendente_origem_id,
    usuario_nome: atendente_origem_nome,
    usuario_tipo: "ATENDENTE",
    detalhes: { motivo },
  });
}

/**
 * Registra finalização da conversa
 */
async function conversaFinalizada(
  conversa_id,
  { finalizado_por_id, finalizado_por_nome, motivo }
) {
  return registrar({
    conversa_id,
    acao: "CONVERSA_FINALIZADA",
    usuario_id: finalizado_por_id,
    usuario_nome: finalizado_por_nome,
    usuario_tipo: finalizado_por_id ? "ATENDENTE" : "SISTEMA",
    detalhes: { motivo },
  });
}

/**
 * Registra avaliação enviada
 */
async function avaliacaoEnviada(conversa_id, { nota, comentario }) {
  return registrar({
    conversa_id,
    acao: "AVALIACAO_ENVIADA",
    usuario_tipo: "USUARIO",
    detalhes: { nota, comentario: comentario?.substring(0, 200) },
  });
}

module.exports = {
  registrar,
  buscarPorConversa,
  buscarPorUsuario,
  buscarPorPeriodo,
  contarPorAcao,
  // Helpers específicos
  conversaCriada,
  mensagemEnviada,
  mensagemBotEnviada,
  usuarioSolicitouAtendente,
  conversaEntrouFila,
  atendenteAceitou,
  atendenteTransferiu,
  conversaFinalizada,
  avaliacaoEnviada,
};
