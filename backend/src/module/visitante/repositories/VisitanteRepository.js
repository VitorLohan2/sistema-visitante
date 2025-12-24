const connection = require("../../database/connection");

module.exports = {
  count() {
    return connection("incidents").count();
  },

  list(page) {
    return connection("incidents")
      .leftJoin(
        "empresas_visitantes",
        "empresas_visitantes.id",
        "=",
        "incidents.empresa_id"
      )
      .leftJoin(
        "setores_visitantes",
        "setores_visitantes.id",
        "=",
        "incidents.setor_id"
      )
      .join("ongs", "ongs.id", "=", "incidents.ong_id")
      .limit(5)
      .offset((page - 1) * 5)
      .select([
        "incidents.*",
        "empresas_visitantes.nome as empresa_nome",
        "setores_visitantes.nome as setor_nome",
        "ongs.name",
      ]);
  },

  create(data) {
    return connection("incidents").insert(data).returning("id");
  },

  findById(id) {
    return connection("incidents").where("id", id).first();
  },

  update(id, data) {
    return connection("incidents").where("id", id).update(data);
  },

  delete(id) {
    return connection("incidents").where("id", id).delete();
  },

  search(query) {
    return connection("incidents")
      .where(function () {
        this.where("nome", "ILIKE", `%${query}%`).orWhere(
          "cpf",
          "ILIKE",
          `%${query}%`
        );
      })
      .select([
        "id",
        "nome",
        "cpf",
        "telefone",
        "nascimento",
        "empresa_id",
        "setor_id",
        "avatar_imagem",
        "bloqueado",
        "ong_id",
        "placa_veiculo",
        "cor_veiculo",
      ]);
  },
};
