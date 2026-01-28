/**
 * EmpresaAtribuidaController
 * Gerencia empresas atribuídas aos visitantes
 */

const connection = require("../database/connection");

const TABELA = "empresa_atribuida";

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // LISTAR TODAS AS EMPRESAS ATRIBUÍDAS
  // GET /empresas-atribuidas
  // ═══════════════════════════════════════════════════════════════
  async index(request, response) {
    try {
      const empresas = await connection(TABELA)
        .select("id", "nome")
        .orderBy("nome", "asc");

      return response.json(empresas);
    } catch (error) {
      console.error("❌ Erro ao listar empresas atribuídas:", error);
      return response.status(500).json({
        error: "Erro ao listar empresas atribuídas.",
        code: "LIST_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR EMPRESA ATRIBUÍDA POR ID
  // GET /empresas-atribuidas/:id
  // ═══════════════════════════════════════════════════════════════
  async show(request, response) {
    const { id } = request.params;

    try {
      const empresa = await connection(TABELA).where("id", id).first();

      if (!empresa) {
        return response.status(404).json({
          error: "Empresa atribuída não encontrada.",
          code: "NOT_FOUND",
        });
      }

      return response.json(empresa);
    } catch (error) {
      console.error("❌ Erro ao buscar empresa atribuída:", error);
      return response.status(500).json({
        error: "Erro ao buscar empresa atribuída.",
        code: "SHOW_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // CRIAR NOVA EMPRESA ATRIBUÍDA
  // POST /empresas-atribuidas
  // ═══════════════════════════════════════════════════════════════
  async create(request, response) {
    const { nome } = request.body;

    try {
      const [empresa] = await connection(TABELA)
        .insert({ nome })
        .returning(["id", "nome"]);

      return response.status(201).json(empresa);
    } catch (error) {
      console.error("❌ Erro ao criar empresa atribuída:", error);
      return response.status(500).json({
        error: "Erro ao criar empresa atribuída.",
        code: "CREATE_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ATUALIZAR EMPRESA ATRIBUÍDA
  // PUT /empresas-atribuidas/:id
  // ═══════════════════════════════════════════════════════════════
  async update(request, response) {
    const { id } = request.params;
    const { nome } = request.body;

    try {
      const [empresa] = await connection(TABELA)
        .where("id", id)
        .update({ nome })
        .returning(["id", "nome"]);

      if (!empresa) {
        return response.status(404).json({
          error: "Empresa atribuída não encontrada.",
          code: "NOT_FOUND",
        });
      }

      return response.json(empresa);
    } catch (error) {
      console.error("❌ Erro ao atualizar empresa atribuída:", error);
      return response.status(500).json({
        error: "Erro ao atualizar empresa atribuída.",
        code: "UPDATE_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DELETAR EMPRESA ATRIBUÍDA
  // DELETE /empresas-atribuidas/:id
  // ═══════════════════════════════════════════════════════════════
  async delete(request, response) {
    const { id } = request.params;

    try {
      const deleted = await connection(TABELA).where("id", id).del();

      if (!deleted) {
        return response.status(404).json({
          error: "Empresa atribuída não encontrada.",
          code: "NOT_FOUND",
        });
      }

      return response.status(204).send();
    } catch (error) {
      console.error("❌ Erro ao deletar empresa atribuída:", error);
      return response.status(500).json({
        error: "Erro ao deletar empresa atribuída.",
        code: "DELETE_ERROR",
      });
    }
  },
};
