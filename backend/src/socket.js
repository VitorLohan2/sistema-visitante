// backend/src/socket.js
let io;

function init(server) {
  const { Server } = require("socket.io");
  const { verificarToken } = require("./utils/jwt");

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Novo socket conectado:", socket.id);

    // ✅ VALIDAR JWT - Busca em auth (preferencial) ou headers
    let token = socket.handshake.auth?.token;

    // Fallback para headers (caso venha de polling)
    if (!token) {
      token = socket.handshake.headers.authorization?.replace("Bearer ", "");
    }

    if (!token) {
      console.log("❌ Socket rejeitado: Sem token JWT");
      console.log("   - Auth:", socket.handshake.auth);
      console.log("   - Headers:", socket.handshake.headers.authorization);
      socket.disconnect(true);
      return;
    }

    try {
      const usuario = verificarToken(token);

      // ✅ ARMAZENAR DADOS DO USUÁRIO NO SOCKET
      socket.userId = usuario.id;
      socket.userName = usuario.nome;
      socket.userEmail = usuario.email;
      socket.isAdmin = usuario.isAdmin;
      socket.setorId = usuario.setor_id;
      socket.empresaId = usuario.empresa_id;

      console.log(`✅ Socket autenticado: ${usuario.nome} (${usuario.email})`);

      // Entra na sala GLOBAL compartilhada
      socket.join("global");
      console.log(`🌐 Socket ${socket.id} entrou na sala GLOBAL`);

      // Log das salas atuais
      setTimeout(() => {
        console.log("📊 Salas disponíveis:", Array.from(socket.rooms));
      }, 100);

      // ✅ BUSCAR TIPO DO USUÁRIO E ATUALIZAR EQUIPE ONLINE
      buscarTipoUsuarioEAtualizar(socket);
    } catch (error) {
      console.log(
        "❌ Socket rejeitado: Token inválido ou expirado",
        error.message
      );
      socket.disconnect(true);
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENTOS DO CHAT DE SUPORTE
    // ═══════════════════════════════════════════════════════════════

    // 👉 ENTRAR NA CONVERSA DE CHAT SUPORTE
    socket.on("chat-suporte:entrar", (conversa_id) => {
      socket.join(`conversa:${conversa_id}`);
      console.log(
        `💬 Socket ${socket.id} entrou na conversa de suporte ${conversa_id}`
      );
    });

    // 👉 SAIR DA CONVERSA DE CHAT SUPORTE
    socket.on("chat-suporte:sair", (conversa_id) => {
      socket.leave(`conversa:${conversa_id}`);
      console.log(
        `💬 Socket ${socket.id} saiu da conversa de suporte ${conversa_id}`
      );
    });

    // 👉 ATENDENTE ENTRA NA SALA DE ATENDENTES
    socket.on("chat-suporte:atendente-online", async () => {
      socket.join("atendentes");
      console.log(
        `👨‍💼 Atendente ${socket.userName} entrou na sala de atendentes`
      );

      // Emite atualização da fila para o novo atendente
      const FilaService = require("./services/ChatFilaService");
      const fila = await FilaService.listar();
      socket.emit("chat-suporte:fila-atualizada", { fila });
    });

    // 👉 ATENDENTE SAI DA SALA DE ATENDENTES
    socket.on("chat-suporte:atendente-offline", () => {
      socket.leave("atendentes");
      console.log(`👨‍💼 Atendente ${socket.userName} saiu da sala de atendentes`);
    });

    // 👉 DIGITANDO (usuário ou atendente)
    socket.on("chat-suporte:digitando", ({ conversa_id, nome }) => {
      socket.to(`conversa:${conversa_id}`).emit("chat-suporte:digitando", {
        conversa_id,
        nome,
      });
    });

    // 👉 PAROU DE DIGITAR
    socket.on("chat-suporte:parou-digitar", ({ conversa_id }) => {
      socket.to(`conversa:${conversa_id}`).emit("chat-suporte:parou-digitar", {
        conversa_id,
      });
    });

    // ═══════════════════════════════════════════════════════════════
    // EVENTOS LEGADOS (CHAT INTERNO)
    // ═══════════════════════════════════════════════════════════════

    // 👉 ENTRAR NA CONVERSA
    socket.on("entrar_conversa", (conversa_id) => {
      socket.join(`conversa:${conversa_id}`);
      console.log(`👥 Socket ${socket.id} entrou na conversa ${conversa_id}`);
    });

    // 👉 SAIR DA CONVERSA
    socket.on("sair_conversa", (conversa_id) => {
      socket.leave(`conversa:${conversa_id}`);
      console.log(`👤 Socket ${socket.id} saiu da conversa ${conversa_id}`);
    });

    // 🆕 SOLICITAR LISTA DE EQUIPE ONLINE
    socket.on("disconnect", async () => {
      console.log("🔴 Socket desconectado:", socket.id);

      // ✅ SE FOR ADMIN DE TI, ATUALIZAR EQUIPE ONLINE
      if (socket.isAdmin && socket.setorId === 7) {
        console.log(`➖ ADMIN de TI desconectou: ${socket.userName}`);

        // Emitir evento GENÉRICO que o frontend escuta
        io.to("global").emit("user:disconnected", {
          id: socket.userId,
          nome: socket.userName,
          isAdmin: socket.isAdmin,
          setorId: socket.setorId,
        });

        // Emitir evento específico da equipe
        io.to("global").emit("equipe:membro_desconectou", socket.userId);

        await emitirEquipeOnlineAtualizada();
      }
    });
  });

  return io;
}

