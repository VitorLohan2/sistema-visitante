const connection = require('../database/connection');

module.exports = {
  async index(request, response) {
    try {
      const empresasVisitantes = await connection('empresas_visitantes')
        .select('id', 'nome')
        .orderBy('nome');

      return response.json(empresasVisitantes);
    } catch (error) {
      console.error('Erro ao buscar empresas de visitantes:', error);
      return response.status(500).json({ error: 'Erro ao buscar empresas de visitantes.' });
    }
  }
};