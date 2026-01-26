const connection = require("../database/connection");

module.exports = {
  async index(request, response) {
    try {
      const setoresVisitantes = await connection("setor_visitante")
        .select("id", "nome")
        .orderBy("nome");

      return response.json(setoresVisitantes);
    } catch (error) {
      console.error("Erro ao buscar setores de visitantes:", error);
      return response
        .status(500)
        .json({ error: "Erro ao buscar setores de visitantes." });
    }
  },
};
