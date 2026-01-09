// controllers/UsuarioPapelController.js
const connection = require("../database/connection");
const { getUsuarioId } = require("../utils/authHelper");

module.exports = {
  /**
   * Lista todos os usuários com seus papéis
   */
  async index(req, res) {
    try {
      const usuarios = await connection("usuarios")
        .select("id", "name", "email", "setor_id")
        .orderBy("name");

      // Para cada usuário, buscar seus papéis
      const usuariosComPapeis = await Promise.all(
        usuarios.map(async (usuario) => {
          const papeis = await connection("usuarios_papeis")
            .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
            .where("usuarios_papeis.usuario_id", usuario.id)
            .select("papeis.id", "papeis.nome", "papeis.descricao");

          return { ...usuario, papeis };
        })
      );

      return res.json(usuariosComPapeis);
    } catch (err) {
      console.error("Erro ao listar usuários com papéis:", err);
      return res.status(500).json({ error: "Erro ao listar usuários" });
    }
  },

  /**
   * Busca papéis de um usuário específico
   */
  async show(req, res) {
    const { usuario_id } = req.params;

    try {
      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .select("id", "name", "email")
        .first();

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const papeis = await connection("usuarios_papeis")
        .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
        .where("usuarios_papeis.usuario_id", usuario_id)
        .select("papeis.id", "papeis.nome", "papeis.descricao");

      return res.json({ ...usuario, papeis });
    } catch (err) {
      console.error("Erro ao buscar papéis do usuário:", err);
      return res
        .status(500)
        .json({ error: "Erro ao buscar papéis do usuário" });
    }
  },

  /**
   * Atribui papéis a um usuário
   */
  async atribuirPapeis(req, res) {
    const { usuario_id } = req.params;
    const { papel_ids } = req.body;

    if (!Array.isArray(papel_ids)) {
      return res.status(400).json({ error: "papel_ids deve ser um array" });
    }

    try {
      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .first();

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Remover papéis antigos
      await connection("usuarios_papeis")
        .where("usuario_id", usuario_id)
        .delete();

      // Inserir novos papéis
      if (papel_ids.length > 0) {
        const insercoes = papel_ids.map((papel_id) => ({
          usuario_id,
          papel_id: parseInt(papel_id),
        }));

        await connection("usuarios_papeis").insert(insercoes);
      }

      // Retornar usuário com papéis atualizados
      const papeis = await connection("usuarios_papeis")
        .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
        .where("usuarios_papeis.usuario_id", usuario_id)
        .select("papeis.id", "papeis.nome", "papeis.descricao");

      return res.json({
        id: usuario.id,
        name: usuario.name,
        email: usuario.email,
        papeis,
      });
    } catch (err) {
      console.error("Erro ao atribuir papéis:", err);
      return res.status(500).json({ error: "Erro ao atribuir papéis" });
    }
  },

  /**
   * Busca todas as permissões de um usuário (através dos papéis)
   */
  async buscarPermissoes(req, res) {
    const { usuario_id } = req.params;

    try {
      // Buscar permissões através dos papéis do usuário
      const permissoes = await connection("usuarios_papeis")
        .join(
          "papeis_permissoes",
          "usuarios_papeis.papel_id",
          "papeis_permissoes.papel_id"
        )
        .join("permissoes", "papeis_permissoes.permissao_id", "permissoes.id")
        .where("usuarios_papeis.usuario_id", usuario_id)
        .distinct("permissoes.chave")
        .select("permissoes.id", "permissoes.chave", "permissoes.descricao");

      return res.json(permissoes);
    } catch (err) {
      console.error("Erro ao buscar permissões:", err);
      return res.status(500).json({ error: "Erro ao buscar permissões" });
    }
  },

  /**
   * Busca minhas permissões (usuário logado)
   */
  async minhasPermissoes(req, res) {
    const usuario_id = getUsuarioId(req);

    if (!usuario_id) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    try {
      // Buscar papéis do usuário
      const papeis = await connection("usuarios_papeis")
        .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
        .where("usuarios_papeis.usuario_id", usuario_id)
        .select("papeis.id", "papeis.nome");

      // Buscar permissões através dos papéis
      const permissoes = await connection("usuarios_papeis")
        .join(
          "papeis_permissoes",
          "usuarios_papeis.papel_id",
          "papeis_permissoes.papel_id"
        )
        .join("permissoes", "papeis_permissoes.permissao_id", "permissoes.id")
        .where("usuarios_papeis.usuario_id", usuario_id)
        .distinct("permissoes.chave")
        .pluck("permissoes.chave");

      return res.json({
        papeis: papeis.map((p) => p.nome),
        permissoes,
      });
    } catch (err) {
      console.error("Erro ao buscar minhas permissões:", err);
      return res.status(500).json({ error: "Erro ao buscar permissões" });
    }
  },
};
