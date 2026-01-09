import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { usePermissoes } from "./usePermissoes";

/**
 * Hook para verificar autenticação de administrador
 * Usa o sistema RBAC para verificar permissões
 *
 * @param {Object} opcoes - Opções de configuração
 * @param {boolean} opcoes.requerAdmin - Se true, redireciona usuários não-ADM
 * @param {string} opcoes.rotaRetorno - Rota para redirecionar se não autorizado (default: '/profile')
 * @param {string} opcoes.permissaoRequerida - Permissão específica requerida (opcional)
 * @returns {Object} { usuarioId, usuarioNome, verificando, eAdmin, temPermissao }
 */
export function useAutenticacaoAdmin(opcoes = {}) {
  const {
    requerAdmin = true,
    rotaRetorno = "/listagem-visitante",
    permissaoRequerida = null,
  } = opcoes;

  const [usuarioId, setUsuarioId] = useState(null);
  const [usuarioNome, setUsuarioNome] = useState("");
  const [verificando, setVerificando] = useState(true);
  const history = useHistory();

  const {
    isAdmin,
    temPermissao,
    loading: permissoesLoading,
    papeis,
  } = usePermissoes();

  useEffect(() => {
    const verificarAutenticacao = async () => {
      const ongId = localStorage.getItem("ongId");
      const ongName = localStorage.getItem("ongName");

      // Verifica se está logado
      if (!ongId) {
        alert("Sessão expirada. Faça login novamente.");
        history.push("/");
        return;
      }

      // Aguarda carregamento das permissões RBAC
      if (permissoesLoading) return;

      // Verifica permissão específica se fornecida
      if (permissaoRequerida) {
        const temPermissaoEspecifica =
          temPermissao(permissaoRequerida) || isAdmin;
        if (!temPermissaoEspecifica) {
          alert("Você não tem permissão para acessar esta página!");
          history.push(rotaRetorno);
          return;
        }
      }
      // Verifica se é admin (se requerido e sem permissão específica)
      else if (requerAdmin && !isAdmin) {
        alert("Somente administradores tem permissão!");
        history.push(rotaRetorno);
        return;
      }

      setUsuarioId(ongId);
      setUsuarioNome(ongName || "");
      setVerificando(false);
    };

    verificarAutenticacao();
  }, [
    history,
    requerAdmin,
    rotaRetorno,
    permissaoRequerida,
    permissoesLoading,
    isAdmin,
    temPermissao,
  ]);

  return {
    usuarioId,
    usuarioNome,
    verificando,
    eAdmin: isAdmin,
    temPermissao,
    papeis,
  };
}

/**
 * Hook simples para obter dados do usuário logado sem verificação de admin
 * @returns {Object} { usuarioId, usuarioNome, papeis, isAdmin }
 */
export function useUsuarioLogado() {
  const [dados, setDados] = useState({
    usuarioId: null,
    usuarioNome: "",
  });

  const { isAdmin, papeis } = usePermissoes();

  useEffect(() => {
    const ongId = localStorage.getItem("ongId");
    const ongName = localStorage.getItem("ongName");

    setDados({
      usuarioId: ongId,
      usuarioNome: ongName || "",
    });
  }, []);

  return {
    ...dados,
    isAdmin,
    papeis,
  };
}

export default useAutenticacaoAdmin;
