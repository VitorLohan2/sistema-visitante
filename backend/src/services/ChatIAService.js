/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHAT IA SERVICE - MAX (Assistente Virtual Inteligente)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Serviço de integração com IA Groq para respostas automáticas no chat.
 * Max é o assistente virtual que ajuda usuários com dúvidas sobre o sistema.
 *
 * FUNCIONALIDADES:
 * - Conversa natural usando IA Groq (LLaMA 3)
 * - Utiliza FAQ como base de conhecimento
 * - Detecção de intenção de falar com humano
 * - Respostas contextualizadas sobre o sistema
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const db = require("../database/connection");

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DA API GROQ
// ═══════════════════════════════════════════════════════════════════════════

const GROQ_CONFIG = {
  API_KEY: process.env.GROQ_API_KEY || "",
  API_URL: "https://api.groq.com/openai/v1/chat/completions",
  // Modelos disponíveis: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768
  MODEL: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  // Timeout em ms
  TIMEOUT: 30000,
  // Temperatura (0 = mais preciso, 1 = mais criativo)
  TEMPERATURE: 0.7,
  // Máximo de tokens na resposta
  MAX_TOKENS: 1000,
};

// Nome do assistente virtual
const NOME_ASSISTENTE = "Max";

// ═══════════════════════════════════════════════════════════════════════════
// PALAVRAS-CHAVE PARA TRANSFERÊNCIA HUMANA
// ═══════════════════════════════════════════════════════════════════════════

const PALAVRAS_ATENDENTE = [
  "atendente",
  "humano",
  "pessoa",
  "falar com alguém",
  "falar com alguem",
  "suporte humano",
  "atendimento humano",
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
  "não está funcionando",
  "nao esta funcionando",
  "bug",
  "erro grave",
  "sistema travou",
  "não consigo acessar",
  "nao consigo acessar",
];

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica se a API do Groq está configurada
 * @returns {boolean} Se está configurada
 */
function isGroqConfigurado() {
  return Boolean(GROQ_CONFIG.API_KEY && GROQ_CONFIG.API_KEY.length > 0);
}

/**
 * Verifica se a mensagem indica desejo de falar com atendente humano
 * @param {string} mensagem - Mensagem do usuário
 * @returns {boolean} Se deseja falar com humano
 */
function desejaFalarComHumano(mensagem) {
  const mensagemLower = mensagem.toLowerCase().trim();

  return PALAVRAS_ATENDENTE.some((palavra) =>
    mensagemLower.includes(palavra.toLowerCase()),
  );
}

/**
 * Busca FAQs relevantes para contextualizar a IA
 * @param {string} pergunta - Pergunta do usuário
 * @returns {Promise<Array>} Lista de FAQs relevantes
 */
