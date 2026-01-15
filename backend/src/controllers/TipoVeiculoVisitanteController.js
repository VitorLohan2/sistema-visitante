/**
 * TipoVeiculoVisitanteController
 * Gerencia tipos de veículos dos visitantes (Caminhão, Van, etc.)
 */

const connection = require("../database/connection");

const TABELA = "tipo_veiculo_visitante";

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // LISTAR TODOS OS TIPOS
  // GET /tipos-veiculos-visitantes
  // ═══════════════════════════════════════════════════════════════
  async index(request, response) {
    try {
      const tipos = await connection(TABELA)
        .select("id", "nome")
        .orderBy("nome", "asc");

      return response.json(tipos);
    } catch (error) {
      console.error("❌ Erro ao listar tipos de veículos:", error);
      return response.status(500).json({
        error: "Erro ao listar tipos de veículos.",
        code: "LIST_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR TIPO POR ID
  // GET /tipos-veiculos-visitantes/:id
  // ═══════════════════════════════════════════════════════════════
  async show(request, response) {
    const { id } = request.params;

    try {
      const tipo = await connection(TABELA).where("id", id).first();

      if (!tipo) {
        return response.status(404).json({
          error: "Tipo de veículo não encontrado.",
          code: "NOT_FOUND",
        });
      }

      return response.json(tipo);
    } catch (error) {
      console.error("❌ Erro ao buscar tipo de veículo:", error);
      return response.status(500).json({
        error: "Erro ao buscar tipo de veículo.",
        code: "SHOW_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // CRIAR NOVO TIPO
  // POST /tipos-veiculos-visitantes
  // ═══════════════════════════════════════════════════════════════
  async create(request, response) {
    const { nome } = request.body;

    try {
      const [tipo] = await connection(TABELA)
        .insert({ nome })
        .returning(["id", "nome"]);

      return response.status(201).json(tipo);
    } catch (error) {
      console.error("❌ Erro ao criar tipo de veículo:", error);
      return response.status(500).json({
        error: "Erro ao criar tipo de veículo.",
        code: "CREATE_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ATUALIZAR TIPO
  // PUT /tipos-veiculos-visitantes/:id
  // ═══════════════════════════════════════════════════════════════
  async update(request, response) {
    const { id } = request.params;
    const { nome } = request.body;

    try {
      const tipo = await connection(TABELA).where("id", id).first();

      if (!tipo) {
        return response.status(404).json({
          error: "Tipo de veículo não encontrado.",
          code: "NOT_FOUND",
        });
      }

      await connection(TABELA).where("id", id).update({ nome });

      return response.json({
        id,
        nome,
        message: "Tipo de veículo atualizado com sucesso.",
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar tipo de veículo:", error);
      return response.status(500).json({
        error: "Erro ao atualizar tipo de veículo.",
        code: "UPDATE_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DELETAR TIPO
  // DELETE /tipos-veiculos-visitantes/:id
  // ═══════════════════════════════════════════════════════════════
  async delete(request, response) {
    const { id } = request.params;

    try {
      const tipo = await connection(TABELA).where("id", id).first();

      if (!tipo) {
        return response.status(404).json({
          error: "Tipo de veículo não encontrado.",
          code: "NOT_FOUND",
        });
      }

      await connection(TABELA).where("id", id).delete();

      return response.status(204).send();
    } catch (error) {
      console.error("❌ Erro ao deletar tipo de veículo:", error);
      return response.status(500).json({
        error: "Erro ao deletar tipo de veículo.",
        code: "DELETE_ERROR",
      });
    }
  },
};
