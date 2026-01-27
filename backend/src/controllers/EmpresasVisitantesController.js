const connection = require("../database/connection");
const { getIo } = require("../socket");

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // LISTAR EMPRESAS
  // ═══════════════════════════════════════════════════════════════
  async index(request, response) {
    try {
      const empresasVisitantes = await connection("empresa_visitante")
        .select("id", "nome", "cnpj", "telefone", "email", "endereco")
        .orderBy("nome");

      return response.json(empresasVisitantes);
    } catch (error) {
      console.error("Erro ao buscar empresas de visitantes:", error);
      return response
        .status(500)
        .json({ error: "Erro ao buscar empresas de visitantes." });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR EMPRESA POR ID
  // ═══════════════════════════════════════════════════════════════
  async show(request, response) {
    const { id } = request.params;

    try {
      const empresa = await connection("empresa_visitante")
        .where("id", id)
        .select("id", "nome", "cnpj", "telefone", "email", "endereco")
        .first();

      if (!empresa) {
        return response.status(404).json({ error: "Empresa não encontrada." });
      }

      return response.json(empresa);
    } catch (error) {
      console.error("Erro ao buscar empresa:", error);
      return response.status(500).json({ error: "Erro ao buscar empresa." });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // CADASTRAR EMPRESA
  // Permissão: empresa_visitante_criar (verificada no middleware)
  // ═══════════════════════════════════════════════════════════════
  async create(request, response) {
    const { nome, cnpj, telefone, email, endereco } = request.body;

    try {
      // Validação básica
      if (!nome || nome.trim() === "") {
        return response
          .status(400)
          .json({ error: "Nome da empresa é obrigatório." });
      }

      // Verificar se já existe uma empresa com o mesmo nome
      const empresaExistente = await connection("empresa_visitante")
        .where({ nome: nome.trim().toUpperCase() })
        .first();

      if (empresaExistente) {
        return response
          .status(400)
          .json({ error: "Já existe uma empresa com este nome." });
      }

      // Inserir a nova empresa
      const [empresa] = await connection("empresa_visitante")
        .insert({
          nome: nome.trim().toUpperCase(),
          cnpj: cnpj ? cnpj.replace(/\D/g, "") : null,
          telefone: telefone ? telefone.replace(/\D/g, "") : null,
          email: email ? email.trim().toLowerCase() : null,
          endereco: endereco ? endereco.trim() : null,
        })
        .returning(["id", "nome", "cnpj", "telefone", "email", "endereco"]);

      console.log("✅ Empresa cadastrada com sucesso:", empresa);

      const io = getIo();
      io.to("global").emit("empresa:create", empresa);

      return response.json({
        ...empresa,
        message: "Empresa cadastrada com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao cadastrar empresa de visitantes:", error);
      return response.status(500).json({
        error: "Erro ao cadastrar empresa de visitantes",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ATUALIZAR EMPRESA
  // Permissão: empresa_visitante_editar (verificada no middleware)
  // ═══════════════════════════════════════════════════════════════
  async update(request, response) {
    const { id } = request.params;
    const { nome, cnpj, telefone, email, endereco } = request.body;

    try {
      // Verificar se a empresa existe
      const empresaExistente = await connection("empresa_visitante")
        .where("id", id)
        .first();

      if (!empresaExistente) {
        return response.status(404).json({ error: "Empresa não encontrada." });
      }

      // Validação básica
      if (!nome || nome.trim() === "") {
        return response
          .status(400)
          .json({ error: "Nome da empresa é obrigatório." });
      }

      // Verificar se já existe outra empresa com o mesmo nome
      const nomeConflito = await connection("empresa_visitante")
        .where({ nome: nome.trim().toUpperCase() })
        .whereNot("id", id)
        .first();

      if (nomeConflito) {
        return response
          .status(400)
          .json({ error: "Já existe outra empresa com este nome." });
      }

      // Atualizar a empresa
      await connection("empresa_visitante")
        .where("id", id)
        .update({
          nome: nome.trim().toUpperCase(),
          cnpj: cnpj ? cnpj.replace(/\D/g, "") : null,
          telefone: telefone ? telefone.replace(/\D/g, "") : null,
          email: email ? email.trim().toLowerCase() : null,
          endereco: endereco ? endereco.trim() : null,
        });

      // Buscar a empresa atualizada
      const empresaAtualizada = await connection("empresa_visitante")
        .where("id", id)
        .select("id", "nome", "cnpj", "telefone", "email", "endereco")
        .first();

      console.log("✅ Empresa atualizada com sucesso:", empresaAtualizada);

      const io = getIo();
      io.to("global").emit("empresa:update", empresaAtualizada);

      return response.json({
        ...empresaAtualizada,
        message: "Empresa atualizada com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao atualizar empresa:", error);
      return response.status(500).json({
        error: "Erro ao atualizar empresa",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DELETAR EMPRESA
  // Permissão: empresa_visitante_deletar (verificada no middleware)
  // ═══════════════════════════════════════════════════════════════
  async delete(request, response) {
    const { id } = request.params;

    try {
      // Verificar se a empresa existe
      const empresa = await connection("empresa_visitante")
        .where("id", id)
        .first();

      if (!empresa) {
        return response.status(404).json({ error: "Empresa não encontrada." });
      }

      // Verificar se há visitantes vinculados a esta empresa
      const visitantesVinculados = await connection("cadastro_visitante")
        .where("empresa_id", id)
        .count("id as count")
        .first();

      if (visitantesVinculados.count > 0) {
        return response.status(400).json({
          error: `Não é possível excluir esta empresa pois existem ${visitantesVinculados.count} visitante(s) vinculado(s) a ela.`,
        });
      }

      // Deletar a empresa
      await connection("empresa_visitante").where("id", id).delete();

      const io = getIo();
      io.to("global").emit("empresa:delete", {
        id: parseInt(id),
        nome: empresa.nome,
      });

      return response.json({
        message: "Empresa excluída com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao deletar empresa:", error);
      return response.status(500).json({
        error: "Erro ao deletar empresa",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
};
