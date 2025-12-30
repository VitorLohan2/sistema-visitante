// Handlers de tickets
import { useCallback, useRef } from "react";
import { Audio } from "expo-av";
import notificacaoSom from "../../../assets/notificacao.mp3";

export function useTicketHandlers(userData) {
  const processedTicketsRef = useRef(new Set());
  const lastSoundTimeRef = useRef(0);
  const SOUND_COOLDOWN = 3000;

  // ✅ Tocar som
  const playNotificationSound = useCallback(async () => {
    try {
      const now = Date.now();
      if (now - lastSoundTimeRef.current < SOUND_COOLDOWN) return;

      lastSoundTimeRef.current = now;
      const { sound } = await Audio.Sound.createAsync(notificacaoSom);
      await sound.playAsync();

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) await sound.unloadAsync();
      });
    } catch (err) {
      console.log("Erro ao tocar som:", err);
    }
  }, []);

  // ✅ Criar ticket
  const handleTicketCreate = useCallback(
    async (ticketData) => {
      if (userData.setor !== "Segurança") return;

      const ticketId = `ticket-${ticketData?.id || Date.now()}`;

      if (processedTicketsRef.current.has(ticketId)) {
        console.log("⏭️ Ticket já processado");
        return;
      }

      processedTicketsRef.current.add(ticketId);
      setTimeout(() => processedTicketsRef.current.delete(ticketId), 10000);

      await playNotificationSound();
    },
    [userData.setor, playNotificationSound]
  );

  // ✅ Outros handlers...
  const handleTicketUpdate = useCallback((data) => {
    console.log("📝 Ticket atualizado:", data);
  }, []);

  const handleTicketViewed = useCallback(() => {
    console.log("👁️ Ticket visualizado");
  }, []);

  const handleTicketAllViewed = useCallback(() => {
    console.log("👁️ Todos tickets visualizados");
  }, []);

  return {
    handleTicketCreate,
    handleTicketUpdate,
    handleTicketViewed,
    handleTicketAllViewed,
  };
}
