const connection = require('../database/connection');

module.exports = {
  async index(request, response) {
    try {
      const empresas = await connection('empresas')
        .select('id', 'nome')
        .orderBy('nome');

      return response.json(empresas);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      return response.status(500).json({ error: 'Erro ao buscar empresas.' });
    }
  }
};
