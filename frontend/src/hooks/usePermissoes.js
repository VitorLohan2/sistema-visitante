// src/hooks/usePermissoes.js
import { useState, useEffect, useCallback, useRef } from "react";
import permissoesService from "../services/permissoesService";
import { getPermissoesCache } from "../services/cacheService";

/**
 * Hook para gerenciar permissões do usuário no React
 *
 * OTIMIZADO: Inicializa com cache para evitar "piscar" na UI
 * - Primeiro verifica o cache (memória + sessionStorage)
 * - Se existir, usa imediatamente sem loading
 * - Se não existir, carrega da API
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
  // INICIALIZAÇÃO COM CACHE (evita "piscar" na UI)
  // ═══════════════════════════════════════════════════════════════
  const initialCacheRef = useRef(() => {
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
  // Se já tem cache, não mostra loading
  const [loading, setLoading] = useState(!initialData.hasCache);

  // Ref para evitar carregamentos duplicados
  const isLoadedRef = useRef(initialData.hasCache);

  // Carregar permissões ao montar (apenas se não tiver cache)
  useEffect(() => {
    let isMounted = true;

    async function carregarPermissoes() {
      // Se já carregou ou já tem cache válido, não recarrega
      if (isLoadedRef.current) {
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
        console.error("Erro ao carregar permissões:", error);
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
   */
  const temPermissao = useCallback(
    (permissao) => {
      // ADMIN tem todas as permissões
      if (papeis.includes("ADMIN")) {
        return true;
      }
      return permissoes.includes(permissao);
    },
    [permissoes, papeis]
  );

  /**
   * Verifica se o usuário tem alguma das permissões
   */
  const temAlgumaPermissao = useCallback(
    (permissoesRequeridas) => {
      if (papeis.includes("ADMIN")) {
        return true;
      }
      return permissoesRequeridas.some((p) => permissoes.includes(p));
    },
    [permissoes, papeis]
  );

  /**
   * Verifica se o usuário tem todas as permissões
   */
  const temTodasPermissoes = useCallback(
    (permissoesRequeridas) => {
      if (papeis.includes("ADMIN")) {
        return true;
      }
      return permissoesRequeridas.every((p) => permissoes.includes(p));
    },
    [permissoes, papeis]
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
      console.error("Erro ao recarregar permissões:", error);
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
