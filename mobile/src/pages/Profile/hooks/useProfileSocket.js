// Lógica de Socket
// ═══════════════════════════════════════════════════════════════
// 3️⃣ ARQUIVO: src/pages/Profile/hooks/useProfileSocket.js
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from "react";
import { useIncidents } from "../../../contexts/IncidentsContext";
import { useTicketHandlers } from "./useTicketHandlers";

export function useProfileSocket(socket, userData) {
  const { syncFromSocket } = useIncidents();
  const listenersRegisteredRef = useRef(false);

  // ✅ Handlers de tickets
  const {
    handleTicketCreate,
    handleTicketUpdate,
    handleTicketViewed,
    handleTicketAllViewed,
  } = useTicketHandlers(userData);

  // ✅ Handlers de visitantes
  const handleVisitanteCreate = useCallback(
    (data) => {
      console.log("🔥 visitante:create recebido");
      syncFromSocket({ type: "create", data });
    },
    [syncFromSocket]
  );

  const handleVisitanteUpdate = useCallback(
    (data) => {
      console.log("🔥 visitante:update recebido");
      syncFromSocket({ type: "update", data });
    },
    [syncFromSocket]
  );

  const handleVisitanteDelete = useCallback(
    (data) => {
      console.log("🔥 visitante:delete recebido");
      syncFromSocket({ type: "delete", data });
    },
    [syncFromSocket]
  );

  // ✅ REGISTRAR LISTENERS (APENAS 1X)
  useEffect(() => {
    if (!socket || !socket.connected || listenersRegisteredRef.current) {
      return;
    }

    console.log("🔌 Registrando listeners do Socket");
    listenersRegisteredRef.current = true;

    // Tickets
    socket.on("ticket:create", handleTicketCreate);
    socket.on("ticket:update", handleTicketUpdate);
    socket.on("ticket:viewed", handleTicketViewed);
    socket.on("ticket:all_viewed", handleTicketAllViewed);

    // Visitantes
    socket.on("visitante:create", handleVisitanteCreate);
    socket.on("visitante:update", handleVisitanteUpdate);
    socket.on("visitante:delete", handleVisitanteDelete);

    return () => {
      console.log("🧹 Cleanup: Removendo listeners");
      socket.removeAllListeners("ticket:create");
      socket.removeAllListeners("ticket:update");
      socket.removeAllListeners("ticket:viewed");
      socket.removeAllListeners("ticket:all_viewed");
      socket.removeAllListeners("visitante:create");
      socket.removeAllListeners("visitante:update");
      socket.removeAllListeners("visitante:delete");
      listenersRegisteredRef.current = false;
    };
  }, [socket]); // ✅ APENAS socket como dependência
}
