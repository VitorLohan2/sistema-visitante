/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHAT SUPORTE CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Controller para o sistema de chat de suporte híbrido (IA + humano).
 *
 * ROTAS PÚBLICAS (visitantes não logados):
 * - POST /chat-suporte/conversas/iniciar - Inicia conversa como visitante
 * - POST /chat-suporte/conversas/:id/mensagens - Envia mensagem (com token temporário)
 *
 * ROTAS AUTENTICADAS (usuários logados):
 * - GET  /chat-suporte/conversas - Lista conversas do usuário
 * - POST /chat-suporte/conversas - Cria nova conversa
 * - GET  /chat-suporte/conversas/:id - Detalhes da conversa
 * - GET  /chat-suporte/conversas/:id/mensagens - Mensagens da conversa
 * - POST /chat-suporte/conversas/:id/mensagens - Envia mensagem
 * - POST /chat-suporte/conversas/:id/solicitar-atendente - Solicita humano
 * - POST /chat-suporte/conversas/:id/finalizar - Finaliza conversa
 * - POST /chat-suporte/conversas/:id/avaliar - Avalia atendimento
 *
 * ROTAS DO ATENDENTE (com permissão):
 * - GET  /chat-suporte/atendente/fila - Lista fila de atendimento
 * - GET  /chat-suporte/atendente/conversas - Lista conversas do atendente
 * - POST /chat-suporte/atendente/aceitar/:id - Aceita conversa da fila
 * - POST /chat-suporte/atendente/mensagem/:id - Envia mensagem como atendente
 * - POST /chat-suporte/atendente/finalizar/:id - Finaliza atendimento
 * - POST /chat-suporte/atendente/transferir/:id - Transfere conversa
 *
 * ROTAS ADMINISTRATIVAS:
 * - GET  /chat-suporte/admin/estatisticas - Estatísticas do chat
 * - GET  /chat-suporte/admin/auditoria - Logs de auditoria
 * - GET  /chat-suporte/admin/faq - Lista FAQs
 * - POST /chat-suporte/admin/faq - Cria/atualiza FAQ
 * - DELETE /chat-suporte/admin/faq/:id - Remove FAQ
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const ChatSuporteService = require("../services/ChatSuporteService");
const FilaService = require("../services/ChatFilaService");
const IAService = require("../services/ChatIAService");
const AuditoriaService = require("../services/ChatAuditoriaService");
const { getIo } = require("../socket");
const crypto = require("crypto");

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera token temporário para visitantes não logados
 */
function gerarTokenVisitante(conversa_id, email) {
  const dados = `${conversa_id}:${email}:${Date.now()}`;
  return crypto
    .createHash("sha256")
    .update(dados)
    .digest("hex")
    .substring(0, 32);
}

/**
 * Emite evento via Socket.IO
 */
