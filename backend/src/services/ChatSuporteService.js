/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHAT SUPORTE SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Serviço principal do sistema de chat de suporte.
 * Gerencia conversas, mensagens e integrações com outros serviços.
 *
 * FUNCIONALIDADES:
 * - Criar e gerenciar conversas
 * - Enviar e receber mensagens
 * - Integração com IA para respostas automáticas
 * - Gerenciamento de atendentes
 * - Controle de concorrência
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const db = require("../database/connection");
const FilaService = require("./ChatFilaService");
const IAService = require("./ChatIAService");
const AuditoriaService = require("./ChatAuditoriaService");

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cria uma nova conversa
 * @param {Object} dados - Dados da conversa
 * @param {string} [dados.usuario_id] - ID do usuário logado (se estiver logado)
 * @param {string} dados.nome - Nome do visitante/usuário
 * @param {string} dados.email - Email do visitante/usuário
 * @param {string} [dados.assunto] - Assunto da conversa
 * @param {string} [dados.ip_visitante] - IP do visitante
 * @param {string} [dados.user_agent] - User Agent do navegador
 * @returns {Promise<Object>} Conversa criada ou existente
 */
async function criarConversa({
  usuario_id,
  nome,
  email,
  assunto,
  ip_visitante,
  user_agent,
}) {
  try {
    // VERIFICAÇÃO: Para usuários logados, verifica se já existe conversa ativa
    if (usuario_id) {
      const conversaExistente = await db("chat_conversas")
        .where({ usuario_id })
        .whereIn("status", ["BOT", "AGUARDANDO_ATENDENTE", "EM_ATENDIMENTO"])
        .orderBy("criado_em", "desc")
        .first();

      if (conversaExistente) {
        console.log(
          `ℹ️ Usuário ${usuario_id} já possui conversa ativa #${conversaExistente.id}`
        );
        return { ...conversaExistente, jaExistente: true };
      }
    }

    const [conversa] = await db("chat_conversas")
      .insert({
        usuario_id: usuario_id || null,
        nome_visitante: nome,
        email_visitante: email,
        assunto: assunto || null,
        status: "BOT",
        ip_visitante,
        user_agent,
      })
      .returning("*");

    // Registra auditoria
    await AuditoriaService.conversaCriada(conversa.id, {
      nome,
      email,
      usuario_id,
      ip_address: ip_visitante,
      user_agent,
    });

    // Envia mensagem de boas-vindas do bot
    await enviarMensagem({
      conversa_id: conversa.id,
      origem: "BOT",
      mensagem: `Olá ${nome.split(" ")[0]}! 👋 Sou o assistente virtual do Sistema de Gestão de Visitantes. Como posso ajudar você hoje?`,
    });

    console.log(`✅ Conversa #${conversa.id} criada para ${nome} (${email})`);
    return conversa;
  } catch (error) {
    console.error("❌ Erro ao criar conversa:", error);
    throw error;
  }
}

/**
 * Busca uma conversa pelo ID
 * @param {number} conversa_id - ID da conversa
 * @returns {Promise<Object|null>} Conversa ou null
 */
async function buscarConversa(conversa_id) {
  return db("chat_conversas as c")
    .leftJoin("usuarios as u", "c.atendente_id", "u.id")
    .select("c.*", "u.nome as atendente_nome")
    .where({ "c.id": conversa_id })
    .first();
}

/**
 * Lista conversas de um usuário
 * @param {Object} filtros - Filtros de busca
 * @param {string} [filtros.usuario_id] - ID do usuário
 * @param {string} [filtros.email] - Email do visitante
 * @param {string} [filtros.status] - Status da conversa (pode ser lista separada por vírgula)
 * @param {number} [filtros.limite=20] - Limite de resultados
 * @returns {Promise<Array>} Lista de conversas
 */
async function listarConversasUsuario({
  usuario_id,
  email,
  status,
  limite = 20,
}) {
  let query = db("chat_conversas as c")
    .leftJoin("usuarios as u", "c.atendente_id", "u.id")
    .select("c.*", "u.nome as atendente_nome")
    .orderBy("c.criado_em", "desc")
    .limit(limite);

  if (usuario_id) {
    query = query.where({ "c.usuario_id": usuario_id });
  } else if (email) {
    query = query.where({ "c.email_visitante": email });
  }

  if (status) {
    // Suporta múltiplos status separados por vírgula
    const statusList = status.split(",").map((s) => s.trim());
    query = query.whereIn("c.status", statusList);
  }

  return query;
}

