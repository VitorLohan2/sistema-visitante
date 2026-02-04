import { useState, useEffect, useContext, createContext, useRef } from "react";
import { clearCache } from "../services/cacheService";
import { disconnect as disconnectSocket } from "../services/socketService";
import logger from "../utils/logger";

const AuthContext = createContext({});

// Referência global para a função de logout (chamada de fora do React)
let globalLogoutRef = null;

/**
 * Função de logout global que pode ser chamada de fora do React
 * (ex: interceptor do Axios em api.js)
 */
export function forceLogout() {
  if (globalLogoutRef) {
    globalLogoutRef();
  } else {
    // Fallback: limpa manualmente se o contexto não estiver disponível
    logger.log("⚠️ forceLogout: AuthContext não disponível, limpando manualmente");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("ongId");
    localStorage.removeItem("ongName");
    localStorage.removeItem("ongType");
    sessionStorage.clear();
    window.location.href = "/";
  }
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    // Suporta tanto o novo formato (token/usuario) quanto o legado (ongId/ongName/ongType)
    const token = localStorage.getItem("token");
    const usuarioStr = localStorage.getItem("usuario");

    // Dados legados (para compatibilidade)
    const ongId = localStorage.getItem("ongId");
    const ongName = localStorage.getItem("ongName");

    // Primeiro tenta o novo formato
    if (token && usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        setIsAuthenticated(true);
        setUser({
          id: usuario.id,
          nome: usuario.nome,
          name: usuario.nome, // Alias para compatibilidade
          email: usuario.email,
          isAdmin: usuario.isAdmin || false,
          empresa_id: usuario.empresa_id,
          setor_id: usuario.setor_id,
          // Propriedades legadas para compatibilidade
          ongId: usuario.id,
          ongName: usuario.nome,
        });
        return setLoading(false);
      } catch (error) {
        logger.error("Erro ao fazer parse do usuário:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
      }
    }

    // Fallback para formato legado
    if (ongId) {
      setIsAuthenticated(true);
      setUser({
        id: ongId,
        nome: ongName || "",
        name: ongName || "", // Alias
        email: "",
        isAdmin: false,
        empresa_id: null,
        setor_id: null,
        // Propriedades legadas
        ongId: ongId,
        ongName: ongName || "",
      });
      setLoading(false);
      return;
    }

    setIsAuthenticated(false);
    setUser(null);
    setLoading(false);
  };

  const login = (token, usuario) => {
    logger.log("Fazendo login com:", usuario.email || usuario.nome);

    localStorage.setItem("token", token);
    localStorage.setItem(
      "usuario",
      JSON.stringify({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        isAdmin: usuario.isAdmin || false,
        empresa_id: usuario.empresa_id,
        setor_id: usuario.setor_id,
      }),
    );

    // Também salva no formato legado para compatibilidade
    localStorage.setItem("ongId", usuario.id);
    localStorage.setItem("ongName", usuario.nome);

    setIsAuthenticated(true);
    setUser({
      id: usuario.id,
      nome: usuario.nome,
      name: usuario.nome,
      email: usuario.email,
      isAdmin: usuario.isAdmin || false,
      empresa_id: usuario.empresa_id,
      setor_id: usuario.setor_id,
      ongId: usuario.id,
      ongName: usuario.nome,
    });
  };

  const logout = () => {
    // Evita múltiplas chamadas de logout
    if (isLoggingOutRef.current) {
      logger.log("⚠️ Logout já em andamento, ignorando chamada duplicada");
      return;
    }
    isLoggingOutRef.current = true;

    logger.log("🔐 Fazendo logout...");

    // Desconecta o Socket.IO
    disconnectSocket();

    // Limpa o cache de dados
    clearCache();

    // Remove todos os dados (novo e legado)
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("ongId");
    localStorage.removeItem("ongName");
    localStorage.removeItem("ongType");

    // Limpa sessionStorage
    sessionStorage.clear();

    setIsAuthenticated(false);
    setUser(null);

    // Redireciona para a página inicial
    window.location.href = "/";
  };

  // Expõe a função de logout globalmente
  useEffect(() => {
    globalLogoutRef = logout;
    return () => {
      globalLogoutRef = null;
    };
  }, []);

  /**
   * Verifica se o usuário é administrador
   * @returns {boolean}
   */
  const isAdmin = () => {
    return user?.isAdmin === true;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        user,
        login,
        logout,
        checkAuthStatus,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
};
