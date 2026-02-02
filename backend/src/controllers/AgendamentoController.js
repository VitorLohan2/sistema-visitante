// controllers/AgendamentoController.js
const connection = require("../database/connection");
const { getIo } = require("../socket");
const { getUsuarioId } = require("../utils/authHelper");
const { temPermissao } = require("../middleware/permissaoMiddleware");

module.exports = {
  async create(request, response) {
    const io = getIo();
    const {
      nome,
      cpf,
      setor_id,
      setor,
      horario_agendado,
      observacao,
      criado_por,
    } = request.body;

    const usuario_id = getUsuarioId(request);

    try {
      console.log("=== DEBUG CRIAR AGENDAMENTO ===");
      console.log("Horário recebido:", horario_agendado);
      console.log("usuario_id do token:", usuario_id);
      console.log("Arquivo recebido:", request.file);

      if (request.file) {
        console.log("Detalhes do arquivo:", {
          originalname: request.file.originalname,
          mimetype: request.file.mimetype,
          size: request.file.size,
          path: request.file.path || "SEM PATH",
        });
      }

      if (!usuario_id) {
        return response.status(401).json({
          error: "Authorization header é obrigatório",
        });
      }

      // Buscar usuario
      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .first();

      if (!usuario) {
        return response.status(404).json({
          error: "usuario não encontrada",
          id_enviado: usuario_id,
        });
      }

      // Validações
      if (!nome || nome.trim() === "") {
        return response.status(400).json({ error: "Nome é obrigatório." });
      }

      if (!cpf || cpf.replace(/\D/g, "").length !== 11) {
        return response.status(400).json({
          error: "CPF deve ter 11 dígitos.",
        });
      }

      if (!setor_id) {
        return response.status(400).json({ error: "Setor é obrigatório." });
      }

      if (!horario_agendado) {
        return response.status(400).json({
          error: "Horário agendado é obrigatório.",
        });
      }

      // Converter para horário de Brasília
      const dataLocal = new Date(horario_agendado);
      const offsetBrasilia = -3;
      const dataBrasilia = new Date(
        dataLocal.getTime() + offsetBrasilia * 60 * 60 * 1000,
      );
      const horarioAjustado = dataBrasilia.toISOString();

      // Verificar se é futuro
      const agora = new Date();
      if (dataLocal <= agora) {
        return response.status(400).json({
          error: "O horário agendado deve ser no futuro.",
        });
      }

      // ✅ PEGAR URL DO CLOUDINARY (já foi enviado pelo multer-storage-cloudinary)
      let foto_colaborador = null;

      if (request.file && request.file.path) {
        foto_colaborador = request.file.path;
        console.log("✅ Foto do Cloudinary (via multer):", foto_colaborador);
      }

      // Salvar no banco
      const [agendamento] = await connection("agendamentos")
        .insert({
          nome: nome.trim(),
          cpf: cpf.replace(/\D/g, ""),
          setor_id,
          setor,
          horario_agendado: horarioAjustado,
          observacao: observacao ? observacao.trim() : null,
          criado_por,
          usuario_id,
          foto_colaborador,
        })
        .returning("*");

      console.log("✅ Agendamento cadastrado no banco:", agendamento.id);

      // Socket.IO
      const eventData = {
        id: agendamento.id,
        nome: agendamento.nome,
        cpf: agendamento.cpf,
        setor_id: agendamento.setor_id,
        setor: agendamento.setor,
        horario_agendado: agendamento.horario_agendado,
        observacao: agendamento.observacao,
        criado_por: agendamento.criado_por,
        criado_em: agendamento.criado_em || new Date().toISOString(),
        foto_colaborador: agendamento.foto_colaborador,
        confirmado: agendamento.confirmado || false,
        presente: agendamento.presente || false,
        usuario_id: agendamento.usuario_id,
        timestamp: new Date(),
      };

      io.to("global").emit("agendamento:create", eventData);
      console.log("📡 Evento agendamento:create emitido:", eventData);

      return response.json({
        id: agendamento.id,
        message: "Agendamento criado com sucesso!",
        foto_colaborador,
      });
    } catch (error) {
      console.error("❌ Erro ao criar agendamento:", error);
      return response.status(500).json({
        error: "Erro interno ao criar agendamento",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  async index(request, response) {
    try {
      const agendamentos = await connection("agendamentos")
        .select("*")
        .orderBy("horario_agendado", "desc");

      return response.json(agendamentos);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      return response
        .status(500)
        .json({ error: "Erro ao buscar agendamentos." });
    }
  },

  async show(request, response) {
    const { id } = request.params;

    try {
      const agendamento = await connection("agendamentos")
        .where("id", id)
        .first();

      if (!agendamento) {
        return response
          .status(404)
          .json({ error: "Agendamento não encontrado" });
      }

      return response.json(agendamento);
    } catch (error) {
      console.error("Erro ao buscar agendamento:", error);
      return response
        .status(500)
        .json({ error: "Erro ao buscar agendamento." });
    }
  },

  async confirmar(request, response) {
    const io = getIo();
    const { id } = request.params;
    const usuario_id = getUsuarioId(request);

    try {
      console.log("=== DEBUG CONFIRMAR AGENDAMENTO ===");
      console.log("Agendamento ID:", id);
      console.log("usuario ID:", usuario_id);

      if (!usuario_id) {
        return response
          .status(401)
          .json({ error: "Authorization header é obrigatório" });
      }

      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .first();

      if (!usuario) {
        return response.status(404).json({ error: "usuario não encontrada" });
      }

      // Verificar permissão via RBAC - qualquer papel com agendamento_editar pode confirmar
      const podeConfirmar = await temPermissao(
        usuario_id,
        "agendamento_editar",
      );

      if (!podeConfirmar) {
        return response.status(403).json({
          error:
            "Sem permissão para confirmar agendamentos. Necessário: agendamento_editar",
        });
      }

      const agendamento = await connection("agendamentos")
        .where("id", id)
        .first();

      if (!agendamento) {
        return response
          .status(404)
          .json({ error: "Agendamento não encontrado" });
      }

      if (agendamento.confirmado) {
        return response
          .status(400)
          .json({ error: "Agendamento já confirmado" });
      }

      const [agendamentoAtualizado] = await connection("agendamentos")
        .where("id", id)
        .update({
          confirmado: true,
          confirmado_em: new Date().toISOString(),
          confirmado_por: usuario.nome,
        })
        .returning("*");

      console.log("✅ Agendamento confirmado por:", usuario.nome);

      io.to("global").emit("agendamento:update", agendamentoAtualizado);
      console.log("📡 Evento agendamento:update emitido (confirmação)");

      return response.json({
        message: "Agendamento confirmado com sucesso!",
        agendamento: agendamentoAtualizado,
      });
    } catch (error) {
      console.error("Erro ao confirmar agendamento:", error);
      return response
        .status(500)
        .json({ error: "Erro ao confirmar agendamento" });
    }
  },

  async delete(request, response) {
    const io = getIo();
    const { id } = request.params;
    const usuario_id = getUsuarioId(request);

    try {
      if (!usuario_id) {
        return response
          .status(401)
          .json({ error: "Authorization header é obrigatório" });
      }

      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .first();

      if (!usuario) {
        return response.status(404).json({ error: "usuario não encontrada" });
      }

      const agendamento = await connection("agendamentos")
        .where("id", id)
        .first();

      if (!agendamento) {
        return response
          .status(404)
          .json({ error: "Agendamento não encontrado" });
      }

      // Verificar permissão via RBAC - qualquer papel com agendamento_deletar pode excluir
      const podeExcluir = await temPermissao(usuario_id, "agendamento_deletar");

      // Usuário pode excluir seus próprios agendamentos OU ter permissão agendamento_deletar
      const autorizado = podeExcluir || agendamento.usuario_id === usuario_id;

      if (!autorizado) {
        return response.status(403).json({
          error:
            "Sem permissão para excluir este agendamento. Necessário: agendamento_deletar",
        });
      }

      await connection("agendamentos").where("id", id).delete();

      console.log("✅ Agendamento excluído do banco:", id);

      io.to("global").emit("agendamento:delete", { id });
      console.log("📡 Evento agendamento:delete emitido");

      return response.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      return response
        .status(500)
        .json({ error: "Erro ao excluir agendamento" });
    }
  },

  async presenca(request, response) {
    const io = getIo();
    const { id } = request.params;
    const usuario_id = getUsuarioId(request);

    try {
      if (!usuario_id) {
        return response
          .status(401)
          .json({ error: "Authorization header é obrigatório" });
      }

      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .first();

      if (!usuario) {
        return response.status(404).json({ error: "PERFIL não encontrada" });
      }

      // Verificar permissão via RBAC - qualquer papel com agendamento_editar pode registrar presença
      const podeRegistrarPresenca = await temPermissao(
        usuario_id,
        "agendamento_editar",
      );

      if (!podeRegistrarPresenca) {
        return response.status(403).json({
          error:
            "Sem permissão para registrar presença. Necessário: agendamento_editar",
        });
      }

      const agendamento = await connection("agendamentos")
        .where("id", id)
        .first();

      if (!agendamento) {
        return response
          .status(404)
          .json({ error: "Agendamento não encontrado" });
      }

      if (!agendamento.confirmado) {
        return response.status(400).json({
          error:
            "Não é possível registrar presença sem confirmar o agendamento primeiro",
        });
      }

      if (agendamento.presente) {
        return response.status(400).json({ error: "Presença já registrada" });
      }

      const [agendamentoAtualizado] = await connection("agendamentos")
        .where("id", id)
        .update({
          presente: true,
          presente_em: new Date().toISOString(),
          presente_por: usuario.nome,
        })
        .returning("*");

      console.log("✅ Presença registrada por:", usuario.nome);

      io.to("global").emit("agendamento:update", agendamentoAtualizado);
      console.log("📡 Evento agendamento:update emitido (presença)");

      return response.json({
        message: "Presença registrada com sucesso!",
        agendamento: agendamentoAtualizado,
      });
    } catch (error) {
      console.error("Erro ao registrar presença:", error);
      return response.status(500).json({ error: "Erro ao registrar presença" });
    }
  },

  async relatorioPresencas(request, response) {
    try {
      const { data } = request.query;

      let query = connection("agendamentos")
        .where("presente", true)
        .orderBy("presente_em", "desc");

      if (data) {
        query = query.whereRaw("DATE(presente_em) = ?", [data]);
      }

      const presentes = await query;
      return response.json(presentes);
    } catch (error) {
      console.error("Erro ao gerar relatório de presenças:", error);
      return response.status(500).json({ error: "Erro ao gerar relatório" });
    }
  },
};
