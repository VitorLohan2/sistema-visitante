const generateUniqueId = require("../utils/generateUniqueId");
const connection = require("../database/connection");

module.exports = {
  async index(request, response) {
    const ongs = await connection("ongs").select("*");

    return response.json(ongs);
  },

  async create(request, response) {
    const {
      name,
      birthdate,
      cpf,
      empresa_id,
      setor_id,
      email,
      whatsapp,
      city,
      uf,
      type,
      codigo_acesso,
    } = request.body;

    // 🔐 Validação do código (apenas para USER)
    if (type === "USER" || !type) {
      try {
        // 1. Verifica se o código é válido
        const codigoValido = await connection("codigos_cadastro")
          .where({
            codigo: codigo_acesso.toUpperCase(),
            ativo: true,
          })
          .andWhereRaw("usos_atuais < limite_usos")
          .first();

        if (!codigoValido) {
          return response.status(400).json({
            error: "Código de acesso inválido ou limite de usos atingido",
          });
        }

        // 2. Incrementa o contador de usos
        await connection("codigos_cadastro")
          .where("codigo", codigo_acesso.toUpperCase())
          .increment("usos_atuais", 1);
      } catch (error) {
        return response.status(500).json({
          error: "Erro ao validar código de acesso",
        });
      }
    }

    // Limpa o CPF (remove pontos e traço)
    const cleanedCpf = cpf.replace(/\D/g, "");

    const id = generateUniqueId();

    // Cadastro do usuário (não armazena o código)
    await connection("ongs").insert({
      id,
      name,
      birthdate, // Novo campo
      cpf: cleanedCpf, // Novo campo
      empresa_id, // Novo campo
      setor_id, // Novo campo
      email,
      whatsapp,
      city,
      uf,
      type: type || "USER", // padrão USER, se não for enviado
    });

    const { getIo } = require("../socket");
    getIo().emit("ong:create", { id, name, type: type || "USER" });

    return response.json({ id });
  },
  // ✅ NOVO: buscar um CADASTRO pelo ID
  async show(req, res) {
    const { id } = req.params;

    try {
      const ong = await connection("ongs")
        .leftJoin("empresas", "ongs.empresa_id", "empresas.id")
        .leftJoin("setores", "ongs.setor_id", "setores.id")
        .where("ongs.id", id)
        .select(
          "ongs.id",
          "ongs.name",
          "ongs.type",
          "ongs.email",
          "empresas.id as empresa_id",
          "empresas.nome as empresa",
          "setores.id as setor_id",
          "setores.nome as setor"
        )
        .first();

      if (!ong) {
        return res.status(404).json({ error: "ONG não encontrada" });
      }

      return res.json(ong);
    } catch (error) {
      console.error("Erro ao buscar ONG:", error);
      return res.status(500).json({
        error: "Erro interno ao buscar ONG",
        details: error.message,
      });
    }
  },
};
