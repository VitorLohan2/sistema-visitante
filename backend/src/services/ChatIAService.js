/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHAT IA SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Serviço de integração com IA para respostas automáticas no chat.
 * Suporta múltiplos provedores de IA (Grok, OpenAI, etc.)
 *
 * FUNCIONALIDADES:
 * - Responder perguntas usando FAQ local
 * - Integração com API de IA externa (Grok/OpenAI)
 * - Detecção de intenção de falar com humano
 * - Fallback para respostas genéricas
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const db = require("../database/connection");

// Configuração da API de IA (pode ser Grok, OpenAI, etc.)
const IA_CONFIG = {
  // Para Grok (X.AI)
  GROK_API_KEY: process.env.GROK_API_KEY || "",
  GROK_API_URL: "https://api.x.ai/v1/chat/completions",

  // Para OpenAI (alternativa)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_API_URL: "https://api.openai.com/v1/chat/completions",

  // Modelo a usar
  MODEL: process.env.IA_MODEL || "grok-beta",

  // Timeout em ms
  TIMEOUT: 30000,
};

// Palavras-chave que indicam desejo de falar com humano
const PALAVRAS_ATENDENTE = [
  "atendente",
  "humano",
  "pessoa",
  "falar com alguém",
  "falar com alguem",
  "suporte humano",
  "atendimento humano",
  "não entendi",
  "nao entendi",
  "não ajudou",
  "nao ajudou",
  "operador",
  "funcionário",
  "funcionario",
  "gerente",
  "responsável",
  "responsavel",
  "reclamação",
  "reclamacao",
  "problema grave",
  "urgente",
];

/**
 * Verifica se a mensagem indica desejo de falar com atendente humano
 * @param {string} mensagem - Mensagem do usuário
 * @returns {boolean} Se deseja falar com humano
 */
function desejaFalarComHumano(mensagem) {
  const mensagemLower = mensagem.toLowerCase().trim();

  return PALAVRAS_ATENDENTE.some((palavra) =>
    mensagemLower.includes(palavra.toLowerCase())
  );
}

/**
 * Busca resposta no FAQ local (mais rápido e sem custo)
 * @param {string} pergunta - Pergunta do usuário
 * @returns {Promise<Object|null>} FAQ encontrado ou null
 */
async function buscarNoFAQ(pergunta) {
  try {
    const perguntaLower = pergunta.toLowerCase();
    const palavras = perguntaLower.split(/\s+/).filter((p) => p.length > 2);

    // Busca FAQs ativos
    const faqs = await db("chat_faq").where({ ativo: true }).select("*");

    let melhorMatch = null;
    let melhorScore = 0;

    for (const faq of faqs) {
      let score = 0;

      // Verifica palavras-chave
      if (faq.palavras_chave) {
        for (const palavra of faq.palavras_chave) {
          if (perguntaLower.includes(palavra.toLowerCase())) {
            score += 2;
          }
        }
      }

      // Verifica similaridade com a pergunta cadastrada
      const perguntaFaqLower = faq.pergunta.toLowerCase();
      for (const palavra of palavras) {
        if (perguntaFaqLower.includes(palavra)) {
          score += 1;
        }
      }

      if (score > melhorScore) {
        melhorScore = score;
        melhorMatch = faq;
      }
    }

    // Retorna se teve um match razoável (score >= 3)
    if (melhorScore >= 3 && melhorMatch) {
      // Incrementa contador de uso
      await db("chat_faq")
        .where({ id: melhorMatch.id })
        .increment("vezes_utilizado", 1);

      return {
        resposta: melhorMatch.resposta,
        fonte: "FAQ",
        confianca: Math.min(melhorScore / 10, 1),
        categoria: melhorMatch.categoria,
      };
    }

    return null;
  } catch (error) {
    console.error("❌ Erro ao buscar no FAQ:", error);
    return null;
  }
}

/**
 * Gera resposta usando API de IA externa (Grok/OpenAI)
 * @param {string} mensagem - Mensagem do usuário
 * @param {Array} historico - Histórico de mensagens da conversa
 * @returns {Promise<Object|null>} Resposta da IA ou null
 */
async function gerarRespostaIA(mensagem, historico = []) {
  // Se não tem API key configurada, retorna null
  if (!IA_CONFIG.GROK_API_KEY && !IA_CONFIG.OPENAI_API_KEY) {
    console.log("⚠️ Nenhuma API de IA configurada, usando apenas FAQ");
    return null;
  }

  try {
    const apiKey = IA_CONFIG.GROK_API_KEY || IA_CONFIG.OPENAI_API_KEY;
    const apiUrl = IA_CONFIG.GROK_API_KEY
      ? IA_CONFIG.GROK_API_URL
      : IA_CONFIG.OPENAI_API_URL;

    // Monta o contexto do sistema
    const systemPrompt = `Você é um assistente virtual de suporte do Sistema de Gestão de Visitantes.
Seu papel é ajudar usuários com dúvidas sobre o sistema.

Informações sobre o sistema:
- É um sistema web para controle de entrada e saída de visitantes
- Permite cadastrar visitantes, registrar entradas/saídas, criar agendamentos
- Possui histórico de visitas e relatórios
- Usuários podem ter diferentes níveis de permissão

Diretrizes:
- Seja educado, profissional e objetivo
- Responda em português do Brasil
- Se não souber a resposta, sugira falar com um atendente humano
- Não invente funcionalidades que não existem
- Mantenha respostas concisas (máximo 3 parágrafos)`;

    // Monta o histórico de mensagens
    const messages = [
      { role: "system", content: systemPrompt },
      ...historico.slice(-10).map((msg) => ({
        role: msg.origem === "USUARIO" ? "user" : "assistant",
        content: msg.mensagem,
      })),
      { role: "user", content: mensagem },
    ];

    // Faz a requisição para a API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IA_CONFIG.TIMEOUT);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: IA_CONFIG.MODEL,
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }

    const data = await response.json();
    const respostaIA = data.choices?.[0]?.message?.content;

    if (respostaIA) {
      return {
        resposta: respostaIA.trim(),
        fonte: "IA",
        confianca: 0.8,
        modelo: IA_CONFIG.MODEL,
      };
    }

    return null;
  } catch (error) {
    console.error("❌ Erro ao chamar API de IA:", error.message);
    return null;
  }
}

