const connection = require("../database/connection");
const { getIo } = require("../socket");
const { getUsuarioId } = require("../utils/authHelper");
const {
  isAdmin: verificarAdmin,
  temPermissao,
} = require("../middleware/permissaoMiddleware");

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

// ✅ Função auxiliar para verificar se é ADM de TI (agora usa RBAC)
async function isAdmTI(usuario_id) {
  const usuario = await connection("usuarios")
    .where("id", usuario_id)
    .select("setor_id")
    .first();

  if (!usuario) return false;

  const userIsAdmin = await verificarAdmin(usuario_id);
  return userIsAdmin && usuario.setor_id === 7;
}

module.exports = {
  async listarConversas(req, res) {
    const usuario_id = getUsuarioId(req);
    console.log("📋 Listando conversas para usuário:", usuario_id);

    try {
      if (!usuario_id) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .select("setor_id")
        .first();

      if (!usuario) {
        console.log("❌ Usuário não encontrado:", usuario_id);
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      let conversas;

      // ✅ Apenas ADMIN do setor TI (setor_id = 7) pode ver todas as conversas
      const userIsAdmTI = await isAdmTI(usuario_id);
      if (userIsAdmTI) {
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
        // Usuários comuns veem apenas suas próprias conversas
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
    const usuario_id = getUsuarioId(req);
    const { assunto } = req.body;

    console.log("📝 Criando conversa:", { usuario_id, assunto });

    try {
      if (!usuario_id) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .select("nome", "setor_id")
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
          usuario_nome: usuario.nome,
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

  async buscarMensagens(req, res) {
    const io = getIo();
    const usuario_id = getUsuarioId(req);
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

      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .select("setor_id")
        .first();

      // ✅ Verifica se é ADM de TI ou dono da conversa
      const userIsAdmTI = await isAdmTI(usuario_id);
      if (!userIsAdmTI && conversa.usuario_id !== usuario_id) {
        return res
          .status(403)
          .json({ error: "Sem permissão para acessar esta conversa" });
      }

      const mensagens = await connection("mensagens_suporte")
        .where("conversa_id", conversa_id)
        .orderBy("data_envio", "asc");

      // ✅ Marcar como visualizada
      const totalMarcadas = await connection("mensagens_suporte")
        .where("conversa_id", conversa_id)
        .where("remetente_id", "!=", usuario_id)
        .where("visualizada", false)
        .update({ visualizada: true });

      console.log(`✅ ${mensagens.length} mensagens encontradas`);
      console.log(`✅ ${totalMarcadas} mensagens marcadas como lidas`);

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
    const usuario_id = getUsuarioId(req);
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

      const remetente = await connection("usuarios")
        .where("id", usuario_id)
        .select("nome", "setor_id")
        .first();

      if (!remetente) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // ✅ Verifica se é ADM de TI ou dono da conversa
      const userIsAdmTI = await isAdmTI(usuario_id);

      if (!userIsAdmTI && conversa.usuario_id !== usuario_id) {
        return res
          .status(403)
          .json({ error: "Sem permissão para enviar mensagem nesta conversa" });
      }

      const brasiliaTime = getBrasiliaDateTime();

      const [novaMensagem] = await connection("mensagens_suporte")
        .insert({
          conversa_id,
          remetente_id: usuario_id,
          remetente_nome: remetente.nome,
          remetente_tipo: userIsAdmTI ? "ADM" : "USER",
          mensagem: mensagem.trim(),
          data_envio: brasiliaTime,
        })
        .returning("*");

      const updateData = {
        data_atualizacao: brasiliaTime,
      };

      if (isAdmTI && conversa.status === "aberto") {
        updateData.status = "em_atendimento";
        updateData.atendente_id = usuario_id;
        updateData.atendente_nome = remetente.nome;
      }

      await connection("conversas_suporte")
        .where("id", conversa_id)
        .update(updateData);

      console.log("✅ Mensagem enviada:", novaMensagem.id);

      if (io) {
        // Emitir nova mensagem
        io.to(`conversa:${conversa_id}`).emit("mensagem:nova", novaMensagem);

        // ✅ CORRIGIDO: Emitir evento com TODOS os dados da atualização
        const eventoAtualizacao = {
          id: parseInt(conversa_id),
          status: updateData.status || conversa.status,
          data_atualizacao: brasiliaTime,
          atendente_id: updateData.atendente_id,
          atendente_nome: updateData.atendente_nome,
        };

        io.to(`conversa:${conversa_id}`).emit(
          "conversa:atualizada",
          eventoAtualizacao
        );
        io.to("global").emit("conversa:atualizada", eventoAtualizacao);

        console.log(
          "🔔 Eventos emitidos via Socket com dados:",
          eventoAtualizacao
        );
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
    const usuario_id = getUsuarioId(req);
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

      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .select("nome", "setor_id")
        .first();

      // ✅ Verifica se é ADM de TI ou dono da conversa
      const userIsAdmTI = await isAdmTI(usuario_id);
      if (!userIsAdmTI && conversa.usuario_id !== usuario_id) {
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
    const usuario_id = getUsuarioId(req);

    console.log("📊 Contando mensagens não lidas para:", usuario_id);

    try {
      if (!usuario_id) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      // ✅ Verifica se é ADM de TI
      const isAdmTIUser = await isAdmTI(usuario_id);

      if (!isAdmTIUser) {
        return res
          .status(403)
          .json({ error: "Apenas ADMs de TI podem acessar" });
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

  async marcarComoVisualizada(req, res) {
    const io = getIo();
    const usuario_id = getUsuarioId(req);
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
    const usuario_id = getUsuarioId(req);
    const { conversa_id } = req.params;

    console.log("🔍 Buscando detalhes da conversa:", conversa_id);

    try {
      if (!usuario_id) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .select("setor_id")
        .first();

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

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

      // ✅ Verifica permissão
      const userIsAdmTI = await isAdmTI(usuario_id);
      if (!userIsAdmTI && conversa.usuario_id !== usuario_id) {
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

      // ✅ Buscar apenas usuários ADMIN do setor TI (setor_id = 7) via papéis
      const equipeADM = await connection("usuarios")
        .join("usuarios_papeis", "usuarios.id", "usuarios_papeis.usuario_id")
        .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
        .where("papeis.nome", "ADMIN")
        .where("usuarios.setor_id", 7)
        .select("usuarios.id", "usuarios.nome", "usuarios.email")
        .orderBy("usuarios.nome", "asc");

      console.log(
        `✅ ${equipeADM.length} membros ADM de TI encontrados no banco`
      );

      // Verificar quais estão online via socket
      const io = getIo();
      const onlineUsers = [];

      if (io && io.sockets && io.sockets.sockets) {
        io.sockets.sockets.forEach((socket) => {
          // ✅ VERIFICA TIPO E SETOR_ID
          if (
            socket.userId &&
            socket.userType === "ADM" &&
            socket.setorId === 7
          ) {
            // Verificar se o usuário pertence ao setor TI
            const userInfo = equipeADM.find((u) => u.id === socket.userId);
            if (userInfo && !onlineUsers.find((u) => u.id === socket.userId)) {
              onlineUsers.push({
                id: userInfo.id,
                nome: userInfo.nome,
                email: userInfo.email,
              });
            }
          }
        });
      }

      console.log(`✅ ${onlineUsers.length} membros ADM de TI online`);
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