/**
 * Lista conversas para o painel do atendente
 * @param {Object} filtros - Filtros de busca
 * @param {string} [filtros.status] - Status da conversa
 * @param {string} [filtros.atendente_id] - ID do atendente
 * @param {number} [filtros.limite=50] - Limite de resultados
 * @param {number} [filtros.offset=0] - Offset para paginação
 * @param {string} [filtros.busca] - Termo de busca
 * @returns {Promise<Object>} Lista de conversas com última mensagem
 */
async function listarConversasAtendente({
  status,
  atendente_id,
  limite = 50,
  offset = 0,
  busca,
}) {
  let query = db("chat_conversas as c")
    .leftJoin("usuarios as u", "c.atendente_id", "u.id")
    .select(
      "c.*",
      "u.nome as atendente_nome",
      db.raw(`(
        SELECT mensagem FROM chat_mensagens 
        WHERE conversa_id = c.id 
        ORDER BY criado_em DESC LIMIT 1
      ) as ultima_mensagem`),
      db.raw(`(
        SELECT criado_em FROM chat_mensagens 
        WHERE conversa_id = c.id 
        ORDER BY criado_em DESC LIMIT 1
      ) as ultima_mensagem_em`),
      db.raw(`(
        SELECT COUNT(*) FROM chat_mensagens 
        WHERE conversa_id = c.id AND lida = false AND origem = 'USUARIO'
      )::int as mensagens_nao_lidas`)
    )
    .orderBy("c.criado_em", "desc")
    .limit(limite)
    .offset(offset);

  if (status) {
    if (Array.isArray(status)) {
      query = query.whereIn("c.status", status);
    } else {
      query = query.where("c.status", status);
    }
  }

  if (atendente_id) {
    query = query.where("c.atendente_id", atendente_id);
  }

  if (busca) {
    query = query.where(function () {
      this.where("c.nome_visitante", "ilike", `%${busca}%`)
        .orWhere("c.email_visitante", "ilike", `%${busca}%`)
        .orWhere("c.assunto", "ilike", `%${busca}%`);
    });
  }

  const conversas = await query;
  return { conversas };
}

/**
 * Atualiza status de uma conversa
 * @param {number} conversa_id - ID da conversa
 * @param {string} status - Novo status
 * @param {Object} [dadosAdicionais] - Dados adicionais para atualizar
 * @returns {Promise<Object>} Conversa atualizada
 */
async function atualizarStatus(conversa_id, status, dadosAdicionais = {}) {
  const [conversa] = await db("chat_conversas")
    .where({ id: conversa_id })
    .update({
      status,
      ...dadosAdicionais,
    })
    .returning("*");

  return conversa;
}

// ═══════════════════════════════════════════════════════════════════════════
// MENSAGENS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Envia uma mensagem
 * @param {Object} dados - Dados da mensagem
 * @param {number} dados.conversa_id - ID da conversa
 * @param {string} dados.origem - Origem (USUARIO, BOT, ATENDENTE, SISTEMA)
 * @param {string} dados.mensagem - Conteúdo da mensagem
 * @param {string} [dados.remetente_id] - ID do remetente
 * @param {string} [dados.remetente_nome] - Nome do remetente
 * @param {Object} [dados.ia_contexto] - Contexto da IA (se aplicável)
 * @param {number} [dados.ia_confianca] - Confiança da resposta da IA
 * @returns {Promise<Object>} Mensagem criada
 */
async function enviarMensagem({
  conversa_id,
  origem,
  mensagem,
  remetente_id,
  remetente_nome,
  ia_contexto,
  ia_confianca,
}) {
  const [msg] = await db("chat_mensagens")
    .insert({
      conversa_id,
      origem,
      mensagem,
      remetente_id: remetente_id || null,
      remetente_nome: remetente_nome || null,
      ia_contexto: ia_contexto ? JSON.stringify(ia_contexto) : null,
      ia_confianca: ia_confianca || null,
    })
    .returning("*");

  return msg;
}

/**
 * Busca mensagens de uma conversa
 * @param {number} conversa_id - ID da conversa
 * @param {Object} [opcoes] - Opções de busca
 * @param {number} [opcoes.limite=100] - Limite de mensagens
 * @param {number} [opcoes.offset=0] - Offset para paginação
 * @returns {Promise<Array>} Lista de mensagens
 */
async function buscarMensagens(conversa_id, { limite = 100, offset = 0 } = {}) {
  return db("chat_mensagens")
    .where({ conversa_id })
    .orderBy("criado_em", "asc")
    .limit(limite)
    .offset(offset);
}

