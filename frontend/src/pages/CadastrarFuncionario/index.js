import React, { useState, useEffect, useRef } from "react";
import { Link, useHistory } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import api from "../../services/api";
import { usePermissoes } from "../../hooks/usePermissoes";
import "./styles.css";
import logoImg from "../../assets/logo.svg";
import Loading from "../../components/Loading";

// Dados estruturais dos setores e funções
const setoresEFuncoes = {
  EXPEDIÇÃO: [
    "TRAINEE GESTÃO LOGÍSTICA",
    "TRAINEE ASSIST. DE EXPEDIÇÃO",
    "ASSISTENTE DE EXPEDIÇÃO I",
    "ASSIST. DE EXPEDIÇÃO II",
    "ASSIST. DE EXPEDIÇÃO III",
    "ASSIST. DE EXPEDIÇÃO IV",
    "AUXILIAR DE EXPEDIÇÃO",
    "ASSIST. DE SALA NOBRE",
    "CONFERENTE DE CARGA I",
    "CONFERENTE DE CARGA II",
    "AUX. CONFERENTE DE CARGA",
    "MECANICO DE VEICULOS",
    "MANOBRISTA",
    "LAVADOR DE VEICULOS II",
  ],
  ADMINISTRATIVO: [
    "ASSISTENTE ADMINISTRATIVO",
    "ANALISTA ADMINISTRATIVO",
    "GERENTE ADMINISTRATIVO",
  ],
};

export default function CadastrarFuncionario() {
  const [form, setForm] = useState({
    cracha: "",
    nome: "",
    setor: "",
    funcao: "",
    data_admissao: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [funcoesDisponiveis, setFuncoesDisponiveis] = useState([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const history = useHistory();
  const ongName = localStorage.getItem("ongName");
  const isMounted = useRef(true);

  const { isAdmin, temPermissao, loading: permissoesLoading } = usePermissoes();

  // ✅ VERIFICAR AUTENTICAÇÃO VIA RBAC
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const ongId = localStorage.getItem("ongId");

        console.log("=== DEBUG CADASTRAR FUNCIONÁRIO ===");
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
        const podeAcessar = isAdmin || temPermissao("funcionario_criar");
        if (!podeAcessar) {
          alert("Somente administradores tem permissão!");
          history.push("/listagem-visitante");
          return;
        }

        setIsCheckingAuth(false);
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        history.push("/listagem-visitante");
      }
    };

    checkAuth();

    return () => {
      isMounted.current = false;
    };
  }, [history, isAdmin, temPermissao, permissoesLoading]);

  // Atualiza as funções disponíveis quando o setor é alterado
  useEffect(() => {
    if (form.setor && setoresEFuncoes[form.setor]) {
      setFuncoesDisponiveis(setoresEFuncoes[form.setor]);
      setForm((prev) => ({ ...prev, funcao: "" })); // Reseta a função quando muda o setor
    } else {
      setFuncoesDisponiveis([]);
    }
  }, [form.setor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post("/funcionarios", form, {
        headers: { Authorization: localStorage.getItem("ongId") },
      });

      if (isMounted.current) {
        alert("Funcionário cadastrado com sucesso!");
        history.push("/funcionarios");
      }
    } catch (error) {
      if (isMounted.current) {
        // ✅ Tratar erro de permissão
        if (error.response?.status === 403) {
          alert("Somente administradores tem permissão!");
          history.push("/listagem-visitante");
          return;
        }

        alert(error.response?.data?.error || "Erro ao cadastrar funcionário");
        setLoading(false);
      }
    }
  };

  const handleNomeChange = (e) => {
    // Converte o valor para maiúsculas e atualiza o estado
    setForm({ ...form, nome: e.target.value.toUpperCase() });
  };

  const handleCrachaChange = (e) => {
    // Remove todos os caracteres não numéricos
    const value = e.target.value.replace(/\D/g, "");
    setForm({ ...form, cracha: value });
  };

  // ✅ Mostrar loading enquanto verifica autenticação
  if (isCheckingAuth) {
    return <Loading progress={50} />;
  }

  return (
    <div className="form-container">
      {loading && <Loading progress={100} />}

      <header>
        <div className="ajuste-Titulo">
          <img src={logoImg} alt="DIME" />
          <span>Bem-vindo(a), {ongName}</span>
        </div>
        <Link className="back-link" to="/funcionarios">
          <FiArrowLeft size={16} color="#E02041" />
          Voltar
        </Link>
      </header>

      <div className="content">
        <section className="form-section">
          <h1>Cadastrar Novo Funcionário</h1>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Crachá:</label>
              <input
                value={form.cracha}
                onChange={handleCrachaChange}
                required
                maxLength="20"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>

            <div className="input-group">
              <label>Nome Completo:</label>
              <input value={form.nome} onChange={handleNomeChange} required />
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Setor:</label>
                <select
                  value={form.setor}
                  onChange={(e) => setForm({ ...form, setor: e.target.value })}
                  required
                  className="input-select" // Classe modificada para combinar com o estilo
                >
                  <option value="">Selecione um setor</option>
                  {Object.keys(setoresEFuncoes).map((setor) => (
                    <option key={setor} value={setor}>
                      {setor}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Função:</label>
                <select
                  value={form.funcao}
                  onChange={(e) => setForm({ ...form, funcao: e.target.value })}
                  required
                  disabled={!form.setor}
                  className="input-select" // Classe modificada para combinar com o estilo
                >
                  <option value="">Selecione uma função</option>
                  {funcoesDisponiveis.map((funcao) => (
                    <option key={funcao} value={funcao}>
                      {funcao}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>Data de Admissão:</label>
              <input
                type="date"
                value={form.data_admissao}
                onChange={(e) =>
                  setForm({ ...form, data_admissao: e.target.value })
                }
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="save-button" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Funcionário"}
              </button>
              <Link to="/funcionarios" className="cancel-button">
                Cancelar
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
