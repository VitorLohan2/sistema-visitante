const connection = require("../database/connection");
const { getIo } = require("../socket");

// ✅ Helper para extrair token do Bearer (igual ao TicketController)
function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    return parts[1]; // retorna só o ID
  }
  return null;
}

module.exports = {
  // Listar visitantes atuais
  async index(request, response) {
    const ong_id = getBearerToken(request);

    if (!ong_id) {
      return response
        .status(401)
        .json({ error: "Authorization header é obrigatório" });
    }

    try {
      const visitors = await connection("visitors")
        //.where('ong_id', ong_id) // Ative se for multi-ONG
        // .leftJoin('incidents', 'incidents.placa_veiculo', '=', 'visitors.placa_veiculo')
        .select([
          "id",
          "name",
          "cpf",
          "company",
          "sector",
          "placa_veiculo",
          "cor_veiculo",
          "responsavel",
          "observacao",
          "entry_date",
          "created_at",
        ]);

      return response.json(visitors);
    } catch (error) {
      console.error("Erro ao buscar visitantes:", error);
      return response.status(500).json({
        error: "Erro ao buscar visitantes",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Registrar nova entrada
  async create(request, response) {
    const io = getIo();
    const {
      name,
      cpf,
      company,
      sector,
      placa_veiculo,
      cor_veiculo,
      responsavel,
      observacao,
    } = request.body;
    const ong_id = getBearerToken(request);

    if (!ong_id) {
      return response
        .status(401)
        .json({ error: "Authorization header é obrigatório" });
    }

    console.log("🔍 Dados recebidos:", {
      name,
      cpf,
      company,
      sector,
      placa_veiculo,
      cor_veiculo,
      responsavel,
      observacao,
      ong_id,
    });

    try {
      // ✅ VERIFICAÇÃO: Confirma se a ONG existe (igual ao padrão dos outros controllers)
      const ong = await connection("ongs").where("id", ong_id).first();

      if (!ong) {
        console.error("❌ LOGIN não encontrado:", ong_id);
        return response.status(404).json({
          error: `ONG com ID ${ong_id} não encontrada`,
        });
      }

      console.log("✅ LOGIN encontrado(a):", ong.name);

      const [visitor] = await connection("visitors")
        .insert({
          name,
          cpf,
          company,
          sector,
          placa_veiculo,
          cor_veiculo,
          responsavel,
          observacao,
          entry_date: new Date(),
          ong_id,
        })
        .returning("id");

      console.log("✅ Visita registrada com sucesso");

      // ✅ EMITIR EVENTO DE CRIAÇÃO
      const eventData = {
        id: visitor.id,
        name,
        cpf,
        company,
        sector,
        placa_veiculo,
        cor_veiculo,
        responsavel,
        entry_date: new Date(),
        ong_id,
        timestamp: new Date(),
        acao: "criado",
      };

      io.to("global").emit("visitor:create", eventData);
      console.log("📡 Evento visitor:create emitido:", eventData);

      return response.status(201).json({
        id: visitor.id,
        entry_date: new Date(),
        message: "Visita registrada com sucesso",
      });
    } catch (error) {
      console.error("❌ Erro ao registrar visita:", error);
      return response.status(500).json({
        error: "Erro ao registrar visita",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Encerrar visita e mover para histórico
  async endVisit(request, response) {
    const io = getIo();
    const { id } = request.params;
    const ong_id = getBearerToken(request);

    if (!ong_id) {
      return response
        .status(401)
        .json({ error: "Authorization header é obrigatório" });
    }

    try {
      const visitor = await connection("visitors").where("id", id).first();

      if (!visitor) {
        return response.status(404).json({ error: "Visitante não encontrado" });
      }

      await connection("history").insert({
        name: visitor.name,
        cpf: visitor.cpf,
        company: visitor.company,
        sector: visitor.sector,
        placa_veiculo: visitor.placa_veiculo,
        cor_veiculo: visitor.cor_veiculo,
        responsavel: visitor.responsavel,
        observacao: visitor.observacao,
        entry_date: visitor.entry_date,
        exit_date: new Date().toISOString(),
        ong_id: visitor.ong_id,
      });

      await connection("visitors").where("id", id).delete();

      const eventData = {
        id: parseInt(id), // Garantir que é número
        name: visitor.name,
        cpf: visitor.cpf,
        company: visitor.company,
        sector: visitor.sector,
        placa_veiculo: visitor.placa_veiculo,
        cor_veiculo: visitor.cor_veiculo,
        exit_date: new Date(),
        ong_id: visitor.ong_id,
        timestamp: new Date(),
        acao: "encerrado",
      };

      io.to("global").emit("visitor:delete", eventData);
      io.to("global").emit("visitor:end", eventData);
      console.log(
        "📡 Evento visitor:delete e visitor:end emitidos:",
        eventData
      );

      return response.status(204).send();
    } catch (err) {
      console.error("Erro ao encerrar visita:", err);
      return response.status(500).json({
        error: "Erro ao encerrar visita",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  // Histórico completo de visitas
  async history(request, response) {
    const ong_id = getBearerToken(request);

    if (!ong_id) {
      return response
        .status(401)
        .json({ error: "Authorization header é obrigatório" });
    }

    try {
      const results = await connection("history")
        //.where('ong_id', ong_id) // Descomente se multi-ONG
        .select("*")
        .orderBy("exit_date", "desc");

      return response.json(results);
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
      return response.status(500).json({
        error: "Erro ao buscar histórico",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },
};
