const connection = require("./src/database/connection"); // ajuste o caminho se necessário

connection("usuarios")
  .select("*")
  .then((res) => {
    console.log("USUARIOS encontradas:", res);
  })
  .catch((err) => {
    console.error("Erro ao buscar USUARIOS:", err);
  });
