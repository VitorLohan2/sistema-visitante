// backend/src/socket.js
let io;

// Mapa de usuários online (conectados via socket)
const usuariosOnline = new Map();

function init(server) {
  const { Server } = require("socket.io");
  const { verificarToken } = require("./utils/jwt");
  const { setSocketIO } = require("./middleware/requestMonitor");

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  // Passa a instância do io para o requestMonitor
  setSocketIO(io);

  // ═══════════════════════════════════════════════════════════════════════════
  // NAMESPACE PRINCIPAL (/) - USUÁRIOS AUTENTICADOS
  // ═══════════════════════════════════════════════════════════════════════════
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

      // ✅ REGISTRAR USUÁRIO ONLINE
      const clientIP =
        socket.handshake.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        socket.handshake.headers["x-real-ip"] ||
        socket.handshake.address ||
        "unknown";

      usuariosOnline.set(socket.id, {
        socketId: socket.id,
        userId: usuario.id,
        userName: usuario.nome,
        userEmail: usuario.email,
        ip: clientIP,
        connectedAt: new Date(),
        isAdmin: usuario.isAdmin,
      });

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
        error.message,
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
        `💬 Socket ${socket.id} entrou na conversa de suporte ${conversa_id}`,
      );
    });

    // 👉 SAIR DA CONVERSA DE CHAT SUPORTE
    socket.on("chat-suporte:sair", (conversa_id) => {
      socket.leave(`conversa:${conversa_id}`);
      console.log(
        `💬 Socket ${socket.id} saiu da conversa de suporte ${conversa_id}`,
      );
    });

    // 👉 USUÁRIO COM PERMISSÃO DE CHAT ENTRA NA SALA DE NOTIFICAÇÕES
    socket.on("chat-suporte:usuario-online", async () => {
      // Verifica se já está na sala para evitar operações desnecessárias
      const jaEstaNaSala = socket.rooms.has("chat-suporte-notificacoes");

      if (!jaEstaNaSala) {
        socket.join("chat-suporte-notificacoes");
        console.log(
          `👥 Usuário ${socket.userName} entrou na sala de notificações de chat`,
        );

        // Emite o tamanho atual da fila para o novo usuário
        const FilaService = require("./services/ChatFilaService");
        const fila = await FilaService.listar();
        socket.emit("chat-suporte:fila-atualizada", {
          fila,
          filaCount: fila.length,
        });
      }
    });

    // 👉 ATENDENTE ENTRA NA SALA DE ATENDENTES (pode aceitar conversas)
    socket.on("chat-suporte:atendente-online", async () => {
      // Verifica se já está na sala para evitar operações desnecessárias
      const jaEstaNaSalaAtendentes = socket.rooms.has("atendentes");
      const jaEstaNaSalaNotificacoes = socket.rooms.has(
        "chat-suporte-notificacoes",
      );

      // Atendentes também entram na sala de notificações
      if (!jaEstaNaSalaNotificacoes) {
        socket.join("chat-suporte-notificacoes");
      }

      if (!jaEstaNaSalaAtendentes) {
        socket.join("atendentes");
        console.log(
          `👨‍💼 Atendente ${socket.userName} entrou na sala de atendentes`,
        );

        // Emite atualização da fila APENAS na primeira entrada
        const FilaService = require("./services/ChatFilaService");
        const fila = await FilaService.listar();
        socket.emit("chat-suporte:fila-atualizada", {
          fila,
          filaCount: fila.length,
        });
      }
      // Heartbeat silencioso - não loga se já está na sala
    });

    // 👉 ATENDENTE SAI DA SALA DE ATENDENTES
    socket.on("chat-suporte:atendente-offline", () => {
      socket.leave("atendentes");
      console.log(`👨‍💼 Atendente ${socket.userName} saiu da sala de atendentes`);
    });

    // 👉 DIGITANDO (usuário ou atendente)
    socket.on("chat-suporte:digitando", ({ conversa_id, nome }) => {
      // Emite para outros na mesma sala do namespace principal (exclui o remetente)
      socket.to(`conversa:${conversa_id}`).emit("chat-suporte:digitando", {
        conversa_id,
        nome,
      });

      // TAMBÉM emite para o namespace de visitantes (caso seja conversa com visitante)
      const visitanteNs = io.of("/visitante");
      visitanteNs.to(`conversa:${conversa_id}`).emit("chat-suporte:digitando", {
        conversa_id,
        nome,
      });
    });

    // 👉 PAROU DE DIGITAR
    socket.on("chat-suporte:parou-digitar", ({ conversa_id }) => {
      socket.to(`conversa:${conversa_id}`).emit("chat-suporte:parou-digitar", {
        conversa_id,
      });

      // TAMBÉM emite para o namespace de visitantes
      const visitanteNs = io.of("/visitante");
      visitanteNs
        .to(`conversa:${conversa_id}`)
        .emit("chat-suporte:parou-digitar", {
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

    // ═══════════════════════════════════════════════════════════════
    // EVENTOS DE RONDA VIGILANTE (TEMPO REAL)
    // ═══════════════════════════════════════════════════════════════

    // 👉 ENTRAR NA SALA DA RONDA (para acompanhar em tempo real)
    socket.on("ronda:entrar", (rondaId) => {
      socket.join(`ronda:${rondaId}`);
      console.log(`🚶 Socket ${socket.id} entrou na sala da ronda ${rondaId}`);
    });

    // 👉 SAIR DA SALA DA RONDA
    socket.on("ronda:sair", (rondaId) => {
      socket.leave(`ronda:${rondaId}`);
      console.log(`🚶 Socket ${socket.id} saiu da sala da ronda ${rondaId}`);
    });

    // 👉 ATUALIZAÇÃO DE POSIÇÃO GPS EM TEMPO REAL
    socket.on("ronda:posicao", (dados) => {
      // Broadcast para todos na sala da ronda (exceto quem enviou)
      socket.to(`ronda:${dados.ronda_id}`).emit("ronda:posicao-atualizada", {
        ronda_id: dados.ronda_id,
        latitude: dados.latitude,
        longitude: dados.longitude,
        precisao: dados.precisao,
        velocidade: dados.velocidade,
        timestamp: dados.timestamp,
        usuario_id: socket.userId,
        usuario_nome: socket.userName,
      });

      // Também emite para sala global (painel de rondas)
      io.to("global").emit("ronda:posicao-atualizada", {
        ronda_id: dados.ronda_id,
        latitude: dados.latitude,
        longitude: dados.longitude,
        precisao: dados.precisao,
        velocidade: dados.velocidade,
        timestamp: dados.timestamp,
        usuario_id: socket.userId,
        usuario_nome: socket.userName,
      });
    });

    // 👉 CHECKPOINT REGISTRADO
    socket.on("ronda:checkpoint", (dados) => {
      // Notifica sala da ronda
      socket.to(`ronda:${dados.ronda_id}`).emit("ronda:checkpoint-registrado", {
        ronda_id: dados.ronda_id,
        checkpoint: dados.checkpoint,
        usuario_id: socket.userId,
        usuario_nome: socket.userName,
      });

      // Notifica sala global
      io.to("global").emit("ronda:checkpoint-registrado", {
        ronda_id: dados.ronda_id,
        checkpoint: dados.checkpoint,
        usuario_id: socket.userId,
        usuario_nome: socket.userName,
      });

      console.log(
        `📍 Checkpoint registrado na ronda ${dados.ronda_id} por ${socket.userName}`,
      );
    });

    // 👉 RONDA INICIADA
    socket.on("ronda:iniciada", (ronda) => {
      // Entra automaticamente na sala da ronda
      socket.join(`ronda:${ronda.id}`);

      // Notifica todos (painel de rondas)
      io.to("global").emit("ronda:nova-iniciada", {
        ...ronda,
        usuario_id: socket.userId,
        usuario_nome: socket.userName,
      });

      console.log(`🟢 Ronda ${ronda.id} iniciada por ${socket.userName}`);
    });

    // 👉 RONDA FINALIZADA
    socket.on("ronda:finalizada", (ronda) => {
      // Notifica sala da ronda
      io.to(`ronda:${ronda.id}`).emit("ronda:encerrada", {
        ...ronda,
        usuario_id: socket.userId,
        usuario_nome: socket.userName,
      });

      // Notifica sala global
      io.to("global").emit("ronda:encerrada", {
        ...ronda,
        usuario_id: socket.userId,
        usuario_nome: socket.userName,
      });

      console.log(`🔴 Ronda ${ronda.id} finalizada por ${socket.userName}`);
    });

    // ═══════════════════════════════════════════════════════════════
    // EVENTOS DE DESCONEXÃO
    // ═══════════════════════════════════════════════════════════════

    // 🆕 SOLICITAR LISTA DE EQUIPE ONLINE
    socket.on("disconnect", async () => {
      console.log("🔴 Socket desconectado:", socket.id);

      // ✅ REMOVER USUÁRIO DO MAPA DE ONLINE
      usuariosOnline.delete(socket.id);

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
      `👥 Lista de equipe online enviada para socket ${socket.id}: ${onlineUsers.length} membros ADMIN de TI online`,
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
      `👥 Equipe online atualizada (broadcast): ${onlineUsers.length} membros ADM de TI online`,
    );
    console.log(
      "📋 Membros online:",
      onlineUsers.map((u) => u.nome).join(", ") || "Nenhum",
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

// ═══════════════════════════════════════════════════════════════════════════
// NAMESPACE /visitante - CHAT PARA VISITANTES NÃO AUTENTICADOS
// ═══════════════════════════════════════════════════════════════════════════
function initVisitorNamespace() {
  if (!io) return;

  const visitanteNs = io.of("/visitante");

  visitanteNs.on("connection", (socket) => {
    console.log("🟢 [Visitante] Novo socket conectado:", socket.id);

    // Visitantes podem se identificar com token de conversa
    const chatToken = socket.handshake.auth?.chatToken;
    const conversaId = socket.handshake.auth?.conversaId;

    if (chatToken && conversaId) {
      socket.chatToken = chatToken;
      socket.conversaId = conversaId;
      socket.isVisitante = true;

      // Entra na sala da conversa
      socket.join(`conversa:${conversaId}`);
      console.log(`👤 [Visitante] Entrou na conversa ${conversaId}`);
    }

    // 👉 VISITANTE ENTRA NA CONVERSA
    socket.on("chat-suporte:entrar", ({ conversa_id, token }) => {
      if (token) {
        socket.chatToken = token;
        socket.conversaId = conversa_id;
        socket.join(`conversa:${conversa_id}`);
        console.log(`👤 [Visitante] Entrou na conversa ${conversa_id}`);
      }
    });

    // 👉 VISITANTE SAI DA CONVERSA
    socket.on("chat-suporte:sair", (conversa_id) => {
      socket.leave(`conversa:${conversa_id}`);
      console.log(`👤 [Visitante] Saiu da conversa ${conversa_id}`);
    });

    // 👉 VISITANTE DIGITANDO
    socket.on("chat-suporte:digitando", ({ conversa_id, nome }) => {
      // Emite para namespace principal (onde os atendentes estão) - usa io.to() pois atendentes precisam receber
      io.to(`conversa:${conversa_id}`).emit("chat-suporte:digitando", {
        conversa_id,
        nome,
      });
      // Para outros visitantes na mesma conversa (exclui o remetente com socket.to)
      socket.to(`conversa:${conversa_id}`).emit("chat-suporte:digitando", {
        conversa_id,
        nome,
      });
    });

    // 👉 VISITANTE PAROU DE DIGITAR
    socket.on("chat-suporte:parou-digitar", ({ conversa_id }) => {
      io.to(`conversa:${conversa_id}`).emit("chat-suporte:parou-digitar", {
        conversa_id,
      });
      socket.to(`conversa:${conversa_id}`).emit("chat-suporte:parou-digitar", {
        conversa_id,
      });
    });

    socket.on("disconnect", () => {
      console.log(`🔴 [Visitante] Socket desconectado: ${socket.id}`);
    });
  });

  console.log("✅ Namespace /visitante inicializado");
}

// Função para emitir eventos SOMENTE para visitantes (namespace /visitante)
// O namespace principal já é tratado pelo emitirEvento no ChatSuporteController
function emitirParaVisitante(conversaId, evento, dados) {
  if (!io) return;

  const visitanteNs = io.of("/visitante");
  const sala = `conversa:${conversaId}`;

  // Verifica quantos sockets estão na sala do namespace visitante
  const room = visitanteNs.adapter.rooms.get(sala);
  const socketsNaSala = room ? room.size : 0;

  if (socketsNaSala > 0) {
    console.log(
      `📡 [Visitante] Emitindo ${evento} para sala "${sala}" (${socketsNaSala} sockets)`,
    );
    visitanteNs.to(sala).emit(evento, dados);
  }
}

/**
 * Retorna lista de usuários online (conectados via socket)
 * Agrupa por userId para evitar duplicatas (mesmo usuário em múltiplas abas)
 */
function getUsuariosOnline() {
  const usuariosPorId = new Map();

  for (const [socketId, userData] of usuariosOnline) {
    const existente = usuariosPorId.get(userData.userId);

    if (!existente) {
      usuariosPorId.set(userData.userId, {
        userId: userData.userId,
        userName: userData.userName,
        userEmail: userData.userEmail,
        ip: userData.ip,
        connectedAt: userData.connectedAt,
        isAdmin: userData.isAdmin,
        socketCount: 1, // Número de abas/conexões
      });
    } else {
      // Usuário já existe, incrementa contador de conexões
      existente.socketCount++;
      // Mantém a conexão mais recente
      if (userData.connectedAt > existente.connectedAt) {
        existente.connectedAt = userData.connectedAt;
        existente.ip = userData.ip;
      }
    }
  }

  return Array.from(usuariosPorId.values());
}

/**
 * Retorna IPs únicos de usuários logados
 */
function getIPsDeUsuariosLogados() {
  const ipsPorUsuario = new Map();

  for (const [socketId, userData] of usuariosOnline) {
    if (!ipsPorUsuario.has(userData.ip)) {
      ipsPorUsuario.set(userData.ip, {
        ip: userData.ip,
        users: new Set(),
        lastActivity: userData.connectedAt,
      });
    }

    const ipData = ipsPorUsuario.get(userData.ip);
    ipData.users.add(
      userData.userName || userData.userEmail || userData.userId,
    );

    if (userData.connectedAt > ipData.lastActivity) {
      ipData.lastActivity = userData.connectedAt;
    }
  }

  return Array.from(ipsPorUsuario.values()).map((item) => ({
    ip: item.ip,
    usersCount: item.users.size,
    users: Array.from(item.users),
    lastActivity: item.lastActivity,
  }));
}

module.exports = {
  init,
  getIo,
  emitirEquipeOnline,
  initVisitorNamespace,
  emitirParaVisitante,
  getUsuariosOnline,
  getIPsDeUsuariosLogados,
};
