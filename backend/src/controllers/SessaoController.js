const connection = require("../database/connection");

module.exports = {
  async create(request, response) {
    const { id } = request.body;

    const usuario = await connection("usuarios")
      .where("id", id)
      .select("nome", "setor_id")
      .first();

    if (!usuario) {
      return response
        .status(400)
        .json({ error: "Nenhum CADASTRO encontrado com este ID" });
    }

    // Buscar papéis do usuário para determinar se é admin
    const papeis = await connection("usuarios_papeis")
      .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
      .where("usuarios_papeis.usuario_id", id)
      .pluck("papeis.nome");

    const isAdmin = Array.isArray(papeis) && papeis.includes("ADMIN");

    return response.json({
      name: usuario.nome,
      isAdmin,
      papeis,
      setor_id: usuario.setor_id,
      token: id,
    });
  },

  // NOVA FUNÇÃO: recuperar ID por email e data de nascimento
  async recuperarId(request, response) {
    const { email, data_nascimento } = request.body;

    try {
      const usuario = await connection("usuarios")
        .where({ email, nascimento: data_nascimento })
        .select("id")
        .first();

      if (!usuario) {
        return response.status(404).json({ error: "Usuário não encontrado." });
      }

      return response.json({ id: usuario.id });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Erro ao recuperar ID." });
    }
  },
};
