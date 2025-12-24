// contexts/EmpresasContext.js
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

import api from "../services/api";

const EmpresasContext = createContext();

export function EmpresasProvider({ children }) {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Cache em memória
  const hasLoadedRef = useRef(false);
  const empresasRef = useRef([]);

  // ═══════════════════════════════════════════════════════════════
  // LOAD INICIAL (APENAS 1x)
  // ═══════════════════════════════════════════════════════════════
  const loadEmpresas = useCallback(async () => {
    if (hasLoadedRef.current) {
      return empresasRef.current;
    }

    setLoading(true);
    try {
      const response = await api.get("/empresas-visitantes");

      const sorted = response.data.sort((a, b) => a.nome.localeCompare(b.nome));

      empresasRef.current = sorted;
      setEmpresas(sorted);
      hasLoadedRef.current = true;

      return sorted;
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // REFRESH (força recarregar)
  // ═══════════════════════════════════════════════════════════════
  const refreshEmpresas = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/empresas-visitantes");

      const sorted = response.data.sort((a, b) => a.nome.localeCompare(b.nome));

      empresasRef.current = sorted;
      setEmpresas(sorted);

      return sorted;
    } catch (error) {
      console.error("Erro ao recarregar empresas:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // ADICIONAR EMPRESA (para uso do socket na página)
  // ═══════════════════════════════════════════════════════════════
  const addEmpresa = useCallback((empresa) => {
    if (!empresa?.id) return;

    setEmpresas((prev) => {
      const exists = prev.some((e) => e.id === empresa.id);
      if (exists) return prev;

      const updated = [...prev, empresa].sort((a, b) =>
        a.nome.localeCompare(b.nome)
      );

      empresasRef.current = updated;
      return updated;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // ATUALIZAR EMPRESA (para uso do socket na página)
  // ═══════════════════════════════════════════════════════════════
  const updateEmpresa = useCallback((empresaAtualizada) => {
    if (!empresaAtualizada?.id) return;

    setEmpresas((prev) => {
      const updated = prev
        .map((e) =>
          e.id === empresaAtualizada.id ? { ...e, ...empresaAtualizada } : e
        )
        .sort((a, b) => a.nome.localeCompare(b.nome));

      empresasRef.current = updated;
      return updated;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // REMOVER EMPRESA (para uso do socket na página)
  // ═══════════════════════════════════════════════════════════════
  const removeEmpresa = useCallback((empresaId) => {
    if (!empresaId) return;

    setEmpresas((prev) => {
      const updated = prev.filter((e) => e.id !== empresaId);
      empresasRef.current = updated;
      return updated;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // PROVIDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <EmpresasContext.Provider
      value={{
        empresas,
        loading,
        loadEmpresas,
        refreshEmpresas,
        addEmpresa,
        updateEmpresa,
        removeEmpresa,
      }}
    >
      {children}
    </EmpresasContext.Provider>
  );
}

export function useEmpresas() {
  return useContext(EmpresasContext);
}
