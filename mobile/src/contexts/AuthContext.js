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
import dadosApoioService from "../services/dadosApoioService";
import { clearCache, restoreCache, setCache } from "../services/cacheService";

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
  const [dadosCarregados, setDadosCarregados] = useState(false);

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
      // Restaura cache do AsyncStorage
      await restoreCache();

      const [token, usuarioStr] = await AsyncStorage.multiGet([
        "@Auth:token",
        "@Auth:usuario",
      ]);

      if (token[1] && usuarioStr[1]) {
        const dadosUsuario = JSON.parse(usuarioStr[1]);
        setUsuario(dadosUsuario);
        setAutenticado(true);

        // Carrega dados de apoio em segundo plano
        carregarDadosApoio();
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
  // CARREGAMENTO DE DADOS (igual ao frontend)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Carrega todos os dados de apoio no cache
   * Executado no login e na verificação inicial
   */
  const carregarDadosApoio = useCallback(async () => {
    try {
      console.log("🔄 [AUTH] Carregando dados de apoio...");
      await dadosApoioService.carregarTodosDados();
      setDadosCarregados(true);
      console.log("✅ [AUTH] Dados de apoio carregados");
    } catch (error) {
      console.error("❌ [AUTH] Erro ao carregar dados de apoio:", error);
      // Não falha o login por causa disso, os dados serão carregados sob demanda
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
  const login = useCallback(
    async (email, senha) => {
      const { usuario: dadosUsuario } = await authService.login(email, senha);
      setUsuario(dadosUsuario);
      setAutenticado(true);

      // Salva dados do usuário no cache
      await setCache("userData", dadosUsuario);

      // Carrega dados de apoio após login
      carregarDadosApoio();

      return dadosUsuario;
    },
    [carregarDadosApoio],
  );

  /**
   * Realiza logout do usuário
   */
  const logout = useCallback(async () => {
    await authService.logout();
    await limparCachePermissoes();
    await clearCache(); // Limpa todo o cache
    setUsuario(null);
    setAutenticado(false);
    setDadosCarregados(false);
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
        JSON.stringify(dadosAtualizados),
      );
      await setCache("userData", dadosAtualizados);
      setUsuario(dadosAtualizados);
    },
    [usuario],
  );

  /**
   * Força atualização do cache de dados de apoio
   */
  const atualizarCache = useCallback(async () => {
    try {
      setDadosCarregados(false);
      await dadosApoioService.atualizarCache();
      setDadosCarregados(true);
    } catch (error) {
      console.error("Erro ao atualizar cache:", error);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // VALOR DO CONTEXTO
  // ═══════════════════════════════════════════════════════════════════════════

  const valor = {
    // Estados
    usuario,
    carregando,
    autenticado,
    dadosCarregados,

    // Funções
    login,
    logout,
    atualizarUsuario,
    verificarAutenticacao,
    atualizarCache,
    carregarDadosApoio,
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
