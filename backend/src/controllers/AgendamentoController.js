// controllers/AgendamentoController.js
const connection = require("../database/connection");
const { getIo } = require("../socket"); // ✅ IMPORTAR getIo

// ✅ Helper para extrair token do Bearer (igual ao seu outro controller)
function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    return parts[1]; // retorna só o ID
  }
  return authHeader; // Se não tem Bearer, retorna como está
}

// ✅ Função para converter para horário de Brasília
function converterParaBrasilia(dataUTC) {
  const data = new Date(dataUTC);
  // Brasília é UTC-3 (horário padrão) ou UTC-2 (horário de verão)
  // Vamos usar UTC-3 como padrão
  data.setHours(data.getHours() - 3);
  return data.toISOString();
}

module.exports = {
  async create(request, response) {
    const io = getIo(); // ✅ OBTER INSTÂNCIA DO SOCKET.IO
    const {
      nome,
      cpf,
      setor_id,
      setor,
      horario_agendado,
      observacao,
      criado_por,
    } = request.body;

    const ong_id = getBearerToken(request);

    try {
      console.log("=== DEBUG CRIAR AGENDAMENTO ===");
      console.log("Horário recebido do frontend:", horario_agendado);
      console.log("Authorization header:", ong_id);
      console.log("Arquivo recebido:", request.file);

      if (!ong_id) {
        return response
          .status(401)
          .json({ error: "Authorization header é obrigatório" });
      }

      // Buscar ONG primeiro
      const ong = await connection("ongs").where("id", ong_id).first();

      if (!ong) {
        return response
          .status(404)
          .json({ error: "ONG não encontrada", id_enviado: ong_id });
      }

      // Validações dos dados
      if (!nome || nome.trim() === "") {
        return response.status(400).json({ error: "Nome é obrigatório." });
      }

      if (!cpf || cpf.replace(/\D/g, "").length !== 11) {
        return response.status(400).json({ error: "CPF deve ter 11 dígitos." });
      }

      if (!setor_id) {
        return response.status(400).json({ error: "Setor é obrigatório." });
      }

      if (!horario_agendado) {
        return response
          .status(400)
          .json({ error: "Horário agendado é obrigatório." });
      }

      // Converter para horário de Brasília (UTC-3)
      const dataLocal = new Date(horario_agendado);
      const offsetBrasilia = -3;
      const dataBrasilia = new Date(
        dataLocal.getTime() + offsetBrasilia * 60 * 60 * 1000
      );
      const horarioAjustado = dataBrasilia.toISOString();

      // Verificar se o horário é no futuro
      const agora = new Date();
      if (dataLocal <= agora) {
        return response
          .status(400)
          .json({ error: "O horário agendado deve ser no futuro." });
      }

      // 🔹 Captura da imagem (se enviada)
      const foto_colaborador = request.file ? request.file.path : null;

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
          ong_id,
          foto_colaborador,
        })
        .returning("*"); // ✅ RETORNAR TODOS OS DADOS

      console.log("✅ Agendamento cadastrado no banco:", agendamento.id);

      // ✅ EMITIR EVENTO SOCKET.IO - NOVO AGENDAMENTO
      const eventData = {
        id: agendamento.id,
        nome: agendamento.nome,
        cpf: agendamento.cpf,
        setor_id: agendamento.setor_id,
        setor: agendamento.setor,
        horario_agendado: agendamento.horario_agendado,
        observacao: agendamento.observacao,
        criado_por: agendamento.criado_por,
        foto_colaborador: agendamento.foto_colaborador,
        confirmado: agendamento.confirmado || false,
        presente: agendamento.presente || false,
        ong_id: agendamento.ong_id,
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
      console.error("Erro ao criar agendamento:", error);
      return response.status(500).json({
        error: "Erro interno ao criar agendamento",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ✅ Método para listar agendamentos
  async index(request, response) {
    try {
      // ✅ Qualquer pessoa pode visualizar, sem necessidade de autenticação
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

  // ✅ Método para buscar agendamento específico
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

  // ✅ Método adicional para confirmar agendamento
  async confirmar(request, response) {
    const io = getIo(); // ✅ OBTER INSTÂNCIA DO SOCKET.IO
    const { id } = request.params;
    const ong_id = getBearerToken(request);

    try {
      console.log("=== DEBUG CONFIRMAR AGENDAMENTO ===");
      console.log("Agendamento ID:", id);
      console.log("ONG ID:", ong_id);

      if (!ong_id) {
        return response
          .status(401)
          .json({ error: "Authorization header é obrigatório" });
      }

      // Buscar a ONG
      const ong = await connection("ongs").where("id", ong_id).first();

      if (!ong) {
        return response.status(404).json({ error: "ONG não encontrada" });
      }

      // ✅ VERIFICAR PERMISSÕES: Segurança (setor_id = 4) ou ADM
      const podeConfirmar = ong.type === "ADM" || ong.setor_id === 4;

      if (!podeConfirmar) {
        return response.status(403).json({
          error:
            "Somente Segurança e Administradores podem confirmar agendamentos",
        });
      }

      // Buscar o agendamento
      const agendamento = await connection("agendamentos")
        .where("id", id)
        .first();

      if (!agendamento) {
        return response
          .status(404)
          .json({ error: "Agendamento não encontrado" });
      }

      // Verificar se já está confirmado
      if (agendamento.confirmado) {
        return response
          .status(400)
          .json({ error: "Agendamento já confirmado" });
      }

      // Atualizar como confirmado
      const [agendamentoAtualizado] = await connection("agendamentos")
        .where("id", id)
        .update({
          confirmado: true,
          confirmado_em: new Date().toISOString(),
          confirmado_por: ong.name,
        })
        .returning("*"); // ✅ RETORNAR TODOS OS DADOS

      console.log("✅ Agendamento confirmado por:", ong.name);

      // ✅ EMITIR EVENTO SOCKET.IO - AGENDAMENTO ATUALIZADO
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

  // ✅ Método para excluir agendamento
  async delete(request, response) {
    const io = getIo(); // ✅ OBTER INSTÂNCIA DO SOCKET.IO
    const { id } = request.params;
    const ong_id = getBearerToken(request);

    try {
      if (!ong_id) {
        return response
          .status(401)
          .json({ error: "Authorization header é obrigatório" });
      }

      // Verificar se o agendamento pertence à ONG ou se é ADM
      const ong = await connection("ongs").where("id", ong_id).first();

      if (!ong) {
        return response.status(404).json({ error: "ONG não encontrada" });
      }

      const agendamento = await connection("agendamentos")
        .where("id", id)
        .first();

      if (!agendamento) {
        return response
          .status(404)
          .json({ error: "Agendamento não encontrado" });
      }

      // Verificar se é o criador ou ADM
      if (agendamento.ong_id !== ong_id && ong.type !== "ADM") {
        return response
          .status(403)
          .json({ error: "Não autorizado a excluir este agendamento" });
      }

      await connection("agendamentos").where("id", id).delete();

      console.log("✅ Agendamento excluído do banco:", id);

      // ✅ EMITIR EVENTO SOCKET.IO - AGENDAMENTO DELETADO
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

  // ✅ Método para registrar presença
  async presenca(request, response) {
    const io = getIo(); // ✅ OBTER INSTÂNCIA DO SOCKET.IO
    const { id } = request.params;
    const ong_id = getBearerToken(request);

    try {
      if (!ong_id) {
        return response
          .status(401)
          .json({ error: "Authorization header é obrigatório" });
      }

      const ong = await connection("ongs").where("id", ong_id).first();

      if (!ong) {
        return response.status(404).json({ error: "PERFIL não encontrada" });
      }

      // Buscar agendamento
      const agendamento = await connection("agendamentos")
        .where("id", id)
        .first();

      if (!agendamento) {
        return response
          .status(404)
          .json({ error: "Agendamento não encontrado" });
      }

      // Antes de registrar presença, verifica se está confirmado
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
          presente_por: ong.name,
        })
        .returning("*"); // ✅ RETORNAR TODOS OS DADOS

      console.log("✅ Presença registrada por:", ong.name);

      // ✅ EMITIR EVENTO SOCKET.IO - AGENDAMENTO ATUALIZADO
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

  // ✅ Relatório de presenças
  async relatorioPresencas(request, response) {
    try {
      const { data } = request.query; // filtro opcional por data

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