async function buscarFAQsRelevantes(pergunta) {
  try {
    const perguntaLower = pergunta.toLowerCase();
    const palavras = perguntaLower.split(/\s+/).filter((p) => p.length > 2);

    // Busca FAQs ativos
    const faqs = await db("chat_faq").where({ ativo: true }).select("*");

    // Calcula relevância de cada FAQ
    const faqsComScore = faqs.map((faq) => {
      let score = 0;

      // Verifica palavras-chave
      if (faq.palavras_chave) {
        for (const palavra of faq.palavras_chave) {
          if (perguntaLower.includes(palavra.toLowerCase())) {
            score += 3;
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

      return { ...faq, score };
    });

    // Retorna os mais relevantes (score > 0, máximo 5)
    return faqsComScore
      .filter((f) => f.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  } catch (error) {
    console.error("❌ Erro ao buscar FAQs relevantes:", error);
    return [];
  }
}

/**
 * Busca todos os FAQs para contexto geral
 * @returns {Promise<Array>} Lista de FAQs
 */
async function buscarTodosFAQs() {
  try {
    return await db("chat_faq")
      .where({ ativo: true })
      .select("pergunta", "resposta", "categoria")
      .orderBy("vezes_utilizado", "desc")
      .limit(15);
  } catch (error) {
    console.error("❌ Erro ao buscar FAQs:", error);
    return [];
  }
}

/**
 * Incrementa contador de uso do FAQ
 * @param {number} faqId - ID do FAQ
 */
async function incrementarUsoFAQ(faqId) {
  try {
    await db("chat_faq").where({ id: faqId }).increment("vezes_utilizado", 1);
  } catch (error) {
    console.error("❌ Erro ao incrementar uso do FAQ:", error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT DO SISTEMA (PERSONALIDADE DO MAX)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera o prompt do sistema para o Max
 * @param {Array} faqs - FAQs para contexto
 * @returns {string} Prompt do sistema
 */
function gerarPromptSistema(faqs = []) {
  let contextoFAQ = "";

  if (faqs.length > 0) {
    contextoFAQ = `
═══════════════════════════════════════════════════════════════
BASE DE CONHECIMENTO (FAQ DO SISTEMA):
═══════════════════════════════════════════════════════════════
${faqs.map((faq) => `📌 Categoria: ${faq.categoria || "Geral"}\nPergunta: ${faq.pergunta}\nResposta: ${faq.resposta}`).join("\n\n")}
═══════════════════════════════════════════════════════════════
`;
  }

  return `Você é o ${NOME_ASSISTENTE}, um assistente virtual inteligente e amigável do Sistema de Gestão de Visitantes.

═══════════════════════════════════════════════════════════════
SUA PERSONALIDADE:
═══════════════════════════════════════════════════════════════
- Você é educado, prestativo e profissional
- Sempre se apresenta como "${NOME_ASSISTENTE}" quando apropriado
- Usa emojis com moderação para ser mais amigável
- Responde sempre em português do Brasil
- É objetivo mas completo nas respostas
- Demonstra empatia quando o usuário tem problemas

═══════════════════════════════════════════════════════════════
SOBRE O SISTEMA:
═══════════════════════════════════════════════════════════════
O Sistema de Gestão de Visitantes é uma plataforma web completa para:
- Cadastro e controle de visitantes
- Registro de entrada e saída de visitas
- Criação de agendamentos de visitas
- Histórico completo de todas as visitas
- Geração de relatórios e dashboards
- Gestão de empresas e setores
- Controle de permissões de usuários
- Integração com portaria e segurança

═══════════════════════════════════════════════════════════════
DIRETRIZES:
═══════════════════════════════════════════════════════════════
1. Responda de forma clara e objetiva
2. Use as informações do FAQ quando disponíveis
3. Se não souber algo específico, seja honesto e sugira falar com um atendente
4. NUNCA invente funcionalidades que não existem
5. Mantenha respostas concisas (máximo 3-4 parágrafos)
6. Se o usuário parecer frustrado ou com problema grave, sugira falar com atendente humano
7. Pode usar formatação simples (negrito, listas) para clareza

═══════════════════════════════════════════════════════════════
COMO SE APRESENTAR (apenas quando apropriado):
═══════════════════════════════════════════════════════════════
- Na primeira interação ou quando perguntarem quem você é
- Exemplo: "Olá! 👋 Eu sou o ${NOME_ASSISTENTE}, seu assistente virtual. Estou aqui para ajudar com dúvidas sobre o Sistema de Gestão de Visitantes. Como posso ajudar você hoje?"

${contextoFAQ}

IMPORTANTE: Se o usuário pedir para falar com um atendente humano ou se você não conseguir resolver o problema, responda de forma empática e indique que vai transferir para um atendente.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRAÇÃO COM API GROQ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Chama a API do Groq para gerar resposta
 * @param {string} mensagem - Mensagem do usuário
 * @param {Array} historico - Histórico de mensagens
 * @param {Array} faqs - FAQs para contexto
 * @returns {Promise<Object|null>} Resposta da IA ou null
 */
async function chamarGroq(mensagem, historico = [], faqs = []) {
  if (!isGroqConfigurado()) {
    console.log("⚠️ API Groq não configurada (GROQ_API_KEY ausente)");
    return null;
  }

  try {
    // Monta as mensagens para a API
    const messages = [
      { role: "system", content: gerarPromptSistema(faqs) },
      // Últimas 10 mensagens do histórico
      ...historico.slice(-10).map((msg) => ({
        role: msg.origem === "USUARIO" ? "user" : "assistant",
        content: msg.mensagem,
      })),
      { role: "user", content: mensagem },
    ];

    console.log(`🤖 [${NOME_ASSISTENTE}] Chamando API Groq...`);

    // Faz a requisição com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GROQ_CONFIG.TIMEOUT);

    const response = await fetch(GROQ_CONFIG.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_CONFIG.API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_CONFIG.MODEL,
        messages,
        max_tokens: GROQ_CONFIG.MAX_TOKENS,
        temperature: GROQ_CONFIG.TEMPERATURE,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `API Groq retornou status ${response.status}: ${errorBody}`,
      );
    }

    const data = await response.json();
    const respostaIA = data.choices?.[0]?.message?.content;

    if (respostaIA) {
      console.log(`✅ [${NOME_ASSISTENTE}] Resposta gerada com sucesso`);
      return {
        resposta: respostaIA.trim(),
        fonte: "IA",
        confianca: 0.9,
        modelo: GROQ_CONFIG.MODEL,
      };
    }

    return null;
  } catch (error) {
    if (error.name === "AbortError") {
      console.error(`❌ [${NOME_ASSISTENTE}] Timeout na API Groq`);
    } else {
      console.error(`❌ [${NOME_ASSISTENTE}] Erro na API Groq:`, error.message);
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESPOSTAS FALLBACK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Busca resposta direta no FAQ (fallback quando IA não está disponível)
 * @param {string} pergunta - Pergunta do usuário
 * @returns {Promise<Object|null>} Resposta do FAQ ou null
 */
async function buscarRespostaFAQ(pergunta) {
  const faqsRelevantes = await buscarFAQsRelevantes(pergunta);

  if (faqsRelevantes.length > 0 && faqsRelevantes[0].score >= 3) {
    const faq = faqsRelevantes[0];
    await incrementarUsoFAQ(faq.id);

    return {
      resposta: `${faq.resposta}\n\n💡 Se precisar de mais ajuda, é só perguntar ou solicitar um atendente humano!`,
      fonte: "FAQ",
      confianca: Math.min(faq.score / 10, 0.8),
      categoria: faq.categoria,
    };
  }

  return null;
}

/**
 * Resposta de boas-vindas do Max
 * @param {string} nomeUsuario - Nome do usuário (opcional)
 * @returns {Object} Resposta de boas-vindas
 */
function respostaBoasVindas(nomeUsuario = "") {
  const saudacao = nomeUsuario ? `Olá, ${nomeUsuario}! 👋` : "Olá! 👋";

  return {
    resposta: `${saudacao} Eu sou o ${NOME_ASSISTENTE}, seu assistente virtual do Sistema de Gestão de Visitantes.

Estou aqui para ajudar você com dúvidas sobre:
• 📝 Cadastro de visitantes
• 🚪 Registro de entrada e saída
• 📅 Agendamentos
• 📊 Relatórios e histórico
• ⚙️ Configurações do sistema

Como posso ajudar você hoje? Fique à vontade para fazer sua pergunta!

Se preferir falar com um atendente humano, é só me avisar. 😊`,
    fonte: "SISTEMA",
    confianca: 1,
  };
}

/**
 * Resposta padrão quando não consegue responder
 * @returns {Object} Resposta padrão
 */
function respostaPadrao() {
  return {
    resposta: `Hmm, não consegui encontrar uma resposta específica para sua dúvida. 🤔

Posso tentar ajudar de outra forma:
• Reformule sua pergunta de maneira diferente
• Pergunte sobre uma funcionalidade específica do sistema
• Ou, se preferir, posso transferir você para um atendente humano

O que você prefere?`,
    fonte: "PADRAO",
    confianca: 0.3,
  };
}

/**
 * Resposta quando usuário quer falar com humano
 * @returns {Object} Resposta de transferência
 */
function respostaTransferencia() {
  return {
    resposta: `Entendi! Vou transferir você para um atendente humano agora. 👨‍💼

Por favor, aguarde um momento enquanto um de nossos atendentes fica disponível. Você será atendido por ordem de chegada.

Enquanto isso, fique à vontade para descrever seu problema ou dúvida aqui, assim o atendente já terá o contexto quando assumir a conversa. 😊`,
    fonte: "SISTEMA",
    confianca: 1,
    solicitouHumano: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL DE PROCESSAMENTO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Processa mensagem e gera resposta do Max
 * @param {string} mensagem - Mensagem do usuário
 * @param {Array} historico - Histórico de mensagens
 * @param {Object} opcoes - Opções adicionais
 * @param {boolean} opcoes.primeiraInteracao - Se é a primeira mensagem da conversa
 * @returns {Promise<Object>} Resposta gerada
 */
async function processarMensagem(mensagem, historico = [], opcoes = {}) {
  console.log(
    `🤖 [${NOME_ASSISTENTE}] Processando: "${mensagem.substring(0, 50)}..."`,
  );

  // 1. Verifica se é primeira interação (saudação)
  if (opcoes.primeiraInteracao || historico.length === 0) {
    // Se a mensagem for só saudação, responde com boas-vindas
    const saudacoes = [
      "oi",
      "olá",
      "ola",
      "hey",
      "e aí",
      "e ai",
      "bom dia",
      "boa tarde",
      "boa noite",
      "hello",
      "hi",
    ];
    const mensagemLower = mensagem.toLowerCase().trim();

    if (
      saudacoes.some(
        (s) =>
          mensagemLower === s ||
          mensagemLower.startsWith(s + " ") ||
          mensagemLower.startsWith(s + ","),
      )
    ) {
      return respostaBoasVindas();
    }
  }

  // 2. Verifica se quer falar com humano
  if (desejaFalarComHumano(mensagem)) {
    console.log(`👤 [${NOME_ASSISTENTE}] Usuário solicitou atendente humano`);
    return respostaTransferencia();
  }

  // 3. Busca FAQs relevantes para dar contexto à IA
  const faqsRelevantes = await buscarFAQsRelevantes(mensagem);
  const todosFAQs = await buscarTodosFAQs();

  // Combina FAQs relevantes com FAQs gerais para contexto
  const faqsParaContexto = [
    ...faqsRelevantes,
    ...todosFAQs.filter((f) => !faqsRelevantes.find((r) => r.id === f.id)),
  ].slice(0, 10);

  // 4. Tenta usar IA Groq
  if (isGroqConfigurado()) {
    const respostaIA = await chamarGroq(mensagem, historico, faqsParaContexto);

    if (respostaIA) {
      // Se usou um FAQ específico, incrementa o contador
      if (faqsRelevantes.length > 0 && faqsRelevantes[0].score >= 3) {
        await incrementarUsoFAQ(faqsRelevantes[0].id);
      }

      return respostaIA;
    }
  }

  // 5. Fallback: Tenta buscar resposta direta no FAQ
  console.log(
    `⚠️ [${NOME_ASSISTENTE}] IA não disponível, usando FAQ como fallback`,
  );
  const respostaFAQ = await buscarRespostaFAQ(mensagem);

  if (respostaFAQ) {
    console.log(`📚 [${NOME_ASSISTENTE}] Resposta encontrada no FAQ`);
    return respostaFAQ;
  }

  // 6. Resposta padrão
  console.log(`❓ [${NOME_ASSISTENTE}] Usando resposta padrão`);
  return respostaPadrao();
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE GESTÃO DE FAQ (mantidas para compatibilidade)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lista FAQs cadastrados
 * @param {Object} opcoes - Opções de filtro
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

/**
 * Retorna informações sobre o assistente
 * @returns {Object} Informações do assistente
 */
function getInfoAssistente() {
  return {
    nome: NOME_ASSISTENTE,
    modelo: GROQ_CONFIG.MODEL,
    iaConfigurada: isGroqConfigurado(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Função principal
  processarMensagem,

  // Funções auxiliares
  desejaFalarComHumano,
  isGroqConfigurado,
  getInfoAssistente,

  // Respostas especiais
  respostaBoasVindas,
  respostaTransferencia,

  // Gestão de FAQ
  listarFAQs,
  salvarFAQ,
  removerFAQ,

  // Para testes
  buscarFAQsRelevantes,
  chamarGroq,
};