// ✅ FUNÇÃO PARA ATUALIZAR EQUIPE ONLINE
async function buscarTipoUsuarioEAtualizar(socket) {
  try {
    // Os dados já estão no socket através do JWT validado
    // Apenas precisamos emitir eventos se for ADMIN de TI (setor_id = 7)

    if (socket.isAdmin && socket.setorId === 7) {
      console.log(`➕ ADMIN de TI conectou: ${socket.userName}`);

      // Emitir evento GENÉRICO que o frontend escuta
      io.to("global").emit("user:connected", {
        id: socket.userId,
        nome: socket.userName,
        email: socket.userEmail,
        isAdmin: socket.isAdmin,
        setorId: socket.setorId,
      });

      // Emitir evento específico da equipe
      io.to("global").emit("equipe:membro_conectou", {
        id: socket.userId,
        nome: socket.userName,
        email: socket.userEmail,
      });

      await emitirEquipeOnlineAtualizada();
    }
  } catch (error) {
    console.error("❌ Erro ao atualizar equipe online:", error);
  }
}

// ✅ ENVIAR LISTA DE EQUIPE ONLINE PARA UM SOCKET ESPECÍFICO
async function enviarEquipeOnlineParaSocket(socket) {
  try {
    const connection = require("./database/connection");

    // Buscar todos os ADMs do setor TI (setor_id = 7) via papéis
    const equipeADM = await connection("usuarios")
      .join("usuarios_papeis", "usuarios.id", "usuarios_papeis.usuario_id")
      .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
      .where("papeis.nome", "ADMIN")
      .where("usuarios.setor_id", 7)
      .select("usuarios.id", "usuarios.nome", "usuarios.email")
      .orderBy("usuarios.nome", "asc");

    // Verificar quais ADMINs de TI estão online
    const onlineUsers = [];

    if (io && io.sockets && io.sockets.sockets) {
      io.sockets.sockets.forEach((s) => {
        if (s.userId && s.isAdmin && s.setorId === 7) {
          if (!onlineUsers.find((u) => u.id === s.userId)) {
            const userInfo = equipeADM.find((u) => u.id === s.userId);
            if (userInfo) {
              onlineUsers.push({
                id: userInfo.id,
                nome: userInfo.nome,
                email: userInfo.email,
              });
            }
          }
        }
      });
    }

    // Enviar para o socket específico que solicitou
    socket.emit("equipe:online", onlineUsers);

    console.log(
      `👥 Lista de equipe online enviada para socket ${socket.id}: ${onlineUsers.length} membros ADMIN de TI online`
    );
  } catch (error) {
    console.error("❌ Erro ao enviar equipe online:", error);
  }
}

// ✅ FUNÇÃO PARA EMITIR EQUIPE ONLINE ATUALIZADA PARA TODOS
async function emitirEquipeOnlineAtualizada() {
  try {
    const connection = require("./database/connection");

    // Buscar todos os ADMs do setor TI (setor_id = 7) via papéis
    const equipeADM = await connection("usuarios")
      .join("usuarios_papeis", "usuarios.id", "usuarios_papeis.usuario_id")
      .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
      .where("papeis.nome", "ADMIN")
      .where("usuarios.setor_id", 7)
      .select("usuarios.id", "usuarios.nome", "usuarios.email")
      .orderBy("usuarios.nome", "asc");

    // Verificar quais ADMINs de TI estão online
    const onlineUsers = [];

    if (io && io.sockets && io.sockets.sockets) {
      io.sockets.sockets.forEach((socket) => {
        if (socket.userId && socket.isAdmin && socket.setorId === 7) {
          if (!onlineUsers.find((u) => u.id === socket.userId)) {
            const userInfo = equipeADM.find((u) => u.id === socket.userId);
            if (userInfo) {
              onlineUsers.push({
                id: userInfo.id,
                nome: userInfo.nome,
                email: userInfo.email,
              });
            }
          }
        }
      });
    }

    // Emitir para sala global
    io.to("global").emit("equipe:online", onlineUsers);

    console.log(
      `👥 Equipe online atualizada (broadcast): ${onlineUsers.length} membros ADM de TI online`
    );
    console.log(
      "📋 Membros online:",
      onlineUsers.map((u) => u.nome).join(", ") || "Nenhum"
    );
  } catch (error) {
    console.error("❌ Erro ao emitir equipe online:", error);
  }
}

function getIo() {
  if (!io) {
    throw new Error("Socket.IO não inicializado! Chame init(server) primeiro.");
  }
  return io;
}

// ✅ EXPORTAR FUNÇÃO PARA USO NO CONTROLLER
function emitirEquipeOnline() {
  return emitirEquipeOnlineAtualizada();
}

module.exports = { init, getIo, emitirEquipeOnline };
