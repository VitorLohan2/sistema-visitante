import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";

export const useEquipeOnline = (socket, socketConnected) => {
  const [equipeOnline, setEquipeOnline] = useState([]);
  const [loadingEquipe, setLoadingEquipe] = useState(false);

  // =========================
  // HTTP fallback
  // =========================
  const carregarEquipeOnline = useCallback(async () => {
    try {
      setLoadingEquipe(true);
      console.log("🔄 Carregando equipe online via HTTP...");
      const response = await api.get("/chat/equipe-online");
      setEquipeOnline(response.data || []);
    } catch (error) {
      console.error("❌ Erro ao carregar equipe online:", error);
      setEquipeOnline([]);
    } finally {
      setLoadingEquipe(false);
    }
  }, []);

  // =========================
  // SOCKET - TEMPO REAL
  // =========================
  useEffect(() => {
    if (!socketConnected || !socket) {
      console.log("🚪 Socket desconectado → limpando equipe online");
      setEquipeOnline([]);
      setLoadingEquipe(false);
      return;
    }

    console.log("✅ Socket conectado - presença global ativa");

    // SOLICITAR LISTA INICIAL VIA SOCKET
    socket.emit("equipe:solicitar");

    // 👤 Usuário conectou (evento genérico)
    const handleUserConnected = (user) => {
      console.log("➕ user:connected", user);

      if (user.type === "ADM" && user.setorId === 7) {
        setEquipeOnline((prev) => {
          if (prev.some((u) => u.id === user.id)) return prev;
          return [...prev, user];
        });
      }
    };

    // 👋 Usuário desconectou (evento genérico)
    const handleUserDisconnected = (user) => {
      console.log("➖ user:disconnected", user);

      setEquipeOnline((prev) => prev.filter((u) => u.id !== user.id));
    };

    // 🟢 Receber lista completa da equipe online
    const handleEquipeOnline = (equipe) => {
      console.log("👥 equipe:online recebida via socket", equipe);
      setEquipeOnline(equipe);
    };

    // ➕ Membro específico conectou (evento específico da equipe)
    const handleEquipeMembroConectou = (membro) => {
      console.log("➕ equipe:membro_conectou", membro);
      setEquipeOnline((prev) => {
        if (prev.some((u) => u.id === membro.id)) return prev;
        return [...prev, membro];
      });
    };

    // ➖ Membro específico desconectou (evento específico da equipe)
    const handleEquipeMembroDesconectou = (userId) => {
      console.log("➖ equipe:membro_desconectou", userId);
      setEquipeOnline((prev) => prev.filter((u) => u.id !== userId));
    };

    // Registrar listeners
    socket.on("user:connected", handleUserConnected);
    socket.on("user:disconnected", handleUserDisconnected);
    socket.on("equipe:online", handleEquipeOnline);
    socket.on("equipe:membro_conectou", handleEquipeMembroConectou);
    socket.on("equipe:membro_desconectou", handleEquipeMembroDesconectou);

    return () => {
      console.log("🧹 Cleanup presença global");
      socket.off("user:connected", handleUserConnected);
      socket.off("user:disconnected", handleUserDisconnected);
      socket.off("equipe:online", handleEquipeOnline);
      socket.off("equipe:membro_conectou", handleEquipeMembroConectou);
      socket.off("equipe:membro_desconectou", handleEquipeMembroDesconectou);
    };
  }, [socket, socketConnected]);

  return {
    equipeOnline,
    loadingEquipe,
    carregarEquipeOnline,
  };
};
