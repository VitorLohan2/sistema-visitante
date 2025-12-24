const connection = require("../database/connection");
const { getIo } = require("../socket");

// ✅ Helper para extrair token do Bearer
function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    return parts[1];
  }
  return authHeader;
}

// ✅ Helper para verificar se usuário é ADM
async function verificarAdmin(ongId) {
  const ong = await connection("ongs").where("id", ongId).first();

  if (!ong) {
    return { error: "ONG não encontrada", status: 404 };
  }

  if (ong.type !== "ADM" && ong.type !== "ADMIN") {
    return {
      error: "Somente administradores podem realizar esta ação!",
      status: 403,
    };
  }

  return { valid: true };
}

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // LISTAR EMPRESAS
  // ═══════════════════════════════════════════════════════════════
  async index(request, response) {
    try {
      const empresasVisitantes = await connection("empresas_visitantes")
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
      const empresa = await connection("empresas_visitantes")
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
  // CADASTRAR EMPRESA (Somente ADMs)
  // ═══════════════════════════════════════════════════════════════
  async create(request, response) {
    const { nome, cnpj, telefone, email, endereco } = request.body;
    const criado_por = getBearerToken(request);

    try {
      console.log("=== DEBUG CADASTRAR EMPRESA VISITANTE ===");
      console.log("Authorization header:", criado_por);

      if (!criado_por) {
        return response
          .status(401)
          .json({ error: "Authorization header é obrigatório" });
      }

      // Verificar se é administrador
      const adminCheck = await verificarAdmin(criado_por);
      if (!adminCheck.valid) {
        return response.status(adminCheck.status).json({
          error: adminCheck.error,
          redirectTo: "/profile",
        });
      }

      // Validação básica
      if (!nome || nome.trim() === "") {
        return response
          .status(400)
          .json({ error: "Nome da empresa é obrigatório." });
      }

      // Verificar se já existe uma empresa com o mesmo nome
      const empresaExistente = await connection("empresas_visitantes")
        .where({ nome: nome.trim().toUpperCase() })
        .first();

      if (empresaExistente) {
        return response
          .status(400)
          .json({ error: "Já existe uma empresa com este nome." });
      }

      // Inserir a nova empresa
      const [empresa] = await connection("empresas_visitantes")
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
  // ATUALIZAR EMPRESA (Somente ADMs)
  // ═══════════════════════════════════════════════════════════════
  async update(request, response) {
    const { id } = request.params;
    const { nome, cnpj, telefone, email, endereco } = request.body;
    const atualizado_por = getBearerToken(request);

    try {
      console.log("=== DEBUG ATUALIZAR EMPRESA ===");
      console.log("ID da empresa:", id);
      console.log("Authorization:", atualizado_por);

      if (!atualizado_por) {
        return response
          .status(401)
          .json({ error: "Authorization header é obrigatório" });
      }

      // Verificar se é administrador
      const adminCheck = await verificarAdmin(atualizado_por);
      if (!adminCheck.valid) {
        return response.status(adminCheck.status).json({
          error: adminCheck.error,
        });
      }

      // Verificar se a empresa existe
      const empresaExistente = await connection("empresas_visitantes")
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
      const nomeConflito = await connection("empresas_visitantes")
        .where({ nome: nome.trim().toUpperCase() })
        .whereNot("id", id)
        .first();

      if (nomeConflito) {
        return response
          .status(400)
          .json({ error: "Já existe outra empresa com este nome." });
      }

      // Atualizar a empresa
      await connection("empresas_visitantes")
        .where("id", id)
        .update({
          nome: nome.trim().toUpperCase(),
          cnpj: cnpj ? cnpj.replace(/\D/g, "") : null,
          telefone: telefone ? telefone.replace(/\D/g, "") : null,
          email: email ? email.trim().toLowerCase() : null,
          endereco: endereco ? endereco.trim() : null,
        });

      // Buscar a empresa atualizada
      const empresaAtualizada = await connection("empresas_visitantes")
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
  // DELETAR EMPRESA (Somente ADMs)
  // ═══════════════════════════════════════════════════════════════
  async delete(request, response) {
    const { id } = request.params;
    const deletado_por = getBearerToken(request);

    try {
      console.log("=== DEBUG DELETAR EMPRESA ===");
      console.log("ID da empresa:", id);
      console.log("Authorization:", deletado_por);

      if (!deletado_por) {
        return response
          .status(401)
          .json({ error: "Authorization header é obrigatório" });
      }

      // Verificar se é administrador
      const adminCheck = await verificarAdmin(deletado_por);
      if (!adminCheck.valid) {
        return response.status(adminCheck.status).json({
          error: adminCheck.error,
        });
      }

      // Verificar se a empresa existe
      const empresa = await connection("empresas_visitantes")
        .where("id", id)
        .first();

      if (!empresa) {
        return response.status(404).json({ error: "Empresa não encontrada." });
      }

      // Verificar se há usuários vinculados a esta empresa
      const usuariosVinculados = await connection("ongs")
        .where("empresa_id", id)
        .count("id as count")
        .first();

      if (usuariosVinculados.count > 0) {
        return response.status(400).json({
          error: `Não é possível excluir esta empresa pois existem ${usuariosVinculados.count} usuário(s) vinculado(s) a ela.`,
        });
      }

      // Deletar a empresa
      await connection("empresas_visitantes").where("id", id).delete();

      console.log("✅ Empresa deletada com sucesso:", empresa.nome);

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