function emitirEvento(evento, dados, sala = null) {
  const io = getIo();
  if (io) {
    if (sala) {
      io.to(sala).emit(evento, dados);
    } else {
      io.emit(evento, dados);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ROTAS PÚBLICAS (Visitantes)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inicia uma conversa como visitante (não logado)
 * POST /chat-suporte/conversas/iniciar
 */
const iniciarConversaVisitante = async (req, res) => {
  try {
    const { nome, email, assunto } = req.body;

    if (!nome || !email) {
      return res.status(400).json({
        error: "Nome e email são obrigatórios",
      });
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Email inválido",
      });
    }

    const conversa = await ChatSuporteService.criarConversa({
      nome,
      email,
      assunto,
      ip_visitante: req.ip,
      user_agent: req.headers["user-agent"],
    });

    // Gera token temporário para o visitante
    const tokenVisitante = gerarTokenVisitante(conversa.id, email);

    // Busca mensagens iniciais (boas-vindas do bot)
    const mensagens = await ChatSuporteService.buscarMensagens(conversa.id);

    // Emite evento para atendentes (nova conversa)
    emitirEvento("chat-suporte:nova-conversa", conversa, "atendentes");

    res.status(201).json({
      conversa,
      mensagens,
      tokenVisitante, // Token para identificar o visitante nas próximas requisições
    });
  } catch (error) {
    console.error("Erro ao iniciar conversa:", error);
    res.status(500).json({ error: "Erro ao iniciar conversa" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ROTAS AUTENTICADAS (Usuários)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lista conversas do usuário logado
 * GET /chat-suporte/conversas
 */
const listarConversas = async (req, res) => {
  try {
    const usuario_id = req.usuario?.id;
    const { status, limite } = req.query;

    const conversas = await ChatSuporteService.listarConversasUsuario({
      usuario_id,
      status,
      limite: limite ? parseInt(limite) : 20,
    });

    res.json(conversas);
  } catch (error) {
    console.error("Erro ao listar conversas:", error);
    res.status(500).json({ error: "Erro ao listar conversas" });
  }
};

/**
 * Cria nova conversa (usuário logado)
 * POST /chat-suporte/conversas
 */
const criarConversa = async (req, res) => {
  try {
    const { assunto } = req.body;

    const conversa = await ChatSuporteService.criarConversa({
      usuario_id: req.usuario?.id,
      nome: req.usuario?.nome,
      email: req.usuario?.email,
      assunto,
      ip_visitante: req.ip,
      user_agent: req.headers["user-agent"],
    });

    const mensagens = await ChatSuporteService.buscarMensagens(conversa.id);

    // Se é uma conversa já existente, retorna sem emitir evento de nova conversa
    if (conversa.jaExistente) {
      return res.status(200).json({ conversa, mensagens, jaExistente: true });
    }

    // Emite evento para atendentes (só para novas conversas)
    emitirEvento("chat-suporte:nova-conversa", conversa, "atendentes");

    res.status(201).json({ conversa, mensagens });
  } catch (error) {
    console.error("Erro ao criar conversa:", error);
    res.status(500).json({ error: "Erro ao criar conversa" });
  }
};

/**
 * Busca detalhes de uma conversa
 * GET /chat-suporte/conversas/:id
 */
const buscarConversa = async (req, res) => {
  try {
    const { id } = req.params;
    const conversa = await ChatSuporteService.buscarConversa(parseInt(id));

    if (!conversa) {
      return res.status(404).json({ error: "Conversa não encontrada" });
    }

    // Verifica se o usuário tem acesso à conversa
    // Permite: dono da conversa OU atendente da conversa OU qualquer atendente se está em atendimento
    const isOwner =
      conversa.usuario_id && conversa.usuario_id === req.usuario?.id;
    const isAtendente =
      conversa.atendente_id && conversa.atendente_id === req.usuario?.id;
    const isEmAtendimento = conversa.status === "EM_ATENDIMENTO";

    if (!isOwner && !isAtendente && !isEmAtendimento) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Busca mensagens
    const mensagens = await ChatSuporteService.buscarMensagens(parseInt(id));

    // Busca posição na fila se estiver aguardando
    let posicaoFila = null;
    if (conversa.status === "AGUARDANDO_ATENDENTE") {
      posicaoFila = await FilaService.obterPosicao(conversa.id);
    }

    res.json({ conversa, mensagens, posicaoFila });
  } catch (error) {
    console.error("Erro ao buscar conversa:", error);
    res.status(500).json({ error: "Erro ao buscar conversa" });
  }
};

/**
 * Busca mensagens de uma conversa
 * GET /chat-suporte/conversas/:id/mensagens
 */
const buscarMensagens = async (req, res) => {
  try {
    const { id } = req.params;
    const { limite, offset } = req.query;

    const mensagens = await ChatSuporteService.buscarMensagens(parseInt(id), {
      limite: limite ? parseInt(limite) : 100,
      offset: offset ? parseInt(offset) : 0,
    });

    res.json(mensagens);
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    res.status(500).json({ error: "Erro ao buscar mensagens" });
  }
};

/**
 * Envia mensagem em uma conversa
 * POST /chat-suporte/conversas/:id/mensagens
 */
const enviarMensagem = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensagem } = req.body;
    const conversa_id = parseInt(id);

    if (!mensagem || !mensagem.trim()) {
      return res.status(400).json({ error: "Mensagem não pode estar vazia" });
    }

    const resultado = await ChatSuporteService.processarMensagemUsuario(
      conversa_id,
      mensagem.trim(),
      {
        usuario_id: req.usuario?.id,
        usuario_nome: req.usuario?.nome,
      }
    );

    // Emite eventos via Socket.IO
    // Para a sala da conversa (quem está visualizando)
    emitirEvento(
      "chat-suporte:mensagem",
      {
        conversa_id,
        mensagem: resultado.mensagemUsuario,
      },
      `conversa:${conversa_id}`
    );

    // TAMBÉM emite para a sala de atendentes (para badges globais e notificações)
    emitirEvento(
      "chat-suporte:mensagem",
      {
        conversa_id,
        mensagem: resultado.mensagemUsuario,
      },
      "atendentes"
    );

    if (resultado.mensagemBot) {
      emitirEvento(
        "chat-suporte:mensagem",
        {
          conversa_id,
          mensagem: resultado.mensagemBot,
        },
        `conversa:${conversa_id}`
      );
    }

    // Se solicitou humano, notifica atendentes
    if (resultado.solicitouHumano) {
      emitirEvento(
        "chat-suporte:fila-atualizada",
        {
          posicao: resultado.posicaoFila,
          conversa_id,
        },
        "atendentes"
      );
    }

    res.json(resultado);
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    res.status(500).json({ error: error.message || "Erro ao enviar mensagem" });
  }
};

/**
 * Solicita atendimento humano
 * POST /chat-suporte/conversas/:id/solicitar-atendente
 */
const solicitarAtendente = async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await ChatSuporteService.solicitarAtendimentoHumano(
      parseInt(id),
      {
        usuario_id: req.usuario?.id,
        usuario_nome: req.usuario?.nome,
      }
    );

    // Notifica atendentes
    emitirEvento("chat-suporte:fila-atualizada", null, "atendentes");

    res.json(resultado);
  } catch (error) {
    console.error("Erro ao solicitar atendente:", error);
    res
      .status(500)
      .json({ error: error.message || "Erro ao solicitar atendente" });
  }
};

