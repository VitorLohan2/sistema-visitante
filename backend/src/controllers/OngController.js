const generateUniqueId = require("../utils/generateUniqueId");
const connection = require("../database/connection");
const { getIo } = require("../socket");

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // LISTAR TODOS OS USUÁRIOS
  // ═══════════════════════════════════════════════════════════════
  async index(request, response) {
    try {
      const ongs = await connection("ongs").select("*");
      return response.json(ongs);
    } catch (error) {
      console.error("❌ Erro ao listar usuários:", error);
      return response.status(500).json({
        error: "Erro ao listar usuários.",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // CRIAR NOVO USUÁRIO
  // ═══════════════════════════════════════════════════════════════
  async create(request, response) {
    const io = getIo();
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

        await connection("codigos_cadastro")
          .where("codigo", codigo_acesso.toUpperCase())
          .increment("usos_atuais", 1);
      } catch (error) {
        return response.status(500).json({
          error: "Erro ao validar código de acesso",
        });
      }
    }

    try {
      const cleanedCpf = cpf.replace(/\D/g, "");
      const cleanedWhatsapp = whatsapp ? whatsapp.replace(/\D/g, "") : null;

      const id = generateUniqueId();

      await connection("ongs").insert({
        id,
        name,
        birthdate: birthdate || null,
        cpf: cleanedCpf,
        empresa_id: empresa_id || null,
        setor_id: setor_id || null,
        email: email.toLowerCase(),
        whatsapp: cleanedWhatsapp,
        city: city || null,
        uf: uf ? uf.toUpperCase() : null,
        type: type || "USER",
      });

      console.log("✅ Usuário cadastrado no banco:", id);

      // ✅ EMITIR EVENTO SOCKET PARA SALA GLOBAL (igual IncidentController)
      io.to("global").emit("usuario:created", {
        id,
        name,
        type: type || "USER",
      });

      console.log("✅ Evento usuario:created emitido para sala GLOBAL");

      return response.json({ id });
    } catch (error) {
      console.error("❌ Erro ao criar usuário:", error);
      return response.status(500).json({
        error: "Erro ao criar usuário",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR USUÁRIO ESPECÍFICO
  // ═══════════════════════════════════════════════════════════════
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
          "setores.nome as setor",
          "ongs.whatsapp",
          "ongs.cpf",
          "ongs.birthdate",
          "ongs.city",
          "ongs.uf",
          "empresas.nome as empresa_nome",
          "setores.nome as setor_nome"
        )
        .first();

      if (!ong) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      return res.json(ong);
    } catch (error) {
      console.error("❌ Erro ao buscar usuário:", error);
      return res.status(500).json({
        error: "Erro interno ao buscar usuário",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ATUALIZAR USUÁRIO
  // ═══════════════════════════════════════════════════════════════
  async update(req, res) {
    const io = getIo();
    const { id } = req.params;
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
    } = req.body;

    try {
      console.log("=== DEBUG UPDATE ===");
      console.log("ID do usuário sendo editado:", id);

      // 1. Verificar se o usuário existe
      const ongExists = await connection("ongs").where("id", id).first();
      console.log("Usuário existe:", ongExists ? "SIM" : "NÃO");

      if (!ongExists) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // 2. Verificar se é ADM
      if (ongExists.type === "ADM") {
        return res.status(403).json({
          error: "Usuários ADM não podem ser editados",
        });
      }

      // 3. Validações básicas
      if (!name || !email || !whatsapp || !cpf || !empresa_id || !setor_id) {
        return res.status(400).json({
          error:
            "Campos obrigatórios: name, email, whatsapp, cpf, empresa_id, setor_id",
        });
      }

      // 4. Limpar CPF e WhatsApp
      const cleanedCpf = cpf.replace(/\D/g, "");
      const cleanedWhatsapp = whatsapp.replace(/\D/g, "");

      console.log("CPF limpo recebido:", cleanedCpf);
      console.log("CPF atual do usuário:", ongExists.cpf);

      // 5. Verificar se o CPF já está em uso por OUTRO usuário
      const cpfInUse = await connection("ongs")
        .where("cpf", cleanedCpf)
        .whereRaw("id != ?", [id])
        .first();

      console.log("CPF em uso por outro usuário?", cpfInUse ? "SIM" : "NÃO");

      if (cpfInUse) {
        console.log("Dados do usuário com CPF duplicado:", {
          id: cpfInUse.id,
          name: cpfInUse.name,
          cpf: cpfInUse.cpf,
        });
        return res.status(400).json({
          error: "Este CPF já está cadastrado para outro usuário",
        });
      }

      // 6. Verificar se o email já está em uso por OUTRO usuário
      const emailInUse = await connection("ongs")
        .where("email", email.toLowerCase())
        .whereNot("id", id)
        .first();

      if (emailInUse) {
        return res.status(400).json({
          error: "Este email já está cadastrado para outro usuário",
        });
      }

      // 7. Verificar se a empresa existe
      const empresaExists = await connection("empresas")
        .where("id", empresa_id)
        .first();

      if (!empresaExists) {
        return res.status(404).json({
          error: "Empresa não encontrada",
        });
      }

      // 8. Verificar se o setor existe
      const setorExists = await connection("setores")
        .where("id", setor_id)
        .first();

      if (!setorExists) {
        return res.status(404).json({
          error: "Setor não encontrado",
        });
      }

      // 9. Atualizar o usuário
      console.log("Atualizando usuário com dados:", {
        name,
        cpf: cleanedCpf,
        email: email.toLowerCase(),
        whatsapp: cleanedWhatsapp,
      });

      await connection("ongs")
        .where("id", id)
        .update({
          name,
          birthdate: birthdate || null,
          cpf: cleanedCpf,
          empresa_id,
          setor_id,
          email: email.toLowerCase(),
          whatsapp: cleanedWhatsapp,
          city: city || null,
          uf: uf ? uf.toUpperCase() : null,
          updated_at: connection.fn.now(),
        });

      console.log("✅ Usuário atualizado com sucesso!");

      // 10. ✅ EMITIR EVENTO SOCKET PARA SALA GLOBAL (igual IncidentController)
      io.to("global").emit("usuario:updated", { id });

      console.log("✅ Evento usuario:updated emitido para sala GLOBAL");

      return res.json({
        message: "Usuário atualizado com sucesso",
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar usuário:", error);
      return res.status(500).json({
        error: "Erro interno ao atualizar usuário",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DELETAR USUÁRIO
  // ═══════════════════════════════════════════════════════════════
  async delete(req, res) {
    const io = getIo();
    const { id } = req.params;

    try {
      console.log("=== DEBUG DELETE ===");
      console.log("ID do usuário a ser deletado:", id);

      // 1. Verificar se o usuário existe
      const ongExists = await connection("ongs").where("id", id).first();

      if (!ongExists) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // 2. Verificar se é ADM
      if (ongExists.type === "ADM") {
        return res.status(403).json({
          error: "Usuários ADM não podem ser excluídos",
        });
      }

      // 3. Deletar registros relacionados primeiro (se houver)
      await connection("history").where("ong_id", id).delete();

      // 4. Deletar o usuário
      await connection("ongs").where("id", id).delete();

      console.log("✅ Usuário deletado com sucesso!");

      // 5. ✅ EMITIR EVENTO SOCKET PARA SALA GLOBAL (igual IncidentController)
      io.to("global").emit("usuario:deleted", { id });

      console.log("✅ Evento usuario:deleted emitido para sala GLOBAL");

      return res.status(204).send();
    } catch (error) {
      console.error("❌ Erro ao deletar usuário:", error);
      return res.status(500).json({
        error: "Erro interno ao deletar usuário",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
};
