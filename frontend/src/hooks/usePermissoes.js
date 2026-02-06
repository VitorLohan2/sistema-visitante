// src/hooks/usePermissoes.js
import { useState, useEffect, useCallback, useRef } from "react";
import permissoesService from "../services/permissoesService";
import { getPermissoesCache } from "../services/cacheService";
import { validateToken } from "../utils/tokenUtils";
import logger from "../utils/logger";

/**
 * Hook para gerenciar permissões do usuário no React
 *
 * OTIMIZADO: Inicializa com cache para evitar "piscar" na UI
 * - Primeiro valida o token JWT (verifica expiração)
 * - Se token válido e cache existe, usa imediatamente sem loading
 * - Se token válido mas sem cache, carrega da API autenticada
 * - Se token inválido, não tenta carregar (evita requisições fúteis)
 *
 * IMPORTANTE: Permissões SÓ são carregadas após validação do token.
 * Isso garante que o RBAC depende exclusivamente da autenticação,
 * nunca de dados residuais no sessionStorage.
 *
 * @example
 * const { temPermissao, isAdmin, loading, papeis } = usePermissoes();
 *
 * if (loading) return <Loading />;
 *
 * {temPermissao('empresa_criar') && <BotaoCriarEmpresa />}
 * {isAdmin && <MenuAdmin />}
 */
export function usePermissoes() {
  // ═══════════════════════════════════════════════════════════════
  // VALIDAÇÃO DO TOKEN ANTES DE INICIALIZAR
  // Se o token é inválido, não faz sentido carregar permissões
  // ═══════════════════════════════════════════════════════════════
  const tokenValidRef = useRef(() => {
    const token = localStorage.getItem("token");
    return validateToken(token).valid;
  });

  const isTokenValid = tokenValidRef.current();

  // ═══════════════════════════════════════════════════════════════
  // INICIALIZAÇÃO COM CACHE (somente se token é válido)
  // ═══════════════════════════════════════════════════════════════
  const initialCacheRef = useRef(() => {
    if (!isTokenValid) {
      return { permissoes: [], papeis: [], hasCache: false };
    }
    const cached = getPermissoesCache();
    return {
      permissoes: cached.permissoes || [],
      papeis: cached.papeis || [],
      hasCache: !!(cached.permissoes && cached.papeis),
    };
  });

  const initialData = initialCacheRef.current();

  const [permissoes, setPermissoes] = useState(initialData.permissoes);
  const [papeis, setPapeis] = useState(initialData.papeis);
  // Se já tem cache e token válido, não mostra loading
  const [loading, setLoading] = useState(!initialData.hasCache && isTokenValid);

  // Ref para evitar carregamentos duplicados
  const isLoadedRef = useRef(initialData.hasCache);

  // Carregar permissões ao montar (apenas se não tiver cache e token válido)
  useEffect(() => {
    let isMounted = true;

    async function carregarPermissoes() {
      // Se já carregou ou já tem cache válido, não recarrega
      if (isLoadedRef.current) {
        return;
      }

      // Valida o token antes de tentar carregar
      const token = localStorage.getItem("token");
      const validation = validateToken(token);

      if (!validation.valid) {
        logger.log(
          `[usePermissoes] Token inválido (${validation.reason}), não carregando permissões`,
        );
        setLoading(false);
        return;
      }

      try {
        const dados = await permissoesService.buscarMinhasPermissoes();
        if (isMounted) {
          setPermissoes(dados.permissoes || []);
          setPapeis(dados.papeis || []);
          isLoadedRef.current = true;
        }
      } catch (error) {
        logger.error("Erro ao carregar permissões:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    carregarPermissoes();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Verifica se o usuário tem determinada permissão
   * Agora verifica SOMENTE as permissões RBAC atribuídas
   */
  const temPermissao = useCallback(
    (permissao) => {
      return permissoes.includes(permissao);
    },
    [permissoes],
  );

  /**
   * Verifica se o usuário tem alguma das permissões
   */
  const temAlgumaPermissao = useCallback(
    (permissoesRequeridas) => {
      return permissoesRequeridas.some((p) => permissoes.includes(p));
    },
    [permissoes],
  );

  /**
   * Verifica se o usuário tem todas as permissões
   */
  const temTodasPermissoes = useCallback(
    (permissoesRequeridas) => {
      return permissoesRequeridas.every((p) => permissoes.includes(p));
    },
    [permissoes],
  );

  /**
   * Verifica se é ADMIN
   */
  const isAdmin = papeis.includes("ADMIN");

  /**
   * Recarrega as permissões (útil após mudanças)
   */
  const recarregar = useCallback(async () => {
    setLoading(true);
    isLoadedRef.current = false;
    permissoesService.limparCachePermissoes();
    try {
      const dados = await permissoesService.buscarMinhasPermissoes();
      setPermissoes(dados.permissoes || []);
      setPapeis(dados.papeis || []);
      isLoadedRef.current = true;
    } catch (error) {
      logger.error("Erro ao recarregar permissões:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    permissoes,
    papeis,
    loading,
    temPermissao,
    temAlgumaPermissao,
    temTodasPermissoes,
    isAdmin,
    recarregar,
  };
}

export default usePermissoes;
