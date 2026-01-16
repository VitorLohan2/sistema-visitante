/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHAT FILA SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Serviço para gerenciamento da fila de atendimento FIFO.
 * Garante que as conversas sejam atendidas na ordem de chegada.
 *
 * FUNCIONALIDADES:
 * - Adicionar conversa à fila
 * - Remover conversa da fila
 * - Consultar posição na fila
 * - Obter próxima conversa da fila
 * - Listar fila completa
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const db = require("../database/connection");
const AuditoriaService = require("./ChatAuditoriaService");

/**
 * Adiciona uma conversa à fila de atendimento
 * @param {number} conversa_id - ID da conversa
 * @param {number} [prioridade=1] - Prioridade (1=Normal, 2=Alta, 3=Urgente)
 * @returns {Promise<Object>} Registro na fila
 */
async function adicionarNaFila(conversa_id, prioridade = 1) {
  try {
    // Verifica se já está na fila
    const jaExiste = await db("chat_fila").where({ conversa_id }).first();

    if (jaExiste) {
      console.log(
        `⚠️ Conversa #${conversa_id} já está na fila (posição ${jaExiste.posicao})`
      );
      return jaExiste;
    }

    // Obtém próxima posição usando a função do banco
    const resultado = await db.raw("SELECT proxima_posicao_fila() as posicao");
    const posicao = resultado.rows[0].posicao;

    // Insere na fila
    const [registro] = await db("chat_fila")
      .insert({
        conversa_id,
        posicao,
        prioridade,
      })
      .returning("*");

    // Atualiza status da conversa
    await db("chat_conversas")
      .where({ id: conversa_id })
      .update({ status: "AGUARDANDO_ATENDENTE" });

    // Registra auditoria
    await AuditoriaService.conversaEntrouFila(conversa_id, { posicao });

    console.log(
      `📋 Conversa #${conversa_id} adicionada à fila na posição ${posicao}`
    );
    return registro;
  } catch (error) {
    console.error("❌ Erro ao adicionar à fila:", error);
    throw error;
  }
}

/**
 * Remove uma conversa da fila
 * @param {number} conversa_id - ID da conversa
 * @returns {Promise<boolean>} Se foi removida
 */
async function removerDaFila(conversa_id) {
  try {
    const removido = await db("chat_fila").where({ conversa_id }).del();

    if (removido) {
      console.log(`🗑️ Conversa #${conversa_id} removida da fila`);
    }

    return removido > 0;
  } catch (error) {
    console.error("❌ Erro ao remover da fila:", error);
    throw error;
  }
}

/**
 * Obtém a posição de uma conversa na fila
 * @param {number} conversa_id - ID da conversa
 * @returns {Promise<number|null>} Posição na fila ou null se não estiver na fila
 */
async function obterPosicao(conversa_id) {
  const registro = await db("chat_fila")
    .where({ conversa_id })
    .select("posicao")
    .first();

  return registro?.posicao || null;
}

/**
 * Obtém a próxima conversa da fila (primeira da fila, considerando prioridade)
 * @returns {Promise<Object|null>} Próxima conversa ou null se fila vazia
 */
async function obterProxima() {
  const proxima = await db("chat_fila")
    .join("chat_conversas", "chat_fila.conversa_id", "chat_conversas.id")
    .where("chat_conversas.status", "AGUARDANDO_ATENDENTE")
    .orderBy("chat_fila.prioridade", "desc") // Maior prioridade primeiro
    .orderBy("chat_fila.posicao", "asc") // Menor posição primeiro
    .select(
      "chat_fila.*",
      "chat_conversas.nome_visitante",
      "chat_conversas.email_visitante",
      "chat_conversas.assunto",
      "chat_conversas.usuario_id",
      "chat_conversas.criado_em as conversa_criado_em"
    )
    .first();

  return proxima || null;
}

/**
 * Lista toda a fila de atendimento
 * @param {Object} [opcoes] - Opções de listagem
 * @param {number} [opcoes.limite=50] - Limite de registros
 * @returns {Promise<Array>} Lista de conversas na fila
 */
async function listar({ limite = 50 } = {}) {
  return db("chat_fila")
    .join("chat_conversas", "chat_fila.conversa_id", "chat_conversas.id")
    .where("chat_conversas.status", "AGUARDANDO_ATENDENTE")
    .orderBy("chat_fila.prioridade", "desc")
    .orderBy("chat_fila.posicao", "asc")
    .limit(limite)
    .select(
      "chat_fila.id",
      "chat_fila.conversa_id",
      "chat_fila.posicao",
      "chat_fila.prioridade",
      "chat_fila.criado_em as adicionado_em",
      "chat_conversas.nome_visitante",
      "chat_conversas.email_visitante",
      "chat_conversas.assunto",
      "chat_conversas.usuario_id",
      "chat_conversas.criado_em as conversa_criado_em"
    );
}

/**
 * Conta quantas conversas estão na fila
 * @returns {Promise<number>} Total de conversas na fila
 */
async function contarFila() {
  const resultado = await db("chat_fila")
    .join("chat_conversas", "chat_fila.conversa_id", "chat_conversas.id")
    .where("chat_conversas.status", "AGUARDANDO_ATENDENTE")
    .count("* as total")
    .first();

  return parseInt(resultado?.total || 0);
}

/**
 * Atualiza prioridade de uma conversa na fila
 * @param {number} conversa_id - ID da conversa
 * @param {number} prioridade - Nova prioridade (1=Normal, 2=Alta, 3=Urgente)
 * @returns {Promise<boolean>} Se foi atualizada
 */
async function atualizarPrioridade(conversa_id, prioridade) {
  const atualizado = await db("chat_fila")
    .where({ conversa_id })
    .update({ prioridade });

  return atualizado > 0;
}

/**
 * Obtém estatísticas da fila
 * @returns {Promise<Object>} Estatísticas
 */
async function obterEstatisticas() {
  try {
    const [total, porPrioridade, tempoMedioEspera] = await Promise.all([
      contarFila(),
      db("chat_fila")
        .join("chat_conversas", "chat_fila.conversa_id", "chat_conversas.id")
        .where("chat_conversas.status", "AGUARDANDO_ATENDENTE")
        .select("prioridade")
        .count("* as total")
        .groupBy("prioridade"),
      db("chat_fila")
        .join("chat_conversas", "chat_fila.conversa_id", "chat_conversas.id")
        .where("chat_conversas.status", "AGUARDANDO_ATENDENTE")
        .select(
          db.raw(
            "AVG(EXTRACT(EPOCH FROM (NOW() - chat_fila.criado_em))) as tempo_espera"
          )
        )
        .first(),
    ]);

    const prioridadeMap = { 1: "normal", 2: "alta", 3: "urgente" };
    const porPrioridadeFormatado = {};
    porPrioridade.forEach((p) => {
      porPrioridadeFormatado[prioridadeMap[p.prioridade]] = parseInt(p.total);
    });

    return {
      total,
      porPrioridade: porPrioridadeFormatado,
      tempoMedioEsperaSegundos: Math.round(tempoMedioEspera?.tempo_espera || 0),
    };
  } catch (error) {
    console.error("Erro ao obter estatísticas da fila:", error);
    // Retorna valores padrão em caso de erro
    return {
      total: 0,
      porPrioridade: {},
      tempoMedioEsperaSegundos: 0,
    };
  }
}

module.exports = {
  adicionarNaFila,
  removerDaFila,
  obterPosicao,
  obterProxima,
  listar,
  contarFila,
  atualizarPrioridade,
  obterEstatisticas,
};
