// Carregar variáveis de ambiente PRIMEIRO
require("./config/env");

const http = require("http");
const app = require("./app");
const {
  init,
  initVisitorNamespace,
  initSuporteNamespace,
} = require("./socket");

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "desenvolvimento";

const getEnvDisplay = () => {
  const configs = {
    // Nomes em português
    producao: {
      emoji: "🚀",
      name: "PRODUÇÃO",
      color: "\x1b[31m", // Vermelho
      externalPort: 3707,
    },
    teste: {
      emoji: "🧪",
      name: "TESTE (STAGING)",
      color: "\x1b[33m", // Amarelo
      externalPort: 3707,
    },
    desenvolvimento: {
      emoji: "🛠️",
      name: "DESENVOLVIMENTO",
      color: "\x1b[36m", // Ciano
      externalPort: 3001,
    },
    // Compatibilidade com nomes antigos
    production: {
      emoji: "🚀",
      name: "PRODUÇÃO",
      color: "\x1b[31m",
      externalPort: 3707,
    },
    production_local: {
      emoji: "🚀",
      name: "PRODUÇÃO",
      color: "\x1b[31m",
      externalPort: 3707,
    },
    docker: {
      emoji: "🛠️",
      name: "DESENVOLVIMENTO",
      color: "\x1b[36m",
      externalPort: 3001,
    },
    development: {
      emoji: "🛠️",
      name: "DESENVOLVIMENTO",
      color: "\x1b[36m",
      externalPort: 3001,
    },
  };

  return configs[NODE_ENV] || configs.desenvolvimento;
};

const env = getEnvDisplay();
const reset = "\x1b[0m";

// 🔥 Criar servidor HTTP real
const server = http.createServer(app);

// 🔥 Inicializar socket IO ligado ao mesmo servidor
init(server);

// 🔥 Inicializar namespace para visitantes (chat sem autenticação)
initVisitorNamespace();

// 🔥 Inicializar namespace para suporte (chat com autenticação)
initSuporteNamespace();

// 🔥 Agora usamos server.listen (não app.listen!)
server.listen(PORT, () => {
  console.log(`\n${"═".repeat(70)}`);
  console.log(
    `${env.color}${env.emoji}  SERVIDOR BACKEND - ${env.name}${reset}`,
  );
  console.log(`${"═".repeat(70)}`);
  console.log(`📡 Porta interna:  ${PORT}`);
  console.log(`🌍 Acesso externo: http://localhost:${env.externalPort}`);
  console.log(`⚙️  Ambiente:       ${NODE_ENV}`);
  console.log(
    `🗄️  Banco de dados: ${process.env.DB_NAME_DOCKER || process.env.DB_NAME || "configurado"}`,
  );

  // Aviso de segurança para produção
  if (
    (NODE_ENV === "production" || NODE_ENV === "production_local") &&
    process.env.ALLOWED_ORIGINS?.includes("localhost")
  ) {
    console.log(`\n⚠️  ${"\x1b[33m"}AVISO DE SEGURANÇA:${reset}`);
    console.log(
      `⚠️  ${"\x1b[33m"}localhost está habilitado no CORS de PRODUÇÃO${reset}`,
    );
    console.log(
      `⚠️  ${"\x1b[33m"}Você está acessando o BANCO DE DADOS REAL!${reset}`,
    );
    console.log(
      `⚠️  ${"\x1b[33m"}Cuidado com alterações - elas afetarão dados reais!${reset}\n`,
    );
  }

  console.log(`${"═".repeat(70)}\n`);
});
