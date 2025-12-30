// Lógica de dados
// ═══════════════════════════════════════════════════════════════
// 2️⃣ ARQUIVO: src/pages/Profile/hooks/useProfileData.js
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../services/api";
import { useIncidents } from "../../../contexts/IncidentsContext";

export function useProfileData() {
  const { loadIncidents } = useIncidents();

  const [loading, setLoading] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0); // ✅ FALTAVA
  const [userData, setUserData] = useState({ setor: "", nome: "" });
  const [comunicadoAtivo, setComunicadoAtivo] = useState(null);
  const [comunicadoVisible, setComunicadoVisible] = useState(false);

  const flatListRef = useRef(null); // ✅ FALTAVA
  const userDataRef = useRef({ setor: "", nome: "" }); // ✅ FALTAVA

  // ✅ CARREGAR COMUNICADO
  const loadComunicadoAtivo = useCallback(async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      const response = await api.get("/comunicados/ativo", {
        headers: { Authorization: `Bearer ${ongId}` },
      });

      if (response.data) {
        setComunicadoAtivo(response.data);
        setComunicadoVisible(true);
        console.log("📢 Comunicado ativo carregado:", response.data);
      }
    } catch (error) {
      console.log("Erro ao carregar comunicado:", error);
    }
  }, []);

  // ✅ CARREGAR TICKETS NÃO VISUALIZADOS (FALTAVA)
  const loadUnseenTickets = useCallback(async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");

      if (userDataRef.current.setor !== "Segurança") {
        return;
      }

      const unseenResponse = await api.get("/tickets/unseen", {
        headers: { Authorization: ongId },
      });

      const newCount = Number(unseenResponse.data.count) || 0;
      setUnseenCount(newCount);

      console.log(`🎫 Tickets sincronizados: ${newCount} não vistos`);
    } catch (error) {
      console.error("Erro ao carregar tickets não visualizados:", error);
    }
  }, []);

  // ✅ CARREGAR DADOS INICIAIS (VERSÃO COMPLETA DO ORIGINAL)
  const fetchInitialData = useCallback(async () => {
    console.log("🔄 fetchInitialData chamado");

    const ongId = await AsyncStorage.getItem("@Auth:ongId");
    const ongName = await AsyncStorage.getItem("@Auth:ongName");

    if (!ongId) {
      setLoading(false);
      return;
    }

    try {
      await loadIncidents();

      const ongResponse = await api.get(`ongs/${ongId}`);
      const setor = ongResponse.data.setor || "";
      const nome = ongResponse.data.name || ongName || "";

      setUserData({ setor, nome });
      userDataRef.current = { setor, nome };

      if (setor === "Segurança") {
        const unseenResponse = await api.get("/tickets/unseen", {
          headers: { Authorization: ongId },
        });

        const newCount = Number(unseenResponse.data.count) || 0;
        setUnseenCount(newCount);

        console.log(`📊 ${newCount} tickets não vistos`);
      }

      await loadComunicadoAtivo();
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error.message);
    } finally {
      setLoading(false);
    }
  }, [loadIncidents, loadComunicadoAtivo]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return {
    loading,
    userData,
    userDataRef, // ✅ FALTAVA
    unseenCount, // ✅ FALTAVA
    setUnseenCount, // ✅ FALTAVA
    comunicadoAtivo,
    setComunicadoAtivo, // ✅ FALTAVA
    comunicadoVisible,
    setComunicadoVisible,
    flatListRef, // ✅ FALTAVA
    loadUnseenTickets, // ✅ FALTAVA (usado por outros hooks)
  };
}