/**
 * Marca mensagens como lidas
 * @param {number} conversa_id - ID da conversa
 * @param {string} [origem] - Filtrar por origem (opcional)
 * @returns {Promise<number>} Quantidade de mensagens atualizadas
 */
async function marcarMensagensComoLidas(conversa_id, origem) {
  let query = db("chat_mensagens").where({ conversa_id, lida: false });

  if (origem) {
    query = query.where({ origem });
  }

  return query.update({ lida: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// FLUXO DE ATENDIMENTO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Processa mensagem do usuário e gera resposta do bot
 * @param {number} conversa_id - ID da conversa
 * @param {string} mensagem - Mensagem do usuário
 * @param {Object} dados - Dados adicionais
 * @returns {Promise<Object>} Objeto com mensagens e ações
 */
async function processarMensagemUsuario(
  conversa_id,
  mensagem,
  { usuario_id, usuario_nome, visitante_nome, visitante_email }
) {
  const conversa = await buscarConversa(conversa_id);

  if (!conversa) {
    throw new Error("Conversa não encontrada");
  }

  // Nome do remetente (usuário logado ou visitante)
  const nomeRemetente =
    usuario_nome || visitante_nome || conversa.nome_visitante;

  // Salva mensagem do usuário
  const mensagemUsuario = await enviarMensagem({
    conversa_id,
    origem: "USUARIO",
    mensagem,
    remetente_id: usuario_id || null,
    remetente_nome: nomeRemetente,
  });

  // Registra auditoria
  await AuditoriaService.mensagemEnviada(conversa_id, {
    usuario_id,
    usuario_nome: nomeRemetente,
    mensagem_preview: mensagem,
  });

  const resultado = {
    mensagemUsuario,
    mensagemBot: null,
    solicitouHumano: false,
    posicaoFila: null,
  };

  // Se está em atendimento humano, não processa pelo bot
  if (conversa.status === "EM_ATENDIMENTO") {
    return resultado;
  }

  // Processa pelo bot
  if (conversa.status === "BOT") {
    const historico = await buscarMensagens(conversa_id);
    const respostaIA = await IAService.processarMensagem(mensagem, historico);

    // Verifica se solicitou atendente humano
    if (respostaIA.solicitouHumano) {
      resultado.solicitouHumano = true;

      // Adiciona à fila
      const itemFila = await FilaService.adicionarNaFila(conversa_id);
      resultado.posicaoFila = itemFila.posicao;

      // Registra auditoria
      await AuditoriaService.usuarioSolicitouAtendente(conversa_id, {
        usuario_id,
        usuario_nome,
      });

      // Envia mensagem do sistema sobre a fila
      const totalFila = await FilaService.contarFila();
      resultado.mensagemBot = await enviarMensagem({
        conversa_id,
        origem: "SISTEMA",
        mensagem: `${respostaIA.resposta}\n\nVocê está na posição ${itemFila.posicao} da fila. ${totalFila > 1 ? `Há ${totalFila - 1} pessoa(s) na sua frente.` : "Você é o próximo a ser atendido!"}`,
      });
    } else {
      // Resposta normal do bot
      resultado.mensagemBot = await enviarMensagem({
        conversa_id,
        origem: "BOT",
        mensagem: respostaIA.resposta,
        ia_contexto: { fonte: respostaIA.fonte },
        ia_confianca: respostaIA.confianca,
      });

      // Registra auditoria
      await AuditoriaService.mensagemBotEnviada(conversa_id, {
        confianca: respostaIA.confianca,
      });
    }
  }

  // Se está aguardando atendente, apenas confirma recebimento
  if (conversa.status === "AGUARDANDO_ATENDENTE") {
    const posicao = await FilaService.obterPosicao(conversa_id);
    resultado.posicaoFila = posicao;
    resultado.mensagemBot = await enviarMensagem({
      conversa_id,
      origem: "SISTEMA",
      mensagem: `Recebemos sua mensagem. Você está na posição ${posicao} da fila. Um atendente responderá em breve.`,
    });
  }

  return resultado;
}

/**
 * Solicita atendimento humano
 * @param {number} conversa_id - ID da conversa
 * @param {Object} dados - Dados do solicitante
 * @returns {Promise<Object>} Informações da fila
 */
async function solicitarAtendimentoHumano(
  conversa_id,
  { usuario_id, usuario_nome }
) {
  const conversa = await buscarConversa(conversa_id);

  if (!conversa) {
    throw new Error("Conversa não encontrada");
  }

  if (conversa.status === "EM_ATENDIMENTO") {
    throw new Error("Conversa já está em atendimento");
  }

  if (conversa.status === "AGUARDANDO_ATENDENTE") {
    const posicao = await FilaService.obterPosicao(conversa_id);
    return { posicao, jaEstaNaFila: true };
  }

  // Adiciona à fila
  const itemFila = await FilaService.adicionarNaFila(conversa_id);

  // Registra auditoria
  await AuditoriaService.usuarioSolicitouAtendente(conversa_id, {
    usuario_id,
    usuario_nome,
  });

  // Envia mensagem do sistema
  const totalFila = await FilaService.contarFila();
  await enviarMensagem({
    conversa_id,
    origem: "SISTEMA",
    mensagem: `Você foi adicionado à fila de atendimento. Posição: ${itemFila.posicao}. ${totalFila > 1 ? `Há ${totalFila - 1} pessoa(s) na sua frente.` : "Você é o próximo a ser atendido!"} Por favor, aguarde.`,
  });

  return { posicao: itemFila.posicao, jaEstaNaFila: false };
}

/**
 * Atendente aceita uma conversa da fila
 * @param {number} conversa_id - ID da conversa
 * @param {Object} atendente - Dados do atendente
 * @returns {Promise<Object>} Conversa atualizada
 */
async function aceitarAtendimento(
  conversa_id,
  { atendente_id, atendente_nome }
) {
  let conversaAtualizada;

  // Usa transação para garantir atomicidade (evitar dois atendentes pegarem a mesma conversa)
  await db.transaction(async (trx) => {
    // Verifica se a conversa está disponível
    const conversa = await trx("chat_conversas")
      .where({ id: conversa_id, status: "AGUARDANDO_ATENDENTE" })
      .forUpdate() // Lock para evitar race condition
      .first();

    if (!conversa) {
      throw new Error("Conversa não está mais disponível para atendimento");
    }

    // Atualiza a conversa
    const [updated] = await trx("chat_conversas")
      .where({ id: conversa_id })
      .update({
        atendente_id,
        status: "EM_ATENDIMENTO",
        iniciado_em: trx.fn.now(),
      })
      .returning("*");

    conversaAtualizada = updated;

    // Remove da fila
    await trx("chat_fila").where({ conversa_id }).del();
  });

  // FORA da transação - para evitar deadlock
  // Registra auditoria
  try {
    await AuditoriaService.atendenteAceitou(conversa_id, {
      atendente_id,
      atendente_nome,
    });
  } catch (err) {
    console.error(`⚠️ Erro na auditoria (não crítico):`, err.message);
  }

  // Envia mensagem de início de atendimento
  try {
    await enviarMensagem({
      conversa_id,
      origem: "SISTEMA",
      mensagem: `${atendente_nome} entrou no atendimento. Como posso ajudar?`,
      remetente_id: atendente_id,
      remetente_nome: atendente_nome,
    });
  } catch (err) {
    console.error(`⚠️ Erro ao enviar mensagem (não crítico):`, err.message);
  }

  console.log(
    `✅ Conversa #${conversa_id} aceita pelo atendente ${atendente_nome}`
  );
  return conversaAtualizada;
}

/**
 * Envia mensagem do atendente
 * @param {number} conversa_id - ID da conversa
 * @param {string} mensagem - Mensagem
 * @param {Object} atendente - Dados do atendente
 * @returns {Promise<Object>} Mensagem criada
 */
async function enviarMensagemAtendente(
  conversa_id,
  mensagem,
  { atendente_id, atendente_nome }
) {
  const conversa = await buscarConversa(conversa_id);

  if (!conversa) {
    throw new Error("Conversa não encontrada");
  }

  if (conversa.status !== "EM_ATENDIMENTO") {
    throw new Error("Conversa não está em atendimento");
  }

  if (conversa.atendente_id !== atendente_id) {
    throw new Error("Você não é o atendente desta conversa");
  }

  const msg = await enviarMensagem({
    conversa_id,
    origem: "ATENDENTE",
    mensagem,
    remetente_id: atendente_id,
    remetente_nome: atendente_nome,
  });

  return msg;
}

/**
 * Finaliza uma conversa
 * @param {number} conversa_id - ID da conversa
 * @param {Object} dados - Dados de quem finalizou
 * @returns {Promise<Object>} Conversa atualizada
 */
async function finalizarConversa(
  conversa_id,
  { finalizado_por_id, finalizado_por_nome, motivo }
) {
  const conversa = await buscarConversa(conversa_id);

  if (!conversa) {
    throw new Error("Conversa não encontrada");
  }

  if (conversa.status === "FINALIZADA") {
    throw new Error("Conversa já está finalizada");
  }

  // Remove da fila se estiver
  await FilaService.removerDaFila(conversa_id);

  // Atualiza status
  const [conversaAtualizada] = await db("chat_conversas")
    .where({ id: conversa_id })
    .update({
      status: "FINALIZADA",
      finalizado_em: db.fn.now(),
    })
    .returning("*");

  // Registra auditoria
  await AuditoriaService.conversaFinalizada(conversa_id, {
    finalizado_por_id,
    finalizado_por_nome,
    motivo,
  });

  // Envia mensagem de encerramento
  await enviarMensagem({
    conversa_id,
    origem: "SISTEMA",
    mensagem: motivo
      ? `Atendimento finalizado. Motivo: ${motivo}. Obrigado pelo contato!`
      : "Atendimento finalizado. Obrigado pelo contato! Se precisar de ajuda novamente, é só iniciar uma nova conversa.",
  });

  console.log(`✅ Conversa #${conversa_id} finalizada`);
  return conversaAtualizada;
}

/**
 * Envia avaliação do atendimento
 * @param {number} conversa_id - ID da conversa
 * @param {number} nota - Nota (1-5)
 * @param {string} [comentario] - Comentário opcional
 * @returns {Promise<Object>} Avaliação criada
 */
async function avaliarAtendimento(conversa_id, nota, comentario) {
  const conversa = await buscarConversa(conversa_id);

  if (!conversa) {
    throw new Error("Conversa não encontrada");
  }

  // Verifica se já existe avaliação
  const avaliacaoExistente = await db("chat_avaliacoes")
    .where({ conversa_id })
    .first();

  if (avaliacaoExistente) {
    throw new Error("Esta conversa já foi avaliada");
  }

  const [avaliacao] = await db("chat_avaliacoes")
    .insert({
      conversa_id,
      nota,
      comentario,
    })
    .returning("*");

  // Registra auditoria
  await AuditoriaService.avaliacaoEnviada(conversa_id, { nota, comentario });

  return avaliacao;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTATÍSTICAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtém estatísticas do chat
 * @param {Object} [filtros] - Filtros de período
 * @returns {Promise<Object>} Estatísticas
 */
async function obterEstatisticas({ dataInicio, dataFim } = {}) {
  let queryBase = db("chat_conversas");

  if (dataInicio) {
    queryBase = queryBase.where("criado_em", ">=", dataInicio);
  }
  if (dataFim) {
    queryBase = queryBase.where("criado_em", "<=", dataFim);
  }

  const [
    totalConversas,
    conversasPorStatus,
    tempoMedioAtendimento,
    avaliacaoMedia,
    estatisticasFila,
  ] = await Promise.all([
    queryBase.clone().count("* as total").first(),
    db("chat_conversas").select("status").count("* as total").groupBy("status"),
    db("chat_conversas")
      .whereNotNull("iniciado_em")
      .whereNotNull("finalizado_em")
      .avg(
        db.raw(
          "EXTRACT(EPOCH FROM (finalizado_em - iniciado_em)) as tempo_medio"
        )
      )
      .first(),
    db("chat_avaliacoes").avg("nota as media").count("* as total").first(),
    FilaService.obterEstatisticas(),
  ]);

  const statusMap = {};
  conversasPorStatus.forEach((s) => {
    statusMap[s.status] = parseInt(s.total);
  });

  return {
    totalConversas: parseInt(totalConversas?.total || 0),
    conversasPorStatus: statusMap,
    tempoMedioAtendimentoSegundos: Math.round(
      tempoMedioAtendimento?.tempo_medio || 0
    ),
    avaliacao: {
      media: parseFloat(avaliacaoMedia?.media || 0).toFixed(1),
      total: parseInt(avaliacaoMedia?.total || 0),
    },
    fila: estatisticasFila,
  };
}

module.exports = {
  // Conversas
  criarConversa,
  buscarConversa,
  listarConversasUsuario,
  listarConversasAtendente,
  atualizarStatus,

  // Mensagens
  enviarMensagem,
  buscarMensagens,
  marcarMensagensComoLidas,

  // Fluxo de atendimento
  processarMensagemUsuario,
  solicitarAtendimentoHumano,
  aceitarAtendimento,
  enviarMensagemAtendente,
  finalizarConversa,
  avaliarAtendimento,

  // Estatísticas
  obterEstatisticas,
};
