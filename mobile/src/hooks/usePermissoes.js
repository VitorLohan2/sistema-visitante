/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOOK: usePermissoes
 * Gerencia permissões RBAC do usuário no React Native
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from "react";
import permissoesService from "../services/permissoesService";

/**
 * Hook para gerenciar permissões do usuário
 *
 * @example
 * const { temPermissao, carregando, permissoes } = usePermissoes();
 *
 * if (carregando) return <Loading />;
 *
 * {temPermissao('cadastro_criar') && <BotaoCadastrar />}
 */
export function usePermissoes() {
  // Estados
  const [permissoes, setPermissoes] = useState([]);
  const [papeis, setPapeis] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Ref para evitar carregamentos duplicados
  const carregouRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // CARREGAMENTO INICIAL
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    let montado = true;

    async function carregar() {
      if (carregouRef.current) return;

      try {
        const dados = await permissoesService.buscarMinhasPermissoes();

        if (montado) {
          setPermissoes(dados.permissoes || []);
          setPapeis(dados.papeis || []);
          carregouRef.current = true;
        }
      } catch (error) {
        console.error("Erro ao carregar permissões:", error);
      } finally {
        if (montado) {
          setCarregando(false);
        }
      }
    }

    carregar();

    return () => {
      montado = false;
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DE VERIFICAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verifica se usuário tem determinada permissão
   * Usa apenas RBAC - sem privilégios automáticos
   */
  const temPermissao = useCallback(
    (permissao) => {
      return permissoes.includes(permissao);
    },
    [permissoes]
  );

  /**
   * Verifica se usuário tem alguma das permissões
   */
  const temAlgumaPermissao = useCallback(
    (permissoesRequeridas) => {
      return permissoesRequeridas.some((p) => permissoes.includes(p));
    },
    [permissoes]
  );

  /**
   * Verifica se usuário tem todas as permissões
   */
  const temTodasPermissoes = useCallback(
    (permissoesRequeridas) => {
      return permissoesRequeridas.every((p) => permissoes.includes(p));
    },
    [permissoes]
  );

  /**
   * Recarrega permissões da API
   */
  const recarregar = useCallback(async () => {
    setCarregando(true);
    carregouRef.current = false;

    await permissoesService.limparCachePermissoes();

    try {
      const dados = await permissoesService.buscarMinhasPermissoes();
      setPermissoes(dados.permissoes || []);
      setPapeis(dados.papeis || []);
      carregouRef.current = true;
    } catch (error) {
      console.error("Erro ao recarregar permissões:", error);
    } finally {
      setCarregando(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETORNO
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    permissoes,
    papeis,
    carregando,
    temPermissao,
    temAlgumaPermissao,
    temTodasPermissoes,
    recarregar,
  };
}

export default usePermissoes;
