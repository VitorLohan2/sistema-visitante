import {
  useState,
  useEffect,
  useContext,
  createContext,
  useRef,
  useCallback,
} from "react";
import { clearCache } from "../services/cacheService";
import { disconnect as disconnectSocket } from "../services/socketService";
import {
  validateToken,
  getUserFromToken,
  shouldRefreshToken,
  getTokenTimeRemaining,
} from "../utils/tokenUtils";
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
    logger.log(
      "⚠️ forceLogout: AuthContext não disponível, limpando manualmente",
    );
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    sessionStorage.clear();
    window.location.href = "/";
  }
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const isLoggingOutRef = useRef(false);
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    checkAuthStatus();
    return () => {
      // Limpa o timer de refresh ao desmontar
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  /**
   * Agenda o refresh proativo do token.
   * Calcula quando faltam 5 min para expirar e agenda a chamada.
   */
  const scheduleTokenRefresh = useCallback((token) => {
    // Limpa timer anterior
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const timeRemaining = getTokenTimeRemaining(token);
    if (timeRemaining <= 0) return;

    // Agenda refresh para 5 minutos antes da expiração
    const REFRESH_MARGIN = 5 * 60 * 1000; // 5 min
    const refreshIn = Math.max(timeRemaining - REFRESH_MARGIN, 0);

    logger.log(
      `🔄 Token refresh agendado para daqui a ${Math.round(refreshIn / 60000)} min`,
    );

    refreshTimerRef.current = setTimeout(async () => {
      logger.log("🔄 Executando refresh proativo do token...");
      try {
        const currentToken = localStorage.getItem("token");
        if (!currentToken) return;

        const baseURL =
          process.env.REACT_APP_API_URL || "http://localhost:3001";
        const response = await fetch(`${baseURL}/auth/refresh-token`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Atualiza token no localStorage
          localStorage.setItem("token", data.token);
          localStorage.setItem(
            "usuario",
            JSON.stringify({
              id: data.usuario.id,
              nome: data.usuario.nome,
              email: data.usuario.email,
              isAdmin: data.usuario.isAdmin || false,
              empresa_id: data.usuario.empresa_id,
              setor_id: data.usuario.setor_id,
            }),
          );

          // Atualiza estado do React
          setUser({
            id: data.usuario.id,
            nome: data.usuario.nome,
            name: data.usuario.nome,
            email: data.usuario.email,
            isAdmin: data.usuario.isAdmin || false,
            empresa_id: data.usuario.empresa_id,
            setor_id: data.usuario.setor_id,
          });

          logger.log("✅ Token renovado com sucesso");

          // Agenda o próximo refresh
          scheduleTokenRefresh(data.token);
        } else {
          logger.warn("⚠️ Falha ao renovar token, status:", response.status);
          // Se o refresh falhou com 401, o token expirou além do período de graça
          if (response.status === 401) {
            logout();
          }
        }
      } catch (error) {
        logger.error("❌ Erro ao renovar token:", error);
      }
    }, refreshIn);
  }, []);

  /**
   * Verifica o status de autenticação na inicialização.
   *
   * CORREÇÃO PRINCIPAL: Agora valida o token JWT (decodifica e verifica exp),
   * em vez de apenas checar se existe no localStorage.
   * Isso impede que um usuário com token expirado seja considerado "logado".
   */
  const checkAuthStatus = () => {
    const token = localStorage.getItem("token");

    // ──────────────────────────────────────────────────────────────
    // VALIDAÇÃO DO TOKEN JWT
    // O token é a ÚNICA fonte da verdade para o estado de login.
    // ──────────────────────────────────────────────────────────────
    const validation = validateToken(token);

    if (validation.valid) {
      // Token válido — extrai dados do usuário do payload do token
      const tokenUser = getUserFromToken(token);

      // Tenta enriquecer com dados do localStorage (podem ter campos extras)
      const usuarioStr = localStorage.getItem("usuario");
      let enrichedUser = tokenUser;

      if (usuarioStr) {
        try {
          const storedUser = JSON.parse(usuarioStr);
          enrichedUser = { ...tokenUser, ...storedUser };
        } catch {
          // Se o parse falhar, usa apenas os dados do token
        }
      }

      setIsAuthenticated(true);
      setUser({
        id: enrichedUser.id,
        nome: enrichedUser.nome,
        name: enrichedUser.nome,
        email: enrichedUser.email,
        isAdmin: enrichedUser.isAdmin || false,
        empresa_id: enrichedUser.empresa_id,
        setor_id: enrichedUser.setor_id,
      });
      setLoading(false);

      // Agenda refresh proativo do token
      scheduleTokenRefresh(token);

      // Se o token está próximo de expirar, tenta refresh imediato
      if (shouldRefreshToken(token)) {
        logger.log("⚠️ Token próximo de expirar, tentando refresh imediato...");
        scheduleTokenRefresh(token); // Vai disparar quase imediatamente
      }

      return;
    }

    // ──────────────────────────────────────────────────────────────
    // TOKEN INVÁLIDO OU AUSENTE
    // Limpa tudo e força estado deslogado.
    // ──────────────────────────────────────────────────────────────
    if (token) {
      // Havia um token mas ele é inválido/expirado — limpeza silenciosa
      logger.log(
        `🔐 Token inválido na inicialização (${validation.reason}). Limpando sessão.`,
      );
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      // Limpa cache de dados (mas preserva dados de versão)
      clearCache();
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

    setIsAuthenticated(true);
    setUser({
      id: usuario.id,
      nome: usuario.nome,
      name: usuario.nome,
      email: usuario.email,
      isAdmin: usuario.isAdmin || false,
      empresa_id: usuario.empresa_id,
      setor_id: usuario.setor_id,
    });

    // Agenda refresh proativo para o novo token
    scheduleTokenRefresh(token);
  };

  const logout = () => {
    // Evita múltiplas chamadas de logout
    if (isLoggingOutRef.current) {
      logger.log("⚠️ Logout já em andamento, ignorando chamada duplicada");
      return;
    }
    isLoggingOutRef.current = true;

    logger.log("🔐 Fazendo logout...");

    // Cancela timer de refresh
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Desconecta o Socket.IO
    disconnectSocket();

    // Limpa o cache de dados
    clearCache();

    // Remove todos os dados
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

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
