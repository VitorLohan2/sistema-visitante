/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONTEXTO: Autenticação
 * Gerencia estado de autenticação global do aplicativo
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import authService from "../services/authService";
import { limparCachePermissoes } from "../services/permissoesService";

// ═══════════════════════════════════════════════════════════════════════════════
// CRIAÇÃO DO CONTEXTO
// ═══════════════════════════════════════════════════════════════════════════════

const AuthContext = createContext({});

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export function AuthProvider({ children }) {
  // Estados
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICAÇÃO INICIAL
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    verificarAutenticacao();
  }, []);

  /**
   * Verifica se existe sessão válida ao iniciar o app
   */
  const verificarAutenticacao = useCallback(async () => {
    try {
      const [token, usuarioStr] = await AsyncStorage.multiGet([
        "@Auth:token",
        "@Auth:usuario",
      ]);

      if (token[1] && usuarioStr[1]) {
        const dadosUsuario = JSON.parse(usuarioStr[1]);
        setUsuario(dadosUsuario);
        setAutenticado(true);
      } else {
        setUsuario(null);
        setAutenticado(false);
      }
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
      setUsuario(null);
      setAutenticado(false);
    } finally {
      setCarregando(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DE AUTENTICAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Realiza login do usuário
   * @param {string} email - Email do usuário
   * @param {string} senha - Senha do usuário
   */
  const login = useCallback(async (email, senha) => {
    const { usuario: dadosUsuario } = await authService.login(email, senha);
    setUsuario(dadosUsuario);
    setAutenticado(true);
    return dadosUsuario;
  }, []);

  /**
   * Realiza logout do usuário
   */
  const logout = useCallback(async () => {
    await authService.logout();
    await limparCachePermissoes();
    setUsuario(null);
    setAutenticado(false);
  }, []);

  /**
   * Atualiza dados do usuário na sessão
   * @param {object} novosDados - Novos dados do usuário
   */
  const atualizarUsuario = useCallback(
    async (novosDados) => {
      const dadosAtualizados = { ...usuario, ...novosDados };
      await AsyncStorage.setItem(
        "@Auth:usuario",
        JSON.stringify(dadosAtualizados)
      );
      setUsuario(dadosAtualizados);
    },
    [usuario]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // VALOR DO CONTEXTO
  // ═══════════════════════════════════════════════════════════════════════════

  const valor = {
    // Estados
    usuario,
    carregando,
    autenticado,

    // Funções
    login,
    logout,
    atualizarUsuario,
    verificarAutenticacao,
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK DE USO
// ═══════════════════════════════════════════════════════════════════════════════

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }

  return context;
}

export default AuthContext;
