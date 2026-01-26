/**
 * VeiculoVisitanteController
 * Gerencia veículos dos visitantes (com relacionamentos)
 */

const connection = require("../database/connection");

const TABELA = "veiculo_visitante";

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // LISTAR TODOS OS VEÍCULOS
  // GET /veiculos-visitantes
  // ═══════════════════════════════════════════════════════════════
  async index(request, response) {
    try {
      const veiculos = await connection(TABELA)
        .leftJoin(
          "cor_veiculo_visitante",
          "cor_veiculo_visitante.id",
          "=",
          `${TABELA}.cor_veiculo_visitante_id`
        )
        .leftJoin(
          "tipo_veiculo_visitante",
          "tipo_veiculo_visitante.id",
          "=",
          `${TABELA}.tipo_veiculo_visitante_id`
        )
        .select(
          `${TABELA}.id`,
          `${TABELA}.visitante_id`,
          `${TABELA}.placa_veiculo`,
          `${TABELA}.cor_veiculo_visitante_id`,
          `${TABELA}.tipo_veiculo_visitante_id`,
          "cor_veiculo_visitante.nome as cor_veiculo",
          "tipo_veiculo_visitante.nome as tipo_veiculo"
        )
        .orderBy(`${TABELA}.id`, "desc");

      return response.json(veiculos);
    } catch (error) {
      console.error("❌ Erro ao listar veículos:", error);
      return response.status(500).json({
        error: "Erro ao listar veículos.",
        code: "LIST_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR VEÍCULO POR ID
  // GET /veiculos-visitantes/:id
  // ═══════════════════════════════════════════════════════════════
  async show(request, response) {
    const { id } = request.params;

    try {
      const veiculo = await connection(TABELA)
        .leftJoin(
          "cor_veiculo_visitante",
          "cor_veiculo_visitante.id",
          "=",
          `${TABELA}.cor_veiculo_visitante_id`
        )
        .leftJoin(
          "tipo_veiculo_visitante",
          "tipo_veiculo_visitante.id",
          "=",
          `${TABELA}.tipo_veiculo_visitante_id`
        )
        .where(`${TABELA}.id`, id)
        .select(
          `${TABELA}.id`,
          `${TABELA}.visitante_id`,
          `${TABELA}.placa_veiculo`,
          `${TABELA}.cor_veiculo_visitante_id`,
          `${TABELA}.tipo_veiculo_visitante_id`,
          "cor_veiculo_visitante.nome as cor_veiculo",
          "tipo_veiculo_visitante.nome as tipo_veiculo"
        )
        .first();

      if (!veiculo) {
        return response.status(404).json({
          error: "Veículo não encontrado.",
          code: "NOT_FOUND",
        });
      }

      return response.json(veiculo);
    } catch (error) {
      console.error("❌ Erro ao buscar veículo:", error);
      return response.status(500).json({
        error: "Erro ao buscar veículo.",
        code: "SHOW_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR VEÍCULO POR VISITANTE
  // GET /veiculos-visitantes/visitante/:visitanteId
  // ═══════════════════════════════════════════════════════════════
  async showByVisitante(request, response) {
    const { visitanteId } = request.params;

    try {
      const veiculo = await connection(TABELA)
        .leftJoin(
          "cor_veiculo_visitante",
          "cor_veiculo_visitante.id",
          "=",
          `${TABELA}.cor_veiculo_visitante_id`
        )
        .leftJoin(
          "tipo_veiculo_visitante",
          "tipo_veiculo_visitante.id",
          "=",
          `${TABELA}.tipo_veiculo_visitante_id`
        )
        .where(`${TABELA}.visitante_id`, visitanteId)
        .select(
          `${TABELA}.id`,
          `${TABELA}.visitante_id`,
          `${TABELA}.placa_veiculo`,
          `${TABELA}.cor_veiculo_visitante_id`,
          `${TABELA}.tipo_veiculo_visitante_id`,
          "cor_veiculo_visitante.nome as cor_veiculo",
          "tipo_veiculo_visitante.nome as tipo_veiculo"
        )
        .first();

      return response.json(veiculo || null);
    } catch (error) {
      console.error("❌ Erro ao buscar veículo do visitante:", error);
      return response.status(500).json({
        error: "Erro ao buscar veículo do visitante.",
        code: "SHOW_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // CRIAR OU ATUALIZAR VEÍCULO DO VISITANTE
  // POST /veiculos-visitantes
  // ═══════════════════════════════════════════════════════════════
  async createOrUpdate(request, response) {
    const {
      visitante_id,
      placa_veiculo,
      cor_veiculo_visitante_id,
      tipo_veiculo_visitante_id,
    } = request.body;

    try {
      // Verifica se já existe veículo para o visitante
      const veiculoExistente = await connection(TABELA)
        .where("visitante_id", visitante_id)
        .first();

      if (veiculoExistente) {
        // Atualiza
        await connection(TABELA).where("visitante_id", visitante_id).update({
          placa_veiculo,
          cor_veiculo_visitante_id,
          tipo_veiculo_visitante_id,
        });

        return response.json({
          id: veiculoExistente.id,
          message: "Veículo atualizado com sucesso.",
        });
      } else {
        // Cria novo
        const [veiculo] = await connection(TABELA)
          .insert({
            visitante_id,
            placa_veiculo,
            cor_veiculo_visitante_id,
            tipo_veiculo_visitante_id,
          })
          .returning("id");

        return response.status(201).json({
          id: veiculo.id,
          message: "Veículo criado com sucesso.",
        });
      }
    } catch (error) {
      console.error("❌ Erro ao criar/atualizar veículo:", error);
      return response.status(500).json({
        error: "Erro ao criar/atualizar veículo.",
        code: "CREATE_UPDATE_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DELETAR VEÍCULO
  // DELETE /veiculos-visitantes/:id
  // ═══════════════════════════════════════════════════════════════
  async delete(request, response) {
    const { id } = request.params;

    try {
      const veiculo = await connection(TABELA).where("id", id).first();

      if (!veiculo) {
        return response.status(404).json({
          error: "Veículo não encontrado.",
          code: "NOT_FOUND",
        });
      }

      await connection(TABELA).where("id", id).delete();

      return response.status(204).send();
    } catch (error) {
      console.error("❌ Erro ao deletar veículo:", error);
      return response.status(500).json({
        error: "Erro ao deletar veículo.",
        code: "DELETE_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DELETAR VEÍCULO POR VISITANTE
  // DELETE /veiculos-visitantes/visitante/:visitanteId
  // ═══════════════════════════════════════════════════════════════
  async deleteByVisitante(request, response) {
    const { visitanteId } = request.params;

    try {
      await connection(TABELA).where("visitante_id", visitanteId).delete();

      return response.status(204).send();
    } catch (error) {
      console.error("❌ Erro ao deletar veículo do visitante:", error);
      return response.status(500).json({
        error: "Erro ao deletar veículo do visitante.",
        code: "DELETE_ERROR",
      });
    }
  },
};
