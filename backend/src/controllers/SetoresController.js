const connection = require('../database/connection');

module.exports = {
  async index(request, response) {
    try {
      const setores = await connection('setores')
        .select('id', 'nome')
        .orderBy('nome');

      return response.json(setores);
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
      return response.status(500).json({ error: 'Erro ao buscar setores.' });
    }
  }
};
