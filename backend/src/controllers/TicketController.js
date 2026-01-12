// controllers/TicketController.js
const connection = require("../database/connection");
const moment = require("moment-timezone");
const { getIo } = require("../socket");
const { getUsuarioId } = require("../utils/authHelper");
const {
  isAdmin: verificarAdmin,
  temPermissao,
} = require("../middleware/permissaoMiddleware");

module.exports = {
  async create(req, res) {
    const io = getIo(); // ✅ OBTER INSTÂNCIA DO SOCKET
    const usuario_id = getUsuarioId(req);
    const {
      funcionario,
      motivo,
      descricao,
      setorResponsavel,
      nomeUsuario,
      setorUsuario,
    } = req.body;

    if (
      !funcionario ||
      !motivo ||
      !descricao ||
      !setorResponsavel ||
      !nomeUsuario ||
      !setorUsuario
    ) {
      return res.status(400).json({
        error: "Todos os campos são obrigatórios",
        campos_faltantes: {
          funcionario: !funcionario,
          motivo: !motivo,
          descricao: !descricao,
          setorResponsavel: !setorResponsavel,
          nomeUsuario: !nomeUsuario,
          setorUsuario: !setorUsuario,
        },
      });
    }

    try {
      const data_criacao = moment()
        .tz("America/Sao_Paulo")
        .format("YYYY-MM-DD HH:mm:ss");

      const [ticket] = await connection("tickets")
        .insert({
          usuario_id,
          funcionario,
          motivo,
          descricao,
          setor_responsavel: setorResponsavel,
          nome_usuario: nomeUsuario,
          setor_usuario: setorUsuario,
          status: "Aberto",
          data_criacao,
        })
        .returning("id");

      // 🔥 EMITIR EVENTO PARA SALA GLOBAL
      io.to("global").emit("ticket:create", {
        id: ticket.id,
        usuario_id,
        funcionario,
        motivo,
        descricao,
        setor_responsavel: setorResponsavel,
        nome_usuario: nomeUsuario,
        setor_usuario: setorUsuario,
        status: "Aberto",
        data_criacao,
      });

      console.log("📡 Evento ticket:create emitido para sala GLOBAL");

      return res.status(201).json({
        id: ticket.id,
        message: "Ticket criado com sucesso",
        data: {
          funcionario,
          motivo,
          setorResponsavel,
          criadoPor: nomeUsuario,
          setorUsuario,
        },
      });
    } catch (err) {
      console.error("Erro ao criar ticket:", err);
      return res.status(500).json({
        error: "Erro ao criar o ticket",
        detalhes:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  async index(req, res) {
    const usuario_id = getUsuarioId(req);

    if (!usuario_id) {
      return res
        .status(401)
        .json({ error: "Authorization header é obrigatório" });
    }

    try {
      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .select("setor_id")
        .first();

      if (!usuario)
        return res.status(404).json({ error: "Usuário não encontrado" });

      const tickets = await connection("tickets")
        .select(
          "tickets.*",
          "usuarios.name as usuario_name",
          "usuarios.setor_id as usuario_setor_id"
        )
        .leftJoin("usuarios", "tickets.usuario_id", "usuarios.id")
        .orderBy("tickets.data_criacao", "desc");

      return res.json(tickets);
    } catch (err) {
      console.error("Erro ao buscar tickets:", err);
      return res.status(500).json({
        error: "Erro ao buscar tickets",
        detalhes:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  async update(req, res) {
    const io = getIo(); // ✅ OBTER INSTÂNCIA DO SOCKET
    const usuario_id = getUsuarioId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (isNaN(id))
      return res.status(400).json({ error: "ID do ticket deve ser numérico" });

    const statusValidos = ["Aberto", "Em andamento", "Resolvido"];
    if (!status || !statusValidos.includes(status)) {
      return res
        .status(400)
        .json({ error: "Status inválido", status_validos: statusValidos });
    }

    try {
      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .select("setor_id")
        .first();

      if (!usuario)
        return res.status(404).json({ error: "Usuário não encontrado" });

      const ticket = await connection("tickets").where("id", id).first();

      if (!ticket)
        return res.status(404).json({ error: "Ticket não encontrado" });

      // Verificar se é ADMIN via papéis
      const userIsAdmin = await verificarAdmin(usuario_id);

      // Verificar se tem papel de SEGURANCA
      const papeis = await connection("usuarios_papeis")
        .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
        .where("usuarios_papeis.usuario_id", usuario_id)
        .pluck("papeis.nome");

      const isSeguranca = Array.isArray(papeis) && papeis.includes("SEGURANÇA");

      if (!userIsAdmin && !isSeguranca) {
        return res.status(403).json({
          error:
            "Acesso permitido apenas para administradores ou setor de Segurança",
        });
      }

      const data_atualizacao = moment()
        .tz("America/Sao_Paulo")
        .format("YYYY-MM-DD HH:mm:ss");

      const updateData = {
        status,
        data_atualizacao,
        visualizado: true,
      };

      if (status === "Resolvido") {
        updateData.data_finalizacao = moment()
          .tz("America/Sao_Paulo")
          .format("YYYY-MM-DD HH:mm:ss");
      }

      await connection("tickets").where("id", id).update(updateData);

      // 🔥 EMITIR EVENTO PARA SALA GLOBAL
      io.to("global").emit("ticket:update", {
        id,
        status,
        data_atualizacao,
        visualizado: true,
        timestamp: new Date(),
      });

      console.log("📡 Evento ticket:update emitido para sala GLOBAL");

      return res.json({
        success: true,
        message: "Status atualizado com sucesso",
        ticket_id: id,
        novo_status: status,
      });
    } catch (err) {
      console.error("Erro ao atualizar ticket:", err);
      return res.status(500).json({
        error: "Erro interno ao atualizar ticket",
        detalhes:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  async show(req, res) {
    const io = getIo(); // ✅ OBTER INSTÂNCIA DO SOCKET
    const usuario_id = getUsuarioId(req);
    const { id } = req.params;

    try {
      const ticket = await connection("tickets")
        .where("tickets.id", id)
        .select(
          "tickets.*",
          "usuarios.name as usuario_name",
          "usuarios.setor_id as usuario_setor_id"
        )
        .leftJoin("usuarios", "tickets.usuario_id", "usuarios.id")
        .first();

      if (!ticket)
        return res.status(404).json({ error: "Ticket não encontrado" });

      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .first();

      // Verificar se é admin via papéis
      const papeis = await connection("usuarios_papeis")
        .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
        .where("usuarios_papeis.usuario_id", usuario_id)
        .pluck("papeis.nome");

      const isAdmin = Array.isArray(papeis) && papeis.includes("ADMIN");

      if (!isAdmin && ticket.usuario_id !== usuario_id) {
        return res.status(403).json({ error: "Acesso negado ao ticket" });
      }

      if (!ticket.visualizado) {
        const data_atualizacao = moment()
          .tz("America/Sao_Paulo")
          .format("YYYY-MM-DD HH:mm:ss");

        await connection("tickets")
          .where("id", id)
          .update({ visualizado: true, data_atualizacao });

        ticket.visualizado = true;

        // 🔥 EMITIR EVENTO QUANDO MARCAR COMO VISUALIZADO
        io.to("global").emit("ticket:viewed", {
          id,
          visualizado: true,
          timestamp: new Date(),
        });

        console.log("📡 Evento ticket:viewed emitido para sala GLOBAL");
      }

      return res.json(ticket);
    } catch (err) {
      console.error("Erro ao buscar ticket:", err);
      return res.status(500).json({
        error: "Erro ao buscar ticket",
        detalhes:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  async countUnseen(req, res) {
    const usuario_id = getUsuarioId(req);

    try {
      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .first();

      if (!usuario || usuario.setor_id !== 4) return res.json({ count: 0 });

      const count = await connection("tickets")
        .where({
          setor_responsavel: "Segurança",
          visualizado: false,
          status: "Aberto",
        })
        .count("id as total");

      return res.json({ count: count[0].total || 0 });
    } catch (err) {
      console.error("Erro ao contar tickets:", err);
      return res.status(500).json({ error: "Erro no servidor" });
    }
  },

  async markAllSeen(req, res) {
    const io = getIo(); // ✅ OBTER INSTÂNCIA DO SOCKET
    const usuario_id = getUsuarioId(req);

    try {
      await connection("tickets")
        .where({ setor_responsavel: "Segurança", visualizado: false })
        .update({ visualizado: true });

      // 🔥 EMITIR EVENTO QUANDO MARCAR TODOS COMO VISUALIZADOS
      io.to("global").emit("ticket:all_viewed", {
        timestamp: new Date(),
        setor: "Segurança",
      });

      console.log("📡 Evento ticket:all_viewed emitido para sala GLOBAL");

      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao atualizar tickets" });
    }
  },
};
