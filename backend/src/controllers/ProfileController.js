const connection = require('../database/connection');

module.exports = {
  async index(request, response) {
    // Você ainda pode manter o ong_id caso precise identificar o usuário logado
    const ong_id = request.headers.authorization;

    // Buscar todos os registros, independentemente do ong_id
    const incidents = await connection('incidents').select('*');

    return response.json(incidents);
  }
};
