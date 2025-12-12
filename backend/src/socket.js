// backend/src/socket.js
let io;

function init(server) {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Novo socket conectado:", socket.id);

    const ongId = socket.handshake.query?.ongId;
    console.log("📋 Query handshake:", socket.handshake.query);
    console.log("🆔 ongId recebido:", ongId);

    if (ongId) {
      // Entra na sala GLOBAL compartilhada
      socket.join("global");
      console.log(`🌐 Socket ${socket.id} entrou na sala GLOBAL`);

      // Log das salas atuais
      setTimeout(() => {
        console.log("📊 Salas disponíveis:", Array.from(socket.rooms));
      }, 100);
    }

    // Teste agora na sala global
    setTimeout(() => {
      io.to("global").emit("teste:conexao", {
        mensagem: "Socket funcionando na sala GLOBAL!",
        sala: "global",
      });
      console.log(`🧪 Evento de teste enviado para sala GLOBAL`);
    }, 3000);

    socket.on("disconnect", () => {
      console.log("🔴 Socket desconectado:", socket.id);
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error("Socket.IO não inicializado! Chame init(server) primeiro.");
  }
  return io;
}

module.exports = { init, getIo };
