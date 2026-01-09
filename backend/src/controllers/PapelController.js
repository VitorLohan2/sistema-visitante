// controllers/PapelController.js
const connection = require("../database/connection");
const { getUsuarioId } = require("../utils/authHelper");

module.exports = {
  /**
   * Lista todos os papéis
   */
  async index(req, res) {
    try {
      const papeis = await connection("papeis")
        .select("id", "nome", "descricao")
        .orderBy("nome");

      return res.json(papeis);
    } catch (err) {
      console.error("Erro ao listar papéis:", err);
      return res.status(500).json({ error: "Erro ao listar papéis" });
    }
  },

  /**
   * Busca um papel por ID com suas permissões
   */
  async show(req, res) {
    const { id } = req.params;

    try {
      const papel = await connection("papeis").where("id", id).first();

      if (!papel) {
        return res.status(404).json({ error: "Papel não encontrado" });
      }

      // Buscar permissões do papel
      const permissoes = await connection("papeis_permissoes")
        .join("permissoes", "papeis_permissoes.permissao_id", "permissoes.id")
        .where("papeis_permissoes.papel_id", id)
        .select("permissoes.id", "permissoes.chave", "permissoes.descricao");

      return res.json({ ...papel, permissoes });
    } catch (err) {
      console.error("Erro ao buscar papel:", err);
      return res.status(500).json({ error: "Erro ao buscar papel" });
    }
  },

  /**
   * Cria um novo papel
   */
  async create(req, res) {
    const { nome, descricao } = req.body;

    if (!nome) {
      return res.status(400).json({ error: "Nome do papel é obrigatório" });
    }

    try {
      // Verificar se já existe
      const existe = await connection("papeis")
        .where("nome", nome.toUpperCase())
        .first();

      if (existe) {
        return res.status(400).json({ error: "Papel já existe" });
      }

      const [papel] = await connection("papeis")
        .insert({
          nome: nome.toUpperCase(),
          descricao,
        })
        .returning(["id", "nome", "descricao"]);

      return res.status(201).json(papel);
    } catch (err) {
      console.error("Erro ao criar papel:", err);
      return res.status(500).json({ error: "Erro ao criar papel" });
    }
  },

  /**
   * Atualiza um papel
   */
  async update(req, res) {
    const { id } = req.params;
    const { nome, descricao } = req.body;

    try {
      const papel = await connection("papeis").where("id", id).first();

      if (!papel) {
        return res.status(404).json({ error: "Papel não encontrado" });
      }

      const updateData = {};
      if (nome) updateData.nome = nome.toUpperCase();
      if (descricao !== undefined) updateData.descricao = descricao;

      await connection("papeis").where("id", id).update(updateData);

      const papelAtualizado = await connection("papeis")
        .where("id", id)
        .first();

      return res.json(papelAtualizado);
    } catch (err) {
      console.error("Erro ao atualizar papel:", err);
      return res.status(500).json({ error: "Erro ao atualizar papel" });
    }
  },

  /**
   * Remove um papel
   */
  async delete(req, res) {
    const { id } = req.params;

    try {
      const papel = await connection("papeis").where("id", id).first();

      if (!papel) {
        return res.status(404).json({ error: "Papel não encontrado" });
      }

      // Não permitir deletar ADMIN
      if (papel.nome === "ADMIN") {
        return res
          .status(400)
          .json({ error: "Não é possível deletar o papel ADMIN" });
      }

      await connection("papeis").where("id", id).delete();

      return res.status(204).send();
    } catch (err) {
      console.error("Erro ao deletar papel:", err);
      return res.status(500).json({ error: "Erro ao deletar papel" });
    }
  },

  /**
   * Atribuir permissões a um papel
   */
  async atribuirPermissoes(req, res) {
    const { id } = req.params;
    const { permissao_ids } = req.body;

    if (!Array.isArray(permissao_ids)) {
      return res.status(400).json({ error: "permissao_ids deve ser um array" });
    }

    try {
      const papel = await connection("papeis").where("id", id).first();

      if (!papel) {
        return res.status(404).json({ error: "Papel não encontrado" });
      }

      // Remover permissões antigas
      await connection("papeis_permissoes").where("papel_id", id).delete();

      // Inserir novas permissões
      if (permissao_ids.length > 0) {
        const insercoes = permissao_ids.map((permissao_id) => ({
          papel_id: parseInt(id),
          permissao_id: parseInt(permissao_id),
        }));

        await connection("papeis_permissoes").insert(insercoes);
      }

      // Retornar papel atualizado com permissões
      const permissoes = await connection("papeis_permissoes")
        .join("permissoes", "papeis_permissoes.permissao_id", "permissoes.id")
        .where("papeis_permissoes.papel_id", id)
        .select("permissoes.id", "permissoes.chave", "permissoes.descricao");

      return res.json({ ...papel, permissoes });
    } catch (err) {
      console.error("Erro ao atribuir permissões:", err);
      return res.status(500).json({ error: "Erro ao atribuir permissões" });
    }
  },
};
