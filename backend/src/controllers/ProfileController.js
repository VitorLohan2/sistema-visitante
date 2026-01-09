const connection = require("../database/connection");

module.exports = {
  async index(request, response) {
    // Buscar todos os registros, independentemente do usuario_id
    const incidents = await connection("cadastro_visitantes").select("*");

    return response.json(incidents);
  },
};
