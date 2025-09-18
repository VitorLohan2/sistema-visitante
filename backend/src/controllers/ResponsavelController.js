const connection = require('../database/connection');

module.exports = {
  async index(request, response) {
    const responsaveis = await connection('responsaveis').select('*');
    return response.json(responsaveis);
  }
};
