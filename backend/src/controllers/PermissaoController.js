// controllers/PermissaoController.js
const connection = require("../database/connection");

module.exports = {
  /**
   * Lista todas as permissões
   */
  async index(req, res) {
    try {
      const permissoes = await connection("permissoes")
        .select("id", "chave", "descricao")
        .orderBy("chave");

      return res.json(permissoes);
    } catch (err) {
      console.error("Erro ao listar permissões:", err);
      return res.status(500).json({ error: "Erro ao listar permissões" });
    }
  },

  /**
   * Busca uma permissão por ID
   */
  async show(req, res) {
    const { id } = req.params;

    try {
      const permissao = await connection("permissoes").where("id", id).first();

      if (!permissao) {
        return res.status(404).json({ error: "Permissão não encontrada" });
      }

      return res.json(permissao);
    } catch (err) {
      console.error("Erro ao buscar permissão:", err);
      return res.status(500).json({ error: "Erro ao buscar permissão" });
    }
  },

  /**
   * Cria uma nova permissão
   */
  async create(req, res) {
    const { chave, descricao } = req.body;

    if (!chave) {
      return res
        .status(400)
        .json({ error: "Chave da permissão é obrigatória" });
    }

    try {
      // Verificar se já existe
      const existe = await connection("permissoes")
        .where("chave", chave.toLowerCase())
        .first();

      if (existe) {
        return res.status(400).json({ error: "Permissão já existe" });
      }

      const [permissao] = await connection("permissoes")
        .insert({
          chave: chave.toLowerCase(),
          descricao,
        })
        .returning(["id", "chave", "descricao"]);

      return res.status(201).json(permissao);
    } catch (err) {
      console.error("Erro ao criar permissão:", err);
      return res.status(500).json({ error: "Erro ao criar permissão" });
    }
  },

  /**
   * Atualiza uma permissão
   */
  async update(req, res) {
    const { id } = req.params;
    const { chave, descricao } = req.body;

    try {
      const permissao = await connection("permissoes").where("id", id).first();

      if (!permissao) {
        return res.status(404).json({ error: "Permissão não encontrada" });
      }

      const updateData = {};
      if (chave) updateData.chave = chave.toLowerCase();
      if (descricao !== undefined) updateData.descricao = descricao;

      await connection("permissoes").where("id", id).update(updateData);

      const permissaoAtualizada = await connection("permissoes")
        .where("id", id)
        .first();

      return res.json(permissaoAtualizada);
    } catch (err) {
      console.error("Erro ao atualizar permissão:", err);
      return res.status(500).json({ error: "Erro ao atualizar permissão" });
    }
  },

  /**
   * Remove uma permissão
   */
  async delete(req, res) {
    const { id } = req.params;

    try {
      const permissao = await connection("permissoes").where("id", id).first();

      if (!permissao) {
        return res.status(404).json({ error: "Permissão não encontrada" });
      }

      await connection("permissoes").where("id", id).delete();

      return res.status(204).send();
    } catch (err) {
      console.error("Erro ao deletar permissão:", err);
      return res.status(500).json({ error: "Erro ao deletar permissão" });
    }
  },

  /**
   * Lista permissões agrupadas por módulo
   */
  async listarPorModulo(req, res) {
    try {
      const permissoes = await connection("permissoes")
        .select("id", "chave", "descricao")
        .orderBy("chave");

      // Agrupar por módulo (prefixo antes do _)
      const agrupado = permissoes.reduce((acc, perm) => {
        const modulo = perm.chave.split("_")[0];
        if (!acc[modulo]) {
          acc[modulo] = [];
        }
        acc[modulo].push(perm);
        return acc;
      }, {});

      return res.json(agrupado);
    } catch (err) {
      console.error("Erro ao listar permissões por módulo:", err);
      return res.status(500).json({ error: "Erro ao listar permissões" });
    }
  },
};
