const connection = require('./src/database/connection'); // ajuste o caminho se necessário

connection('ongs')
  .select('*')
  .then((res) => {
    console.log('ONGS encontradas:', res);
  })
  .catch((err) => {
    console.error('Erro ao buscar ONGs:', err);
  });
