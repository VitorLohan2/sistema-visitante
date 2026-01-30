// backend/src/socket.js
let io;

// Mapa de usuários online (conectados via socket)
const usuariosOnline = new Map();

// Mapa de usuários conectados ao namespace /suporte
const usuariosSuporteOnline = new Map();

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
    // EVENTOS LEGADOS (CHAT INTERNO) - Mantido para compatibilidade
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
      // Emite para namespace /suporte (onde os atendentes e usuários internos estão)
      const suporteNs = io.of("/suporte");
      suporteNs.to(`conversa:${conversa_id}`).emit("suporte:digitando", {
        conversa_id,
        nome,
      });

      // Para outros visitantes na mesma conversa (exclui o remetente com socket.to)
      socket.to(`conversa:${conversa_id}`).emit("chat-suporte:digitando", {
        conversa_id,
        nome,
      });

      console.log(
        `⌨️ [Visitante] ${nome} digitando na conversa ${conversa_id}`,
      );
    });

    // 👉 VISITANTE PAROU DE DIGITAR
    socket.on("chat-suporte:parou-digitar", ({ conversa_id }) => {
      // Emite para namespace /suporte
      const suporteNs = io.of("/suporte");
      suporteNs.to(`conversa:${conversa_id}`).emit("suporte:parou-digitar", {
        conversa_id,
      });

      // Para outros visitantes
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

// ═══════════════════════════════════════════════════════════════════════════
// NAMESPACE /suporte - CHAT DE SUPORTE (USUÁRIOS AUTENTICADOS COM PERMISSÃO)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Namespace dedicado ao Chat de Suporte
 * Separado do namespace principal para:
 * - Não poluir a sala "global" com eventos de chat
 * - Permitir controle de acesso por permissão
 * - Isolar eventos de chat de eventos gerais do sistema
 *
 * SALAS:
 * - "atendentes" → Todos os atendentes conectados
 * - "conversa:{id}" → Participantes de uma conversa específica
 */
function initSuporteNamespace() {
  if (!io) return;

  const { verificarToken } = require("./utils/jwt");
  const suporteNs = io.of("/suporte");

  suporteNs.on("connection", async (socket) => {
    console.log("🟢 [Suporte] Novo socket conectando:", socket.id);

    // ✅ VALIDAR JWT - Requer autenticação
    let token = socket.handshake.auth?.token;
    if (!token) {
      token = socket.handshake.headers.authorization?.replace("Bearer ", "");
    }

    if (!token) {
      console.log("❌ [Suporte] Socket rejeitado: Sem token JWT");
      socket.disconnect(true);
      return;
    }

    try {
      const usuario = verificarToken(token);

      // Armazena dados do usuário no socket
      socket.userId = usuario.id;
      socket.userName = usuario.nome;
      socket.userEmail = usuario.email;
      socket.isAdmin = usuario.isAdmin;

      console.log(
        `✅ [Suporte] Usuário autenticado: ${usuario.nome} (ID: ${usuario.id})`,
      );

      // Registra no mapa de usuários do suporte
      usuariosSuporteOnline.set(socket.id, {
        socketId: socket.id,
        userId: usuario.id,
        userName: usuario.nome,
        userEmail: usuario.email,
        connectedAt: new Date(),
        isAdmin: usuario.isAdmin,
      });
    } catch (error) {
      console.log("❌ [Suporte] Token inválido:", error.message);
      socket.disconnect(true);
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENTOS DE ENTRADA/SAÍDA DE SALAS
    // ═══════════════════════════════════════════════════════════════

    // 👉 USUÁRIO COM PERMISSÃO ENTRA NA SALA DE NOTIFICAÇÕES
    socket.on("suporte:entrar-notificacoes", async () => {
      const jaEstaNaSala = socket.rooms.has("notificacoes");

      if (!jaEstaNaSala) {
        socket.join("notificacoes");
        console.log(
          `👥 [Suporte] ${socket.userName} entrou na sala de notificações`,
        );

        // Emite o tamanho atual da fila
        const FilaService = require("./services/ChatFilaService");
        const fila = await FilaService.listar();
        socket.emit("suporte:fila-atualizada", {
          fila,
          filaCount: fila.length,
        });

        // Se há conversas pendentes, notifica
        if (fila.length > 0) {
          console.log(
            `📢 [Suporte] ${socket.userName} entrou - ${fila.length} conversa(s) na fila`,
          );
          socket.emit("suporte:nova-fila", {
            conversa_id: fila[0].conversa_id,
            nome: fila[0].nome_visitante || fila[0].nome_usuario || "Alguém",
            posicao: 1,
            fila,
            filaCount: fila.length,
            pendentes: true,
          });
        }
      }
    });

    // 👉 ATENDENTE ENTRA NA SALA DE ATENDENTES
    socket.on("suporte:entrar-atendentes", async () => {
      const jaEstaNaSalaAtendentes = socket.rooms.has("atendentes");
      const jaEstaNaSalaNotificacoes = socket.rooms.has("notificacoes");

      // Atendentes também entram na sala de notificações
      if (!jaEstaNaSalaNotificacoes) {
        socket.join("notificacoes");
      }

      if (!jaEstaNaSalaAtendentes) {
        socket.join("atendentes");
        console.log(
          `👨‍💼 [Suporte] Atendente ${socket.userName} entrou na sala de atendentes`,
        );

        // Emite atualização da fila
        const FilaService = require("./services/ChatFilaService");
        const fila = await FilaService.listar();
        socket.emit("suporte:fila-atualizada", {
          fila,
          filaCount: fila.length,
        });

        // Se há conversas pendentes, notifica
        if (fila.length > 0) {
          console.log(
            `📢 [Suporte] Atendente ${socket.userName} entrou - ${fila.length} conversa(s) na fila`,
          );
          socket.emit("suporte:nova-fila", {
            conversa_id: fila[0].conversa_id,
            nome: fila[0].nome_visitante || fila[0].nome_usuario || "Alguém",
            posicao: 1,
            fila,
            filaCount: fila.length,
            pendentes: true,
          });
        }
      }
    });

    // 👉 HEARTBEAT DO ATENDENTE (mantém na sala)
    socket.on("suporte:heartbeat-atendente", () => {
      // Garante que continua nas salas
      if (!socket.rooms.has("atendentes")) {
        socket.join("atendentes");
      }
      if (!socket.rooms.has("notificacoes")) {
        socket.join("notificacoes");
      }
      console.log(`💓 [Suporte] Heartbeat de ${socket.userName}`);
    });

    // 👉 ATENDENTE SAI DA SALA
    socket.on("suporte:atendente-offline", () => {
      socket.leave("atendentes");
      console.log(
        `👨‍💼 [Suporte] Atendente ${socket.userName} saiu da sala de atendentes`,
      );
    });

    // 👉 ENTRAR EM UMA CONVERSA ESPECÍFICA
    socket.on("suporte:entrar-conversa", ({ conversa_id }) => {
      socket.join(`conversa:${conversa_id}`);
      console.log(
        `💬 [Suporte] ${socket.userName} entrou na conversa ${conversa_id}`,
      );
    });

    // 👉 SAIR DE UMA CONVERSA
    socket.on("suporte:sair-conversa", ({ conversa_id }) => {
      socket.leave(`conversa:${conversa_id}`);
      console.log(
        `💬 [Suporte] ${socket.userName} saiu da conversa ${conversa_id}`,
      );
    });

    // ═══════════════════════════════════════════════════════════════
    // EVENTOS DE DIGITAÇÃO
    // ═══════════════════════════════════════════════════════════════

    // 👉 DIGITANDO
    socket.on("suporte:digitando", ({ conversa_id, nome }) => {
      console.log(`⌨️ [Suporte] ${nome} digitando na conversa ${conversa_id}`);

      // Emite para outros na mesma conversa (exclui o remetente)
      socket.to(`conversa:${conversa_id}`).emit("suporte:digitando", {
        conversa_id,
        nome,
      });

      // Também emite para namespace de visitantes
      const visitanteNs = io.of("/visitante");
      visitanteNs.to(`conversa:${conversa_id}`).emit("chat-suporte:digitando", {
        conversa_id,
        nome,
      });
    });

    // 👉 PAROU DE DIGITAR
    socket.on("suporte:parou-digitar", ({ conversa_id }) => {
      socket.to(`conversa:${conversa_id}`).emit("suporte:parou-digitar", {
        conversa_id,
      });

      // Também emite para namespace de visitantes
      const visitanteNs = io.of("/visitante");
      visitanteNs
        .to(`conversa:${conversa_id}`)
        .emit("chat-suporte:parou-digitar", {
          conversa_id,
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // DESCONEXÃO
    // ═══════════════════════════════════════════════════════════════

    socket.on("disconnect", () => {
      console.log(`🔴 [Suporte] ${socket.userName || socket.id} desconectado`);
      usuariosSuporteOnline.delete(socket.id);
    });
  });

  console.log("✅ Namespace /suporte inicializado");
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE EMISSÃO PARA O NAMESPACE /suporte
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Emite evento para o namespace /suporte
 * @param {string} evento - Nome do evento
 * @param {object} dados - Dados do evento
 * @param {string} sala - Sala específica (opcional)
 */
function emitirParaSuporte(evento, dados, sala = null) {
  if (!io) return;

  const suporteNs = io.of("/suporte");

  if (sala) {
    const room = suporteNs.adapter.rooms.get(sala);
    const socketsNaSala = room ? room.size : 0;
    console.log(
      `📡 [Suporte] Emitindo ${evento} para sala "${sala}" (${socketsNaSala} sockets)`,
    );
    suporteNs.to(sala).emit(evento, dados);
  } else {
    console.log(`📡 [Suporte] Emitindo ${evento} para todo o namespace`);
    suporteNs.emit(evento, dados);
  }
}

/**
 * Emite evento para todas as salas relevantes (notificações + atendentes)
 * Usado para nova-fila e fila-atualizada
 */
function emitirParaAtendentes(evento, dados) {
  if (!io) return;

  const suporteNs = io.of("/suporte");

  // Verifica quantos estão na sala de notificações
  const roomNotificacoes = suporteNs.adapter.rooms.get("notificacoes");
  const socketsNotificacoes = roomNotificacoes ? roomNotificacoes.size : 0;

  console.log(
    `📡 [Suporte] Emitindo ${evento} para sala "notificacoes" (${socketsNotificacoes} sockets)`,
  );

  // Emite para sala de notificações (todos com permissão de chat)
  suporteNs.to("notificacoes").emit(evento, dados);
}

/**
 * Retorna quantidade de usuários conectados ao namespace /suporte
 */
function getUsuariosSuporteOnline() {
  return usuariosSuporteOnline.size;
}

module.exports = {
  init,
  getIo,
  emitirEquipeOnline,
  initVisitorNamespace,
  initSuporteNamespace,
  emitirParaVisitante,
  emitirParaSuporte,
  emitirParaAtendentes,
  getUsuariosOnline,
  getUsuariosSuporteOnline,
  getIPsDeUsuariosLogados,
};
