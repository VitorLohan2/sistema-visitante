// src/hooks/usePermissoes.js
import { useState, useEffect, useCallback } from "react";
import permissoesService from "../services/permissoesService";

/**
 * Hook para gerenciar permissões do usuário no React
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
  const [permissoes, setPermissoes] = useState([]);
  const [papeis, setPapeis] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carregar permissões ao montar
  useEffect(() => {
    let isMounted = true;

    async function carregarPermissoes() {
      try {
        const dados = await permissoesService.buscarMinhasPermissoes();
        if (isMounted) {
          setPermissoes(dados.permissoes || []);
          setPapeis(dados.papeis || []);
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
    permissoesService.limparCachePermissoes();
    try {
      const dados = await permissoesService.buscarMinhasPermissoes();
      setPermissoes(dados.permissoes || []);
      setPapeis(dados.papeis || []);
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
