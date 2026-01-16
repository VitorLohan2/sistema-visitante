const connection = require("../database/connection");
const { getIo } = require("../socket");
const { verificarToken } = require("../utils/jwt");

/**
 * Helper para extrair ID do usuário
 * Suporta tanto o authMiddleware (req.usuario) quanto o formato legado (Bearer token)
 */
function getUsuarioId(req) {
  // Primeiro verifica se veio do authMiddleware
  if (req.usuario?.id) {
    return req.usuario.id;
  }

  // Fallback: tenta extrair do header Authorization (formato legado ou JWT)
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    const token = parts[1];

    // Verifica se é um JWT (contém dois pontos)
    if (token.includes(".")) {
      try {
        const decoded = verificarToken(token);
        return decoded.id;
      } catch (error) {
        console.error("❌ Erro ao decodificar JWT:", error.message);
        return null;
      }
    }

    // Se não for JWT, retorna o token como ID (formato antigo)
    return token;
  }
  return null;
}

module.exports = {
  // Listar visitantes atuais
  async index(request, response) {
    const usuario_id = getUsuarioId(request);

    if (!usuario_id) {
      return response
        .status(401)
        .json({ error: "Authorization header é obrigatório" });
    }

    try {
      const visitors = await connection("visitante")
        //.where('usuario_id', usuario_id) // Ative se for multi-usuário
        .select([
          "id",
          "nome",
          "cpf",
          "empresa",
          "setor",
          "placa_veiculo",
          "cor_veiculo",
          "tipo_veiculo",
          "funcao",
          "responsavel",
          "observacao",
          "data_de_entrada",
          "criado_em",
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
      nome,
      cpf,
      empresa,
      setor,
      placa_veiculo,
      cor_veiculo,
      tipo_veiculo,
      funcao,
      responsavel,
      observacao,
    } = request.body;
    const usuario_id = getUsuarioId(request);

    if (!usuario_id) {
      return response
        .status(401)
        .json({ error: "Authorization header é obrigatório" });
    }

    console.log("🔍 Dados recebidos:", {
      nome,
      cpf,
      empresa,
      setor,
      placa_veiculo,
      cor_veiculo,
      tipo_veiculo,
      funcao,
      responsavel,
      observacao,
      usuario_id,
    });

    try {
      // ✅ VERIFICAÇÃO: Confirma se o usuário existe (igual ao padrão dos outros controllers)
      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .first();

      if (!usuario) {
        console.error("❌ LOGIN não encontrado:", usuario_id);
        return response.status(404).json({
          error: `Usuário com ID ${usuario_id} não encontrado`,
        });
      }

      console.log("✅ LOGIN encontrado(a):", usuario.nome);

      const [visitor] = await connection("visitante")
        .insert({
          nome,
          cpf,
          empresa,
          setor,
          placa_veiculo,
          cor_veiculo,
          tipo_veiculo,
          funcao,
          responsavel,
          observacao,
          data_de_entrada: new Date(),
          usuario_id,
        })
        .returning("id");

      console.log("✅ Visita registrada com sucesso");

      // ✅ EMITIR EVENTO DE CRIAÇÃO
      const eventData = {
        id: visitor.id,
        nome,
        cpf,
        empresa,
        setor,
        placa_veiculo,
        cor_veiculo,
        tipo_veiculo,
        funcao,
        responsavel,
        data_de_entrada: new Date(),
        usuario_id,
        timestamp: new Date(),
        acao: "criado",
      };

      io.to("global").emit("visitor:create", eventData);
      console.log("📡 Evento visitor:create emitido:", eventData);

      return response.status(201).json({
        id: visitor.id,
        data_de_entrada: new Date(),
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
    const usuario_id = getUsuarioId(request);

    if (!usuario_id) {
      return response
        .status(401)
        .json({ error: "Authorization header é obrigatório" });
    }

    try {
      const visitor = await connection("visitante").where("id", id).first();

      if (!visitor) {
        return response.status(404).json({ error: "Visitante não encontrado" });
      }

      await connection("historico_visitante").insert({
        nome: visitor.nome,
        cpf: visitor.cpf,
        empresa: visitor.empresa,
        setor: visitor.setor,
        placa_veiculo: visitor.placa_veiculo,
        cor_veiculo: visitor.cor_veiculo,
        tipo_veiculo: visitor.tipo_veiculo,
        funcao: visitor.funcao,
        responsavel: visitor.responsavel,
        observacao: visitor.observacao,
        data_de_entrada: visitor.data_de_entrada,
        data_de_saida: new Date().toISOString(),
        usuario_id: visitor.usuario_id,
      });

      await connection("visitante").where("id", id).delete();

      const eventData = {
        id: parseInt(id), // Garantir que é número
        nome: visitor.nome,
        cpf: visitor.cpf,
        empresa: visitor.empresa,
        setor: visitor.setor,
        placa_veiculo: visitor.placa_veiculo,
        cor_veiculo: visitor.cor_veiculo,
        tipo_veiculo: visitor.tipo_veiculo,
        funcao: visitor.funcao,
        data_de_saida: new Date(),
        usuario_id: visitor.usuario_id,
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
    const usuario_id = getUsuarioId(request);

    if (!usuario_id) {
      return response
        .status(401)
        .json({ error: "Authorization header é obrigatório" });
    }

    try {
      const results = await connection("historico_visitante")
        //.where('usuario_id', usuario_id) // Descomente se multi-usuário
        .select("*")
        .orderBy("data_de_saida", "desc");

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