/**
 * Resposta padrão quando não consegue responder
 * @returns {Object} Resposta padrão
 */
function respostaPadrao() {
  const respostas = [
    "Desculpe, não consegui entender sua pergunta. Poderia reformular ou ser mais específico?",
    "Não encontrei uma resposta para sua dúvida. Posso ajudar com algo mais?",
    "Hmm, não tenho certeza sobre isso. Gostaria de falar com um atendente humano?",
  ];

  return {
    resposta: respostas[Math.floor(Math.random() * respostas.length)],
    fonte: "PADRAO",
    confianca: 0,
  };
}

/**
 * Resposta quando usuário quer falar com humano
 * @returns {Object} Resposta de transferência
 */
function respostaTransferencia() {
  return {
    resposta:
      "Entendi que você deseja falar com um atendente humano. Vou transferir você para nossa equipe de suporte. Por favor, aguarde um momento enquanto um atendente fica disponível.",
    fonte: "SISTEMA",
    confianca: 1,
    solicitouHumano: true,
  };
}

/**
 * Processa mensagem e gera resposta
 * @param {string} mensagem - Mensagem do usuário
 * @param {Array} historico - Histórico de mensagens
 * @returns {Promise<Object>} Resposta gerada
 */
async function processarMensagem(mensagem, historico = []) {
  console.log(`🤖 Processando mensagem: "${mensagem.substring(0, 50)}..."`);

  // 1. Verifica se quer falar com humano
  if (desejaFalarComHumano(mensagem)) {
    console.log("👤 Usuário solicitou atendente humano");
    return respostaTransferencia();
  }

  // 2. Tenta buscar no FAQ (mais rápido e gratuito)
  const respostaFAQ = await buscarNoFAQ(mensagem);
  if (respostaFAQ && respostaFAQ.confianca >= 0.3) {
    console.log(
      `📚 Resposta encontrada no FAQ (confiança: ${respostaFAQ.confianca})`
    );
    return respostaFAQ;
  }

  // 3. Tenta usar IA externa
  const respostaIA = await gerarRespostaIA(mensagem, historico);
  if (respostaIA) {
    console.log(`🧠 Resposta gerada pela IA (${respostaIA.modelo})`);
    return respostaIA;
  }

  // 4. Resposta padrão
  console.log("❓ Usando resposta padrão");
  return respostaPadrao();
}

/**
 * Lista FAQs cadastrados
 * @param {Object} [opcoes] - Opções de filtro
 * @param {string} [opcoes.categoria] - Filtrar por categoria
 * @param {boolean} [opcoes.apenasAtivos=true] - Apenas FAQs ativos
 * @returns {Promise<Array>} Lista de FAQs
 */
async function listarFAQs({ categoria, apenasAtivos = true } = {}) {
  let query = db("chat_faq").orderBy("vezes_utilizado", "desc");

  if (apenasAtivos) {
    query = query.where({ ativo: true });
  }

  if (categoria) {
    query = query.where({ categoria });
  }

  return query;
}

/**
 * Cria ou atualiza um FAQ
 * @param {Object} faq - Dados do FAQ
 * @returns {Promise<Object>} FAQ criado/atualizado
 */
async function salvarFAQ({
  id,
  pergunta,
  resposta,
  palavras_chave,
  categoria,
  ativo = true,
}) {
  if (id) {
    // Atualiza
    const [atualizado] = await db("chat_faq")
      .where({ id })
      .update({
        pergunta,
        resposta,
        palavras_chave,
        categoria,
        ativo,
        atualizado_em: db.fn.now(),
      })
      .returning("*");
    return atualizado;
  } else {
    // Cria
    const [criado] = await db("chat_faq")
      .insert({
        pergunta,
        resposta,
        palavras_chave,
        categoria,
        ativo,
      })
      .returning("*");
    return criado;
  }
}

/**
 * Remove um FAQ
 * @param {number} id - ID do FAQ
 * @returns {Promise<boolean>} Se foi removido
 */
async function removerFAQ(id) {
  const removido = await db("chat_faq").where({ id }).del();
  return removido > 0;
}

module.exports = {
  processarMensagem,
  desejaFalarComHumano,
  buscarNoFAQ,
  gerarRespostaIA,
  listarFAQs,
  salvarFAQ,
  removerFAQ,
};
