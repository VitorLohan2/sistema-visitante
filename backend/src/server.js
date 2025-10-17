const app = require('./app');

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

const getEnvDisplay = () => {
  if (NODE_ENV.includes('production')) {
    return { emoji: '🚀', name: 'PRODUÇÃO', externalPort: 3707 };
  } else if (NODE_ENV === 'docker') {
    return { emoji: '🐳', name: 'DOCKER', externalPort: 3001 };
  } else {
    return { emoji: '🛠️', name: 'DESENVOLVIMENTO', externalPort: 3001 };
  }
};

const env = getEnvDisplay();

app.listen(PORT, () => {
  console.log(`\n${env.emoji} === AMBIENTE ${env.name} ===`);
  console.log(`📡 Porta interna: ${PORT}`);
  console.log(`🌍 Acesso externo: http://localhost:${env.externalPort}`);
  console.log(`⚡ Modo: ${NODE_ENV}\n`);
});


// app.listen(PORT, () => {
//   console.log(`🚀 Servidor rodando na porta ${PORT}`);
// });
