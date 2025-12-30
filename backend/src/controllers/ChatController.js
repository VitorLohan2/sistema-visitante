const connection = require("../database/connection");
const { getIo } = require("../socket");

// ✅ FUNÇÃO PARA OBTER DATA/HORA NO HORÁRIO DE BRASÍLIA
function getBrasiliaDateTime() {
  const now = new Date();
  const brasiliaTime = new Date(
    now.toLocaleString("en-US", {
      timeZone: "America/Sao_Paulo",
    })
  );
  return brasiliaTime.toISOString();
}

// ✅ Função auxiliar para extrair token
function getBearerToken(request) {
  const authHeader = request.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2) return null;

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return null;

  return token;
}

module.exports = {
  async listarConversas(req, res) {
    const usuario_id = getBearerToken(req);
    console.log("📋 Listando conversas para usuário:", usuario_id);

    try {
      if (!usuario_id) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      const usuario = await connection("ongs")
        .where("id", usuario_id)
        .select("type")
        .first();

      if (!usuario) {
        console.log("❌ Usuário não encontrado:", usuario_id);
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      let conversas;

      if (usuario.type === "ADM") {
        conversas = await connection("conversas_suporte")
          .select(
            "conversas_suporte.*",
            connection.raw(
              `(
              SELECT COUNT(*) 
              FROM mensagens_suporte 
              WHERE conversa_id = conversas_suporte.id 
              AND visualizada = false 
              AND remetente_id != ?
            ) as mensagens_nao_lidas`,
              [usuario_id]
            )
          )
          .orderBy("data_atualizacao", "desc");
      } else {
        conversas = await connection("conversas_suporte")
          .where("usuario_id", usuario_id)
          .select(
            "conversas_suporte.*",
            connection.raw(
              `(
              SELECT COUNT(*) 
              FROM mensagens_suporte 
              WHERE conversa_id = conversas_suporte.id 
              AND visualizada = false 
              AND remetente_id != ?
            ) as mensagens_nao_lidas`,
              [usuario_id]
            )
          )
          .orderBy("data_atualizacao", "desc");
      }

      console.log(`✅ ${conversas.length} conversas encontradas`);
      return res.json(conversas);
    } catch (error) {
      console.error("❌ Erro ao listar conversas:", error);
      return res.status(500).json({ error: "Erro ao listar conversas" });
    }
  },

  async criarConversa(req, res) {
    const io = getIo();
    const usuario_id = getBearerToken(req);
    const { assunto } = req.body;

    console.log("📝 Criando conversa:", { usuario_id, assunto });

    try {
      if (!usuario_id) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      const usuario = await connection("ongs")
        .where("id", usuario_id)
        .select("name", "type")
        .first();

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const conversaExistente = await connection("conversas_suporte")
        .where("usuario_id", usuario_id)
        .whereIn("status", ["aberto", "em_atendimento"])
        .first();

      if (conversaExistente) {
        return res.status(400).json({
          error: "Você já possui uma conversa aberta",
          conversa_id: conversaExistente.id,
        });
      }

      const brasiliaTime = getBrasiliaDateTime();

      const [novaConversa] = await connection("conversas_suporte")
        .insert({
          usuario_id,
          usuario_nome: usuario.name,
          assunto: assunto || "Suporte Técnico",
          status: "aberto",
          data_criacao: brasiliaTime,
          data_atualizacao: brasiliaTime,
        })
        .returning("*");

      console.log("✅ Nova conversa criada:", novaConversa.id);

      if (io) {
        io.to("global").emit("conversa:nova", novaConversa);
        console.log("🔔 Evento conversa:nova emitido para sala GLOBAL");
      }

      return res.status(201).json(novaConversa);
    } catch (error) {
      console.error("❌ Erro ao criar conversa:", error);
      return res.status(500).json({
        error: "Erro ao criar conversa",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ✅ ATUALIZADO: Marca como visualizada e emite evento socket
  async buscarMensagens(req, res) {
    const io = getIo();
    const usuario_id = getBearerToken(req);
    const { conversa_id } = req.params;

    console.log("💬 Buscando mensagens:", { usuario_id, conversa_id });

    try {
      if (!usuario_id) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      const conversa = await connection("conversas_suporte")
        .where("id", conversa_id)
        .first();

      if (!conversa) {
        return res.status(404).json({ error: "Conversa não encontrada" });
      }

      const usuario = await connection("ongs")
        .where("id", usuario_id)
        .select("type")
        .first();

      if (usuario.type !== "ADM" && conversa.usuario_id !== usuario_id) {
        return res
          .status(403)
          .json({ error: "Sem permissão para acessar esta conversa" });
      }

      const mensagens = await connection("mensagens_suporte")
        .where("conversa_id", conversa_id)
        .orderBy("data_envio", "asc");

      // ✅ Marcar como visualizada e contar quantas foram atualizadas
      const totalMarcadas = await connection("mensagens_suporte")
        .where("conversa_id", conversa_id)
        .where("remetente_id", "!=", usuario_id)
        .where("visualizada", false)
        .update({ visualizada: true });

      console.log(`✅ ${mensagens.length} mensagens encontradas`);
      console.log(`✅ ${totalMarcadas} mensagens marcadas como lidas`);

      // ✅ EMITIR EVENTO SOCKET PARA ATUALIZAR LISTA
      if (io && totalMarcadas > 0) {
        io.to("global").emit("mensagens:visualizadas", {
          conversa_id,
          usuario_id,
        });
        console.log("🔔 Evento mensagens:visualizadas emitido");
      }

      return res.json({
        conversa,
        mensagens,
      });
    } catch (error) {
      console.error("❌ Erro ao buscar mensagens:", error);
      return res.status(500).json({
        error: "Erro ao buscar mensagens",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  async enviarMensagem(req, res) {
    const io = getIo();
    const usuario_id = getBearerToken(req);
    const { conversa_id } = req.params;
    const { mensagem } = req.body;

    console.log("📤 Enviando mensagem:", { usuario_id, conversa_id });

    try {
      if (!usuario_id) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      if (!mensagem || mensagem.trim() === "") {
        return res.status(400).json({ error: "Mensagem não pode estar vazia" });
      }

      const conversa = await connection("conversas_suporte")
        .where("id", conversa_id)
        .first();

      if (!conversa) {
        return res.status(404).json({ error: "Conversa não encontrada" });
      }

      const remetente = await connection("ongs")
        .where("id", usuario_id)
        .select("name", "type")
        .first();

      if (!remetente) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      if (remetente.type !== "ADM" && conversa.usuario_id !== usuario_id) {
        return res
          .status(403)
          .json({ error: "Sem permissão para enviar mensagem nesta conversa" });
      }

      const brasiliaTime = getBrasiliaDateTime();

      const [novaMensagem] = await connection("mensagens_suporte")
        .insert({
          conversa_id,
          remetente_id: usuario_id,
          remetente_nome: remetente.name,
          remetente_tipo: remetente.type,
          mensagem: mensagem.trim(),
          data_envio: brasiliaTime,
        })
        .returning("*");

      const updateData = {
        data_atualizacao: brasiliaTime,
      };

      if (remetente.type === "ADM" && conversa.status === "aberto") {
        updateData.status = "em_atendimento";
        updateData.atendente_id = usuario_id;
        updateData.atendente_nome = remetente.name;
      }

      await connection("conversas_suporte")
        .where("id", conversa_id)
        .update(updateData);

      console.log("✅ Mensagem enviada:", novaMensagem.id);

      if (io) {
        io.to(`conversa:${conversa_id}`).emit("mensagem:nova", novaMensagem);
        io.to("global").emit("conversa:atualizada", { id: conversa_id });
        console.log("🔔 Eventos emitidos via Socket");
      }

      return res.status(201).json(novaMensagem);
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem:", error);
      return res.status(500).json({
        error: "Erro ao enviar mensagem",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  async atualizarStatus(req, res) {
    const io = getIo();
    const usuario_id = getBearerToken(req);
    const { conversa_id } = req.params;
    const { status } = req.body;

    console.log("🔄 Atualizando status:", { usuario_id, conversa_id, status });

    try {
      if (!usuario_id) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      const statusValidos = [
        "aberto",
        "em_atendimento",
        "resolvido",
        "fechado",
      ];
      if (!statusValidos.includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }

      const conversa = await connection("conversas_suporte")
        .where("id", conversa_id)
        .first();

      if (!conversa) {
        return res.status(404).json({ error: "Conversa não encontrada" });
      }

      const usuario = await connection("ongs")
        .where("id", usuario_id)
        .select("type", "name")
        .first();

      if (usuario.type !== "ADM" && conversa.usuario_id !== usuario_id) {
        return res.status(403).json({ error: "Sem permissão" });
      }

      const brasiliaTime = getBrasiliaDateTime();

      const updateData = {
        status,
        data_atualizacao: brasiliaTime,
      };

      if (status === "resolvido" || status === "fechado") {
        updateData.data_finalizacao = brasiliaTime;
        console.log(`✅ Conversa finalizada em: ${brasiliaTime}`);
      }

      await connection("conversas_suporte")
        .where("id", conversa_id)
        .update(updateData);

      console.log(
        `✅ Status da conversa ${conversa_id} atualizado para: ${status}`
      );

      if (io) {
        io.to(`conversa:${conversa_id}`).emit("conversa:atualizada", {
          id: conversa_id,
          status,
          data_atualizacao: brasiliaTime,
        });

        io.to("global").emit("conversa:atualizada", {
          id: conversa_id,
          status,
          data_atualizacao: brasiliaTime,
        });
        console.log("🔔 Evento conversa:atualizada emitido");
      }

      return res.json({ message: "Status atualizado com sucesso" });
    } catch (error) {
      console.error("❌ Erro ao atualizar status:", error);
      return res.status(500).json({
        error: "Erro ao atualizar status",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  async contarNaoLidas(req, res) {
    const usuario_id = getBearerToken(req);

    console.log("📊 Contando mensagens não lidas para:", usuario_id);

    try {
      if (!usuario_id) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      const usuario = await connection("ongs")
        .where("id", usuario_id)
        .select("type")
        .first();

      if (usuario.type !== "ADM") {
        return res.status(403).json({ error: "Apenas ADMs podem acessar" });
      }

      const resultado = await connection("mensagens_suporte")
        .where("visualizada", false)
        .where("remetente_tipo", "USER")
        .count("* as total")
        .first();

      const total = parseInt(resultado.total) || 0;
      console.log(`✅ Total de mensagens não lidas: ${total}`);

      return res.json({ total });
    } catch (error) {
      console.error("❌ Erro ao contar não lidas:", error);
      return res.status(500).json({
        error: "Erro ao contar mensagens",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ✅ ENDPOINT ADICIONAL (caso queira marcar manualmente)
  async marcarComoVisualizada(req, res) {
    const io = getIo();
    const usuario_id = getBearerToken(req);
    const { conversa_id } = req.params;

    if (!usuario_id) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    try {
      const totalAtualizadas = await connection("mensagens_suporte")
        .where("conversa_id", conversa_id)
        .where("remetente_id", "!=", usuario_id)
        .where("visualizada", false)
        .update({ visualizada: true });

      if (io && totalAtualizadas > 0) {
        io.to("global").emit("mensagens:visualizadas", {
          conversa_id,
          usuario_id,
        });
        console.log("🔔 Evento mensagens:visualizadas emitido");
      }

      return res.json({ success: true, totalAtualizadas });
    } catch (error) {
      console.error("❌ Erro ao marcar como visualizada:", error);
      return res.status(500).json({ error: "Erro ao marcar mensagens" });
    }
  },
  async buscarDetalhesConversa(req, res) {
    const usuario_id = getBearerToken(req);
    const { conversa_id } = req.params;

    console.log("🔍 Buscando detalhes da conversa:", conversa_id);

    try {
      if (!usuario_id) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      const usuario = await connection("ongs")
        .where("id", usuario_id)
        .select("type")
        .first();

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Buscar conversa com contador de mensagens não lidas
      const conversa = await connection("conversas_suporte")
        .where("id", conversa_id)
        .select(
          "conversas_suporte.*",
          connection.raw(
            `(
          SELECT COUNT(*) 
          FROM mensagens_suporte 
          WHERE conversa_id = conversas_suporte.id 
          AND visualizada = false 
          AND remetente_id != ?
        ) as mensagens_nao_lidas`,
            [usuario_id]
          )
        )
        .first();

      if (!conversa) {
        return res.status(404).json({ error: "Conversa não encontrada" });
      }

      // Verificar permissão
      if (usuario.type !== "ADM" && conversa.usuario_id !== usuario_id) {
        return res
          .status(403)
          .json({ error: "Sem permissão para acessar esta conversa" });
      }

      console.log("✅ Detalhes da conversa encontrados");
      return res.json(conversa);
    } catch (error) {
      console.error("❌ Erro ao buscar detalhes da conversa:", error);
      return res.status(500).json({
        error: "Erro ao buscar detalhes",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
  async listarEquipeOnline(req, res) {
    console.log("👥 Buscando equipe de TI online");

    try {
      const connection = require("../database/connection");
      const { getIo } = require("../socket");

      // Buscar todos os usuários do tipo ADM
      const equipeADM = await connection("ongs")
        .where("type", "ADM")
        .select("id", "name", "email")
        .orderBy("name", "asc");

      console.log(`✅ ${equipeADM.length} membros ADM encontrados no banco`);

      // Verificar quais estão online via socket
      const io = getIo();
      const onlineUsers = [];

      if (io && io.sockets && io.sockets.sockets) {
        // Percorrer todos os sockets conectados
        io.sockets.sockets.forEach((socket) => {
          if (socket.userId && socket.userType === "ADM") {
            // Verificar se já não foi adicionado (evitar duplicatas)
            if (!onlineUsers.find((u) => u.id === socket.userId)) {
              const userInfo = equipeADM.find((u) => u.id === socket.userId);
              if (userInfo) {
                onlineUsers.push({
                  id: userInfo.id,
                  nome: userInfo.name,
                  email: userInfo.email,
                });
              }
            }
          }
        });
      }

      console.log(`✅ ${onlineUsers.length} membros ADM online`);
      console.log(
        "📋 Membros online:",
        onlineUsers.map((u) => u.nome).join(", ") || "Nenhum"
      );

      return res.json(onlineUsers);
    } catch (error) {
      console.error("❌ Erro ao buscar equipe online:", error);
      return res.status(500).json({
        error: "Erro ao buscar equipe online",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
};
