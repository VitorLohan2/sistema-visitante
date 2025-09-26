const connection = require('../database/connection');

module.exports = {
  async index(request, response) {
    const responsaveis = await connection('responsaveis')
    .select('*')
    .orderBy('nome', 'asc'); // Ordena pelo campo "nome" em ordem alfabética
    return response.json(responsaveis);
  }
};
