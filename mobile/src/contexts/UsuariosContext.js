// contexts/UsuariosContext.js
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import api from "../services/api";

const UsuariosContext = createContext();

export function UsuariosProvider({ children }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Controle de cache
  const hasLoadedRef = useRef(false);
  const usuariosRef = useRef([]);

  // ═══════════════════════════════════════════════════════════════
  // LOAD INICIAL (APENAS 1x)
  // ═══════════════════════════════════════════════════════════════
  const loadUsuarios = useCallback(async () => {
    if (hasLoadedRef.current) {
      return usuariosRef.current;
    }

    setLoading(true);
    try {
      const response = await api.get("/ongs");

      // Ordenar por tipo (ADM primeiro) e depois por nome
      const sorted = response.data.sort((a, b) => {
        if (a.type === "ADM" && b.type !== "ADM") return -1;
        if (a.type !== "ADM" && b.type === "ADM") return 1;
        return a.name.localeCompare(b.name);
      });

      usuariosRef.current = sorted;
      setUsuarios(sorted);
      hasLoadedRef.current = true;

      return sorted;
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // REFRESH (força recarregar)
  // ═══════════════════════════════════════════════════════════════
  const refreshUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/ongs");

      // Ordenar por tipo (ADM primeiro) e depois por nome
      const sorted = response.data.sort((a, b) => {
        if (a.type === "ADM" && b.type !== "ADM") return -1;
        if (a.type !== "ADM" && b.type === "ADM") return 1;
        return a.name.localeCompare(b.name);
      });

      usuariosRef.current = sorted;
      setUsuarios(sorted);

      return sorted;
    } catch (error) {
      console.error("Erro ao recarregar usuários:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // ADICIONAR USUÁRIO (para uso do socket na página)
  // ═══════════════════════════════════════════════════════════════
  const addUsuario = useCallback((usuario) => {
    if (!usuario?.id) return;

    setUsuarios((prev) => {
      const exists = prev.some((u) => u.id === usuario.id);
      if (exists) return prev;

      const updated = [...prev, usuario].sort((a, b) => {
        if (a.type === "ADM" && b.type !== "ADM") return -1;
        if (a.type !== "ADM" && b.type === "ADM") return 1;
        return a.name.localeCompare(b.name);
      });

      usuariosRef.current = updated;
      return updated;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // ATUALIZAR USUÁRIO (para uso do socket na página)
  // ═══════════════════════════════════════════════════════════════
  const updateUsuario = useCallback((usuarioAtualizado) => {
    if (!usuarioAtualizado?.id) return;

    setUsuarios((prev) => {
      const updated = prev
        .map((u) =>
          u.id === usuarioAtualizado.id ? { ...u, ...usuarioAtualizado } : u
        )
        .sort((a, b) => {
          if (a.type === "ADM" && b.type !== "ADM") return -1;
          if (a.type !== "ADM" && b.type === "ADM") return 1;
          return a.name.localeCompare(b.name);
        });

      usuariosRef.current = updated;
      return updated;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // REMOVER USUÁRIO (para uso do socket na página)
  // ═══════════════════════════════════════════════════════════════
  const removeUsuario = useCallback((usuarioId) => {
    if (!usuarioId) return;

    setUsuarios((prev) => {
      const updated = prev.filter((u) => u.id !== usuarioId);
      usuariosRef.current = updated;
      return updated;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // FORCE RELOAD (para uso explícito quando necessário)
  // ═══════════════════════════════════════════════════════════════
  const forceReload = useCallback(async () => {
    hasLoadedRef.current = false;
    return await loadUsuarios();
  }, [loadUsuarios]);

  // ═══════════════════════════════════════════════════════════════
  // PROVIDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <UsuariosContext.Provider
      value={{
        usuarios,
        loading,
        loadUsuarios,
        refreshUsuarios,
        addUsuario,
        updateUsuario,
        removeUsuario,
        forceReload,
      }}
    >
      {children}
    </UsuariosContext.Provider>
  );
}

export function useUsuarios() {
  return useContext(UsuariosContext);
}
