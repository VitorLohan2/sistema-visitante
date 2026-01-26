/**
 * CorVeiculoVisitanteController
 * Gerencia cores dos veículos dos visitantes
 */

const connection = require("../database/connection");

const TABELA = "cor_veiculo_visitante";

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // LISTAR TODAS AS CORES
  // GET /cores-veiculos-visitantes
  // ═══════════════════════════════════════════════════════════════
  async index(request, response) {
    try {
      const cores = await connection(TABELA)
        .select("id", "nome")
        .orderBy("nome", "asc");

      return response.json(cores);
    } catch (error) {
      console.error("❌ Erro ao listar cores:", error);
      return response.status(500).json({
        error: "Erro ao listar cores.",
        code: "LIST_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR COR POR ID
  // GET /cores-veiculos-visitantes/:id
  // ═══════════════════════════════════════════════════════════════
  async show(request, response) {
    const { id } = request.params;

    try {
      const cor = await connection(TABELA).where("id", id).first();

      if (!cor) {
        return response.status(404).json({
          error: "Cor não encontrada.",
          code: "NOT_FOUND",
        });
      }

      return response.json(cor);
    } catch (error) {
      console.error("❌ Erro ao buscar cor:", error);
      return response.status(500).json({
        error: "Erro ao buscar cor.",
        code: "SHOW_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // CRIAR NOVA COR
  // POST /cores-veiculos-visitantes
  // ═══════════════════════════════════════════════════════════════
  async create(request, response) {
    const { nome } = request.body;

    try {
      const [cor] = await connection(TABELA)
        .insert({ nome })
        .returning(["id", "nome"]);

      return response.status(201).json(cor);
    } catch (error) {
      console.error("❌ Erro ao criar cor:", error);
      return response.status(500).json({
        error: "Erro ao criar cor.",
        code: "CREATE_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ATUALIZAR COR
  // PUT /cores-veiculos-visitantes/:id
  // ═══════════════════════════════════════════════════════════════
  async update(request, response) {
    const { id } = request.params;
    const { nome } = request.body;

    try {
      const cor = await connection(TABELA).where("id", id).first();

      if (!cor) {
        return response.status(404).json({
          error: "Cor não encontrada.",
          code: "NOT_FOUND",
        });
      }

      await connection(TABELA).where("id", id).update({ nome });

      return response.json({
        id,
        nome,
        message: "Cor atualizada com sucesso.",
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar cor:", error);
      return response.status(500).json({
        error: "Erro ao atualizar cor.",
        code: "UPDATE_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DELETAR COR
  // DELETE /cores-veiculos-visitantes/:id
  // ═══════════════════════════════════════════════════════════════
  async delete(request, response) {
    const { id } = request.params;

    try {
      const cor = await connection(TABELA).where("id", id).first();

      if (!cor) {
        return response.status(404).json({
          error: "Cor não encontrada.",
          code: "NOT_FOUND",
        });
      }

      await connection(TABELA).where("id", id).delete();

      return response.status(204).send();
    } catch (error) {
      console.error("❌ Erro ao deletar cor:", error);
      return response.status(500).json({
        error: "Erro ao deletar cor.",
        code: "DELETE_ERROR",
      });
    }
  },
};