/**
 * Finaliza uma conversa
 * POST /chat-suporte/conversas/:id/finalizar
 */
const finalizarConversa = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const conversa = await ChatSuporteService.finalizarConversa(parseInt(id), {
      finalizado_por_id: req.usuario?.id,
      finalizado_por_nome: req.usuario?.nome,
      motivo,
    });

    // Emite evento
    emitirEvento(
      "chat-suporte:conversa-finalizada",
      {
        conversa_id: parseInt(id),
      },
      `conversa:${id}`
    );

    res.json(conversa);
  } catch (error) {
    console.error("Erro ao finalizar conversa:", error);
    res
      .status(500)
      .json({ error: error.message || "Erro ao finalizar conversa" });
  }
};

/**
 * Avalia atendimento
 * POST /chat-suporte/conversas/:id/avaliar
 */
const avaliarAtendimento = async (req, res) => {
  try {
    const { id } = req.params;
    const { nota, comentario } = req.body;

    if (!nota || nota < 1 || nota > 5) {
      return res.status(400).json({ error: "Nota deve ser entre 1 e 5" });
    }

    const avaliacao = await ChatSuporteService.avaliarAtendimento(
      parseInt(id),
      nota,
      comentario
    );

    res.json(avaliacao);
  } catch (error) {
    console.error("Erro ao avaliar atendimento:", error);
    res
      .status(500)
      .json({ error: error.message || "Erro ao avaliar atendimento" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ROTAS DO ATENDENTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lista fila de atendimento
 * GET /chat-suporte/atendente/fila
 */
const listarFila = async (req, res) => {
  try {
    const fila = await FilaService.listar();
    const estatisticas = await FilaService.obterEstatisticas();

    res.json({ fila, estatisticas });
  } catch (error) {
    console.error("Erro ao listar fila:", error);

    // Verifica se é erro de tabela não existente
    if (
      error.code === "42P01" ||
      error.message?.includes("relation") ||
      error.message?.includes("does not exist")
    ) {
      return res.status(500).json({
        error: "Tabelas do chat não configuradas",
        details:
          "Execute o script create_chat_suporte_tables.sql no banco de dados",
      });
    }

    res.status(500).json({ error: "Erro ao listar fila" });
  }
};

/**
 * Lista conversas do atendente
 * GET /chat-suporte/atendente/conversas
 */
const listarConversasAtendente = async (req, res) => {
  try {
    const { status, limite } = req.query;

    const conversas = await ChatSuporteService.listarConversasAtendente({
      atendente_id: req.usuario?.id,
      status: status ? status.split(",") : ["EM_ATENDIMENTO"],
      limite: limite ? parseInt(limite) : 50,
    });

    res.json(conversas);
  } catch (error) {
    console.error("Erro ao listar conversas do atendente:", error);
    res.status(500).json({ error: "Erro ao listar conversas" });
  }
};

/**
 * Lista histórico de conversas do atendente
 * GET /chat-suporte/atendente/historico
 */
const listarHistoricoAtendente = async (req, res) => {
  try {
    const { page = 1, search = "", limite = 20 } = req.query;

    const conversas = await ChatSuporteService.listarConversasAtendente({
      atendente_id: req.usuario?.id,
      status: ["FINALIZADA", "RESOLVIDA_IA"],
      limite: parseInt(limite),
      offset: (parseInt(page) - 1) * parseInt(limite),
      busca: search,
    });

    res.json(conversas);
  } catch (error) {
    console.error("Erro ao listar histórico do atendente:", error);
    res.status(500).json({ error: "Erro ao listar histórico" });
  }
};

/**
 * Aceita uma conversa da fila
 * POST /chat-suporte/atendente/aceitar/:id
 */
const aceitarConversa = async (req, res) => {
  const atendente_id = req.usuario?.id;
  const atendente_nome = req.usuario?.nome;

  try {
    const { id } = req.params;

    const conversa = await ChatSuporteService.aceitarAtendimento(parseInt(id), {
      atendente_id,
      atendente_nome,
    });

    // Emite evento para a sala da conversa (cliente recebe)
    emitirEvento(
      "chat-suporte:atendente-entrou",
      {
        conversa_id: parseInt(id),
        atendente_nome,
      },
      `conversa:${id}`
    );

    // Emite também como broadcast geral para visitantes não autenticados
    // (eles fazem polling ou verificam pelo ID da conversa)
    const io = getIo();
    if (io) {
      io.emit("chat-suporte:atendente-entrou", {
        conversa_id: parseInt(id),
        atendente_nome,
      });
    }

    // Notifica atendentes que a fila mudou
    emitirEvento(
      "chat-suporte:fila-atualizada",
      { conversa_id: parseInt(id) },
      "atendentes"
    );

    res.json(conversa);
  } catch (error) {
    console.error("Erro ao aceitar conversa:", error);
    res
      .status(500)
      .json({ error: error.message || "Erro ao aceitar conversa" });
  }
};

/**
 * Envia mensagem como atendente
 * POST /chat-suporte/atendente/mensagem/:id
 */
const enviarMensagemAtendente = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensagem } = req.body;
    const conversa_id = parseInt(id);

    if (!mensagem || !mensagem.trim()) {
      return res.status(400).json({ error: "Mensagem não pode estar vazia" });
    }

    const msg = await ChatSuporteService.enviarMensagemAtendente(
      conversa_id,
      mensagem.trim(),
      {
        atendente_id: req.usuario?.id,
        atendente_nome: req.usuario?.nome,
      }
    );

    // Emite evento
    emitirEvento(
      "chat-suporte:mensagem",
      {
        conversa_id,
        mensagem: msg,
      },
      `conversa:${conversa_id}`
    );

    res.json(msg);
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    res.status(500).json({ error: error.message || "Erro ao enviar mensagem" });
  }
};

/**
 * Finaliza atendimento
 * POST /chat-suporte/atendente/finalizar/:id
 */
const finalizarAtendimento = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const conversa = await ChatSuporteService.finalizarConversa(parseInt(id), {
      finalizado_por_id: req.usuario?.id,
      finalizado_por_nome: req.usuario?.nome,
      motivo,
    });

    // Emite evento
    emitirEvento(
      "chat-suporte:conversa-finalizada",
      {
        conversa_id: parseInt(id),
      },
      `conversa:${id}`
    );

    res.json(conversa);
  } catch (error) {
    console.error("Erro ao finalizar atendimento:", error);
    res
      .status(500)
      .json({ error: error.message || "Erro ao finalizar atendimento" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ROTAS ADMINISTRATIVAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtém estatísticas do chat
 * GET /chat-suporte/admin/estatisticas
 */
const obterEstatisticas = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;

    const estatisticas = await ChatSuporteService.obterEstatisticas({
      dataInicio: dataInicio ? new Date(dataInicio) : null,
      dataFim: dataFim ? new Date(dataFim) : null,
    });

    res.json(estatisticas);
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    res.status(500).json({ error: "Erro ao obter estatísticas" });
  }
};

/**
 * Lista logs de auditoria
 * GET /chat-suporte/admin/auditoria
 */
const listarAuditoria = async (req, res) => {
  try {
    const { dataInicio, dataFim, acao, conversa_id, limite, offset } =
      req.query;

    let logs;
    if (conversa_id) {
      logs = await AuditoriaService.buscarPorConversa(parseInt(conversa_id));
    } else {
      logs = await AuditoriaService.buscarPorPeriodo({
        dataInicio: dataInicio ? new Date(dataInicio) : null,
        dataFim: dataFim ? new Date(dataFim) : null,
        acao,
        limite: limite ? parseInt(limite) : 100,
        offset: offset ? parseInt(offset) : 0,
      });
    }

    res.json(logs);
  } catch (error) {
    console.error("Erro ao listar auditoria:", error);
    res.status(500).json({ error: "Erro ao listar auditoria" });
  }
};

/**
 * Lista FAQs
 * GET /chat-suporte/admin/faq
 */
const listarFAQs = async (req, res) => {
  try {
    const { categoria, apenasAtivos } = req.query;

    const faqs = await IAService.listarFAQs({
      categoria,
      apenasAtivos: apenasAtivos !== "false",
    });

    res.json(faqs);
  } catch (error) {
    console.error("Erro ao listar FAQs:", error);
    res.status(500).json({ error: "Erro ao listar FAQs" });
  }
};

/**
 * Cria ou atualiza FAQ
 * POST /chat-suporte/admin/faq
 */
const salvarFAQ = async (req, res) => {
  try {
    const { id, pergunta, resposta, palavras_chave, categoria, ativo } =
      req.body;

    if (!pergunta || !resposta) {
      return res.status(400).json({
        error: "Pergunta e resposta são obrigatórias",
      });
    }

    const faq = await IAService.salvarFAQ({
      id,
      pergunta,
      resposta,
      palavras_chave,
      categoria,
      ativo,
    });

    res.json(faq);
  } catch (error) {
    console.error("Erro ao salvar FAQ:", error);
    res.status(500).json({ error: "Erro ao salvar FAQ" });
  }
};

/**
 * Remove FAQ
 * DELETE /chat-suporte/admin/faq/:id
 */
const removerFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const removido = await IAService.removerFAQ(parseInt(id));

    if (!removido) {
      return res.status(404).json({ error: "FAQ não encontrado" });
    }

    res.json({ message: "FAQ removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover FAQ:", error);
    res.status(500).json({ error: "Erro ao remover FAQ" });
  }
};

