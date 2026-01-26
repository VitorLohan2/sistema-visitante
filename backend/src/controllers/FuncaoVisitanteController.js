/**
 * FuncaoVisitanteController
 * Gerencia funções dos visitantes (Motorista, Ajudante, etc.)
 */

const connection = require("../database/connection");

const TABELA = "funcao_visitante";

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // LISTAR TODAS AS FUNÇÕES
  // GET /funcoes-visitantes
  // ═══════════════════════════════════════════════════════════════
  async index(request, response) {
    try {
      const funcoes = await connection(TABELA)
        .select("id", "nome")
        .orderBy("nome", "asc");

      return response.json(funcoes);
    } catch (error) {
      console.error("❌ Erro ao listar funções:", error);
      return response.status(500).json({
        error: "Erro ao listar funções.",
        code: "LIST_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR FUNÇÃO POR ID
  // GET /funcoes-visitantes/:id
  // ═══════════════════════════════════════════════════════════════
  async show(request, response) {
    const { id } = request.params;

    try {
      const funcao = await connection(TABELA).where("id", id).first();

      if (!funcao) {
        return response.status(404).json({
          error: "Função não encontrada.",
          code: "NOT_FOUND",
        });
      }

      return response.json(funcao);
    } catch (error) {
      console.error("❌ Erro ao buscar função:", error);
      return response.status(500).json({
        error: "Erro ao buscar função.",
        code: "SHOW_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // CRIAR NOVA FUNÇÃO
  // POST /funcoes-visitantes
  // ═══════════════════════════════════════════════════════════════
  async create(request, response) {
    const { nome } = request.body;

    try {
      const [funcao] = await connection(TABELA)
        .insert({ nome })
        .returning(["id", "nome"]);

      return response.status(201).json(funcao);
    } catch (error) {
      console.error("❌ Erro ao criar função:", error);
      return response.status(500).json({
        error: "Erro ao criar função.",
        code: "CREATE_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ATUALIZAR FUNÇÃO
  // PUT /funcoes-visitantes/:id
  // ═══════════════════════════════════════════════════════════════
  async update(request, response) {
    const { id } = request.params;
    const { nome } = request.body;

    try {
      const funcao = await connection(TABELA).where("id", id).first();

      if (!funcao) {
        return response.status(404).json({
          error: "Função não encontrada.",
          code: "NOT_FOUND",
        });
      }

      await connection(TABELA).where("id", id).update({ nome });

      return response.json({
        id,
        nome,
        message: "Função atualizada com sucesso.",
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar função:", error);
      return response.status(500).json({
        error: "Erro ao atualizar função.",
        code: "UPDATE_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DELETAR FUNÇÃO
  // DELETE /funcoes-visitantes/:id
  // ═══════════════════════════════════════════════════════════════
  async delete(request, response) {
    const { id } = request.params;

    try {
      const funcao = await connection(TABELA).where("id", id).first();

      if (!funcao) {
        return response.status(404).json({
          error: "Função não encontrada.",
          code: "NOT_FOUND",
        });
      }

      await connection(TABELA).where("id", id).delete();

      return response.status(204).send();
    } catch (error) {
      console.error("❌ Erro ao deletar função:", error);
      return response.status(500).json({
        error: "Erro ao deletar função.",
        code: "DELETE_ERROR",
      });
    }
  },
};
