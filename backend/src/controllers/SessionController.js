const connection = require('../database/connection');

module.exports = {
  async create(request, response) {
    const { id } = request.body;

    const ong = await connection('ongs')
      .where('id', id)
      .select('name', 'type')
      .first();

    if (!ong) {
      return response.status(400).json({ error: 'Nenhum CADASTRO encontrado com este ID' });
    }

    return response.json({
      name: ong.name,
      type: ong.type
    });
  },

  // NOVA FUNÇÃO: recuperar ID por email e data de nascimento
  async recuperarId(request, response) {
    const { email, data_nascimento } = request.body;

    try {
      const usuario = await connection('ongs')
        .where({ email, birthdate: data_nascimento })
        .select('id')
        .first();

      if (!usuario) {
        return response.status(404).json({ error: 'Usuário não encontrado.' });
      }

      return response.json({ id: usuario.id });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: 'Erro ao recuperar ID.' });
    }
  }
};