/**
 * Lista todas as conversas (admin)
 * GET /chat-suporte/admin/conversas
 */
const listarTodasConversas = async (req, res) => {
  try {
    const { status, limite } = req.query;

    const conversas = await ChatSuporteService.listarConversasAtendente({
      status: status ? status.split(",") : null,
      limite: limite ? parseInt(limite) : 100,
    });

    res.json(conversas);
  } catch (error) {
    console.error("Erro ao listar conversas:", error);
    res.status(500).json({ error: "Erro ao listar conversas" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ROTAS PARA VISITANTES (usando token temporário)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Envia mensagem como visitante (não logado)
 * POST /chat-suporte/visitante/conversas/:id/mensagens
 */
const enviarMensagemVisitante = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensagem, token } = req.body;
    const conversa_id = parseInt(id);

    if (!mensagem || !mensagem.trim()) {
      return res.status(400).json({ error: "Mensagem não pode estar vazia" });
    }

    if (!token) {
      return res
        .status(401)
        .json({ error: "Token de visitante não fornecido" });
    }

    // Busca a conversa
    const conversa = await ChatSuporteService.buscarConversa(conversa_id);
    if (!conversa) {
      return res.status(404).json({ error: "Conversa não encontrada" });
    }

    // Valida que a conversa é de um visitante (sem usuario_id)
    if (conversa.usuario_id) {
      return res
        .status(403)
        .json({ error: "Esta conversa pertence a um usuário logado" });
    }

    // Processa a mensagem
    const resultado = await ChatSuporteService.processarMensagemUsuario(
      conversa_id,
      mensagem.trim(),
      {
        visitante_nome: conversa.nome_visitante,
        visitante_email: conversa.email_visitante,
      }
    );

    // Emite eventos via Socket.IO
    // Para a sala da conversa (quem está visualizando)
    emitirEvento(
      "chat-suporte:mensagem",
      {
        conversa_id,
        mensagem: resultado.mensagemUsuario,
      },
      `conversa:${conversa_id}`
    );

    // TAMBÉM emite para a sala de atendentes (para badges globais e notificações)
    emitirEvento(
      "chat-suporte:mensagem",
      {
        conversa_id,
        mensagem: resultado.mensagemUsuario,
      },
      "atendentes"
    );

    if (resultado.mensagemBot) {
      emitirEvento(
        "chat-suporte:mensagem",
        {
          conversa_id,
          mensagem: resultado.mensagemBot,
        },
        `conversa:${conversa_id}`
      );
    }

    // Se solicitou humano, notifica atendentes
    if (resultado.solicitouHumano) {
      // Evento específico para nova conversa na fila
      emitirEvento(
        "chat-suporte:nova-fila",
        {
          conversa_id,
          posicao: resultado.posicaoFila,
          nome: conversa.nome_visitante, // Adiciona nome para notificação
        },
        "atendentes"
      );

      // Evento genérico de fila atualizada
      emitirEvento(
        "chat-suporte:fila-atualizada",
        {
          posicao: resultado.posicaoFila,
          conversa_id,
        },
        "atendentes"
      );
    }

    res.json(resultado);
  } catch (error) {
    console.error("Erro ao enviar mensagem (visitante):", error);
    res.status(500).json({ error: error.message || "Erro ao enviar mensagem" });
  }
};

/**
 * Busca conversa do visitante
 * GET /chat-suporte/visitante/conversas/:id
 */
const buscarConversaVisitante = async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers["x-chat-token"];

    console.log(
      `📡 [Visitante] Busca conversa ${id}, token: ${token ? "presente" : "ausente"}`
    );

    if (!token) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const conversa = await ChatSuporteService.buscarConversa(parseInt(id));

    if (!conversa) {
      console.log(`❌ [Visitante] Conversa ${id} não encontrada`);
      return res.status(404).json({ error: "Conversa não encontrada" });
    }

    console.log(
      `📡 [Visitante] Conversa ${id} encontrada, status: ${conversa.status}, usuario_id: ${conversa.usuario_id}`
    );

    // Verifica se é de visitante
    if (conversa.usuario_id) {
      console.log(
        `❌ [Visitante] Conversa ${id} pertence a usuário logado, acesso negado`
      );
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Busca mensagens
    const mensagens = await ChatSuporteService.buscarMensagens(parseInt(id));

    // Busca posição na fila se estiver aguardando
    let posicaoFila = null;
    if (conversa.status === "AGUARDANDO_ATENDENTE") {
      posicaoFila = await FilaService.obterPosicao(conversa.id);
    }

    console.log(
      `✅ [Visitante] Retornando conversa ${id}: status=${conversa.status}, mensagens=${mensagens.length}`
    );
    res.json({ conversa, mensagens, posicaoFila });
  } catch (error) {
    console.error("Erro ao buscar conversa (visitante):", error);
    res.status(500).json({ error: "Erro ao buscar conversa" });
  }
};

