import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { FiTrash2, FiPlus } from "react-icons/fi";
import api from "../../services/api";
import { usePermissoes } from "../../hooks/usePermissoes";
import "./styles.css";

export default function GeradorCodigo() {
  const [codigos, setCodigos] = useState([]);
  const [novoCodigo, setNovoCodigo] = useState("");
  const [limiteUsos, setLimiteUsos] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const history = useHistory();
  const ongName = localStorage.getItem("ongName");

  const { isAdmin, temPermissao, loading: permissoesLoading } = usePermissoes();

  useEffect(() => {
    // ✅ VERIFICAÇÃO DE ACESSO VIA RBAC
    const checkAuth = async () => {
      try {
        const ongId = localStorage.getItem("ongId");

        console.log("=== DEBUG FRONTEND INICIAL ===");
        console.log("ongId:", ongId);
        console.log("ongName:", ongName);

        // Se não tiver ID, redirecionar para login
        if (!ongId) {
          alert("Sessão expirada. Faça login novamente.");
          history.push("/");
          return;
        }

        // Aguarda carregamento das permissões
        if (permissoesLoading) return;

        // ✅ Verificar permissão via RBAC
        const podeAcessar = isAdmin || temPermissao("codigo_visualizar");
        if (!podeAcessar) {
          alert("Somente administradores tem permissão!");
          history.push("/listagem-visitante");
          return;
        }

        // Só carregar códigos após confirmar permissão
        carregarCodigos();
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        history.push("/listagem-visitante");
      }
    };

    checkAuth();
  }, [history, isAdmin, temPermissao, permissoesLoading]);

  const carregarCodigos = async () => {
    try {
      const ongId = localStorage.getItem("ongId");

      // ✅ DEBUG DETALHADO:
      console.log("=== DEBUG CARREGAR CÓDIGOS ===");
      console.log("ongId enviado:", ongId);
      console.log("Tipo do ongId:", typeof ongId);
      console.log("ongId é null/undefined?", ongId == null);

      if (!ongId) {
        throw new Error("ID da ONG não encontrado no localStorage");
      }

      console.log("Fazendo requisição para /codigos...");

      const response = await api.get("/codigos", {
        headers: {
          Authorization: ongId,
          "Content-Type": "application/json",
        },
      });

      console.log("✅ Resposta recebida:", response.data);
      setCodigos(response.data);
    } catch (error) {
      console.log("=== ERRO DETALHADO ===");
      console.log("Erro completo:", error);
      console.log("Status do erro:", error.response?.status);
      console.log("Data do erro:", error.response?.data);
      console.log("Headers da requisição:", error.config?.headers);
      console.log("URL da requisição:", error.config?.url);

      // ✅ TRATAMENTO ESPECÍFICO DE ERROS:
      let errorMessage = "Erro ao carregar códigos";
      let shouldRedirect = false;

      if (error.response?.status === 403) {
        errorMessage = "Somente administradores tem permissão!";
        shouldRedirect = !!error.response?.data?.redirectTo;
        console.log(
          "❌ Erro 403: Usuário não é ADM ou problema de autorização"
        );
      } else if (error.response?.status === 404) {
        errorMessage = "ONG não encontrada. Faça login novamente.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      alert(errorMessage);

      // ✅ REDIRECIONAMENTO ESPECÍFICO PARA NÃO-ADM
      if (shouldRedirect && error.response?.data?.redirectTo) {
        history.push(error.response.data.redirectTo);
        return;
      }

      // Se for erro de autorização, redirecionar para login
      if (error.response?.status === 401 || error.response?.status === 404) {
        localStorage.clear();
        history.push("/");
      }
    }
  };

  const handleGerarCodigo = async () => {
    if (!novoCodigo.trim()) {
      alert("Preencha o nome do código!");
      return;
    }

    if (limiteUsos < 1) {
      alert("O limite de usos deve ser pelo menos 1!");
      return;
    }

    setIsGenerating(true);

    try {
      console.log("=== GERANDO CÓDIGO ===");
      console.log("Código:", novoCodigo);
      console.log("Limite de usos:", limiteUsos);

      await api.post(
        "/codigos",
        {
          codigo: novoCodigo.trim(),
          limite_usos: parseInt(limiteUsos),
        },
        {
          headers: {
            Authorization: localStorage.getItem("ongId"),
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Código criado com sucesso");
      setNovoCodigo("");
      setLimiteUsos(1);
      await carregarCodigos();
      alert("Código criado com sucesso!");
    } catch (error) {
      console.log("❌ Erro ao gerar código:", error.response?.data);

      // ✅ Tratar erro de permissão
      if (error.response?.status === 403) {
        alert("Somente administradores tem permissão!");
        history.push("/listagem-visitante");
        return;
      }

      alert(error.response?.data?.error || "Erro ao criar código");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDesativarTemporario = async (id) => {
    if (!window.confirm("Deseja desativar este código?")) return;

    try {
      setIsProcessing(true);
      console.log("Desativando código ID:", id);

      await api.put(
        `/codigos/${id}/desativar`,
        {},
        {
          headers: {
            Authorization: localStorage.getItem("ongId"),
            "Content-Type": "application/json",
          },
        }
      );

      await carregarCodigos();
      alert("Código desativado com sucesso!");
    } catch (error) {
      console.log("Erro ao desativar código:", error.response?.data);

      // ✅ Tratar erro de permissão
      if (error.response?.status === 403) {
        alert("Somente administradores tem permissão!");
        history.push("/listagem-visitante");
        return;
      }

      alert(error.response?.data?.error || "Erro ao desativar código");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAtivarCodigo = async (id) => {
    if (!window.confirm("Deseja reativar este código?")) return;

    try {
      setIsProcessing(true);
      console.log("Ativando código ID:", id);

      await api.put(
        `/codigos/${id}/ativar`,
        {},
        {
          headers: {
            Authorization: localStorage.getItem("ongId"),
            "Content-Type": "application/json",
          },
        }
      );

      await carregarCodigos();
      alert("Código reativado com sucesso!");
    } catch (error) {
      console.log("Erro ao ativar código:", error.response?.data);

      // ✅ Tratar erro de permissão
      if (error.response?.status === 403) {
        alert("Somente administradores tem permissão!");
        history.push("/listagem-visitante");
        return;
      }

      alert(error.response?.data?.error || "Erro ao ativar código");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletarCodigoPermanentemente = async (id) => {
    if (
      !window.confirm(
        "Excluir permanentemente este código? Essa ação não pode ser desfeita."
      )
    )
      return;

    try {
      setIsProcessing(true);
      console.log("Deletando código ID:", id);

      await api.delete(`/codigos/${id}/delete`, {
        headers: {
          Authorization: localStorage.getItem("ongId"),
          "Content-Type": "application/json",
        },
      });

      await carregarCodigos();
      alert("Código excluído permanentemente!");
    } catch (error) {
      console.log("Erro ao deletar código:", error.response?.data);

      // ✅ Tratar erro de permissão
      if (error.response?.status === 403) {
        alert("Somente administradores tem permissão!");
        history.push("/listagem-visitante");
        return;
      }

      alert(error.response?.data?.error || "Erro ao excluir código");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="gerador-container">
      <header>
        <div className="ajuste-Titulo">
          <div className="page-title-group">
            <h1 className="page-title">Código de Cadastro</h1>
          </div>
        </div>
      </header>

      <div className="content">
        <section className="gerador-section">
          <div className="gerador-form-inline">
            <input
              className="input-codigo"
              placeholder="Nome do código (ex: DIME2025)"
              value={novoCodigo}
              onChange={(e) => setNovoCodigo(e.target.value.toUpperCase())}
              disabled={isGenerating || isProcessing}
              maxLength={20}
            />
            <input
              className="input-limite"
              type="number"
              placeholder="Limite de usos"
              min="1"
              max="1000"
              value={limiteUsos}
              onChange={(e) =>
                setLimiteUsos(Math.max(1, parseInt(e.target.value) || 1))
              }
              disabled={isGenerating || isProcessing}
            />
            <button
              onClick={handleGerarCodigo}
              className="gerar-button"
              disabled={isGenerating || isProcessing || !novoCodigo.trim()}
            >
              <FiPlus size={16} />
              Gerar Código
            </button>
          </div>

          <div className="gerador-table-container">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Usos</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {codigos.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center" }}>
                      Nenhum código cadastrado ainda
                    </td>
                  </tr>
                ) : (
                  codigos.map((codigo) => (
                    <tr key={codigo.id}>
                      <td>
                        <strong>{codigo.codigo}</strong>
                        {codigo.criado_por_nome && (
                          <div style={{ fontSize: "0.8em", color: "#666" }}>
                            por: {codigo.criado_por_nome}
                          </div>
                        )}
                      </td>
                      <td>
                        {codigo.usos_atuais || 0} / {codigo.limite_usos}
                      </td>
                      <td>
                        <span
                          className={
                            codigo.ativo ? "status-ativo" : "status-inativo"
                          }
                        >
                          {codigo.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="actions">
                        <div className="actions-container">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={codigo.ativo}
                              onChange={() =>
                                codigo.ativo
                                  ? handleDesativarTemporario(codigo.id)
                                  : handleAtivarCodigo(codigo.id)
                              }
                              disabled={isProcessing}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                          <button
                            onClick={() =>
                              handleDeletarCodigoPermanentemente(codigo.id)
                            }
                            className="delete-permanent-button"
                            title="Excluir permanentemente"
                            disabled={isProcessing}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
