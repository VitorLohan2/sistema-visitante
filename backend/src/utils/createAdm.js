const path = require("path");
const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: path.resolve(__dirname, "../../src/database/db.sqlite"),
  },
  useNullAsDefault: true,
});
const generateUniqueId = require("./generateUniqueId");

async function createAdm() {
  const admData = {
    id: generateUniqueId(),
    nome: "VITOR MATOS",
    nascimento: "1998-08-06",
    cpf: "16677655520", // SEM pontuação (11 dígitos)
    empresa: "DIME",
    setor: "TI",
    email: "vitorlohan@email.com",
    whatsapp: "21983867486", // SEM formatação
    cidade: "Rio de Janeiro",
    uf: "RJ",
    type: "ADM", // Maiúsculo para match exato
  };

  try {
    // Verificação de duplicidade
    const exists = await knex("ongs")
      .where("cpf", admData.cpf)
      .orWhere("email", admData.email)
      .first();

    if (exists) {
      console.log("⛔ ADM já cadastrado com este CPF ou e-mail");
      return;
    }

    // Inserção com validação explícita
    await knex("ongs").insert(admData);

    // Verificação pós-inserção
    const createdAdm = await knex("ongs")
      .where("id", admData.id)
      .select("id", "nome", "type")
      .first();

    console.log("✅ ADM criado com sucesso!", {
      id: createdAdm.id,
      nome: createdAdm.nome,
      type: createdAdm.type,
    });
  } catch (error) {
    console.error("❌ Falha ao criar ADM:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
  } finally {
    await knex.destroy();
  }
}

createAdm();