/**
 * Solicita atendimento humano (visitante)
 * POST /chat-suporte/visitante/conversas/:id/solicitar-atendente
 */
const solicitarAtendenteVisitante = async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const conversa = await ChatSuporteService.buscarConversa(parseInt(id));

    if (!conversa || conversa.usuario_id) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const resultado = await ChatSuporteService.solicitarAtendimentoHumano(
      parseInt(id),
      {
        visitante_nome: conversa.nome_visitante,
      }
    );

    // Notifica atendentes
    emitirEvento("chat-suporte:fila-atualizada", null, "atendentes");

    res.json(resultado);
  } catch (error) {
    console.error("Erro ao solicitar atendente (visitante):", error);
    res
      .status(500)
      .json({ error: error.message || "Erro ao solicitar atendente" });
  }
};

module.exports = {
  // Públicas (Visitantes)
  iniciarConversaVisitante,
  enviarMensagemVisitante,
  buscarConversaVisitante,
  solicitarAtendenteVisitante,

  // Usuário autenticado
  listarConversas,
  criarConversa,
  buscarConversa,
  buscarMensagens,
  enviarMensagem,
  solicitarAtendente,
  finalizarConversa,
  avaliarAtendimento,

  // Atendente
  listarFila,
  listarConversasAtendente,
  listarHistoricoAtendente,
  aceitarConversa,
  enviarMensagemAtendente,
  finalizarAtendimento,

  // Admin
  obterEstatisticas,
  listarAuditoria,
  listarFAQs,
  salvarFAQ,
  removerFAQ,
  listarTodasConversas,
};
