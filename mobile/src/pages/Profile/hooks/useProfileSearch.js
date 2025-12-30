// Lógica de busca
// ═══════════════════════════════════════════════════════════════
// 5️⃣ ARQUIVO: src/pages/Profile/hooks/useProfileSearch.js
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useIncidents } from "../../../contexts/IncidentsContext";
import api from "../../../services/api";

export function useProfileSearch(flatListRef) {
  // ✅ RECEBE flatListRef
  const { allIncidents, empresasVisitantes, setoresVisitantes } =
    useIncidents();

  const [searchTerm, setSearchTerm] = useState("");
  const [displayedIncidents, setDisplayedIncidents] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchExecuted, setSearchExecuted] = useState(false);
  const [lastSearchedTerm, setLastSearchedTerm] = useState("");

  // ✅ BUSCA ULTRA-RÁPIDA (VERSÃO ORIGINAL)
  const executeSearch = useCallback(async () => {
    const query = searchTerm.trim();

    // Limpar busca
    if (!query) {
      setDisplayedIncidents(allIncidents);
      setIsSearching(false);
      setSearchExecuted(false);

      // ✅ SCROLL PARA O TOPO QUANDO LIMPAR
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToOffset({
            offset: 0,
            animated: true,
          });
        }
      }, 100);

      return;
    }

    console.log(`🔍 Executando busca: "${query}"`);
    setSearchExecuted(true);
    setLastSearchedTerm(query);

    // ✅ SCROLL PARA O TOPO AO BUSCAR
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({
          offset: 0,
          animated: false,
        });
      }
    }, 100);

    // Busca local INSTANTÂNEA
    const cpfNumbers = query.replace(/\D/g, "");
    const localResults = allIncidents.filter((item) => {
      if (item.nome && item.nome.toLowerCase().includes(query.toLowerCase())) {
        return true;
      }
      if (
        item.cpf &&
        cpfNumbers.length > 0 &&
        item.cpf.replace(/\D/g, "").includes(cpfNumbers)
      ) {
        return true;
      }
      return false;
    });

    if (localResults.length > 0) {
      setDisplayedIncidents(localResults);
      setIsSearching(false);
      console.log(`⚡ ${localResults.length} resultados locais`);
      return;
    }

    // Busca na API se não encontrou localmente
    setIsSearching(true);
    try {
      const response = await api.get("/search", {
        params: { query },
        timeout: 5000,
      });

      const apiResults = response.data.map((incident) => ({
        ...incident,
        empresa:
          empresasVisitantes.find((e) => e.id === incident.empresa_id)?.nome ||
          "Não informado",
        setor:
          setoresVisitantes.find((s) => s.id === incident.setor_id)?.nome ||
          "Não informado",
      }));

      setDisplayedIncidents(apiResults);
      console.log(`🌐 ${apiResults.length} resultados da API`);
    } catch (err) {
      console.error("❌ Erro na busca:", err);
      setDisplayedIncidents([]);
    } finally {
      setIsSearching(false);
    }
  }, [
    searchTerm,
    allIncidents,
    empresasVisitantes,
    setoresVisitantes,
    flatListRef,
  ]);

  // Sincroniza displayedIncidents com allIncidents APENAS quando allIncidents muda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setDisplayedIncidents(allIncidents);
    }
  }, [allIncidents, searchTerm]);

  // ✅ VERSÃO ORIGINAL DO FILTRO (COM ORDENAÇÃO)
  const sortedAllIncidents = useMemo(() => {
    return [...allIncidents].sort((a, b) =>
      (a.nome || "").localeCompare(b.nome || "")
    );
  }, [allIncidents]);

  const filteredIncidents = useMemo(() => {
    if (displayedIncidents.length === 0 && !searchTerm.trim()) {
      return sortedAllIncidents;
    }

    if (displayedIncidents.length > 0) {
      return [...displayedIncidents].sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "")
      );
    }

    return [];
  }, [displayedIncidents, searchTerm, sortedAllIncidents]);

  return {
    searchTerm,
    setSearchTerm,
    filteredIncidents,
    isSearching,
    searchExecuted,
    lastSearchedTerm,
    executeSearch,
    allIncidents, // ✅ ADICIONAR (usado no index.js)
  };
}
