import React, { useState, useEffect, useRef } from "react";
import { Link, useHistory } from "react-router-dom";
import { FiArrowLeft, FiCheck } from "react-icons/fi";
import api from "../../services/api";
import { usePermissoes } from "../../hooks/usePermissoes";
import "./styles.css";
import logoImg from "../../assets/logo.svg";

export default function CadastrarEmpresaVisitantes() {
  const [form, setForm] = useState({
    nome: "",
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const history = useHistory();
  const ongName = localStorage.getItem("ongName");
  const isMounted = useRef(true);

  const { isAdmin, temPermissao, loading: permissoesLoading } = usePermissoes();

  // ✅ VERIFICAR AUTENTICAÇÃO VIA RBAC
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const ongId = localStorage.getItem("ongId");

        if (!ongId) {
          history.push("/");
          return;
        }

        // Aguarda carregamento das permissões
        if (permissoesLoading) return;

        // ✅ Verificar permissão via RBAC
        const podeAcessar = isAdmin || temPermissao("empresa_criar");
        if (!podeAcessar) {
          alert("Somente administradores tem permissão!");
          history.push("/listagem-visitante");
          return;
        }
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

  // ✅ Efeito para fechar o modal automaticamente
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
      }, 1000); // Modal desaparece após 1 segundos

      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nome.trim()) {
      alert("Por favor, informe o nome da empresa");
      return;
    }

    try {
      await api.post("/empresas-visitantes", form);

      if (isMounted.current) {
        setShowSuccessModal(true);
        // Limpar o formulário após o sucesso
        setForm({ nome: "" });
      }
    } catch (error) {
      if (isMounted.current) {
        // ✅ Tratar erro de permissão
        if (error.response?.status === 403) {
          alert("Somente administradores tem permissão!");
          history.push("/listagem-visitante");
          return;
        }

        const errorMessage =
          error.response?.data?.error || "Erro ao cadastrar empresa";
        alert(errorMessage);
      }
    }
  };

  const handleNomeChange = (e) => {
    setForm({ ...form, nome: e.target.value.toUpperCase() });
  };

  return (
    <div className="form-container">
      <header>
        <div className="ajuste-Titulo">
          <img src={logoImg} alt="DIME" />
          <span>Bem-vindo(a), {ongName}</span>
        </div>
        <Link className="back-link" to="/listagem-visitante">
          <FiArrowLeft size={16} color="#E02041" />
          Voltar
        </Link>
      </header>

      <div className="empresa-visitante-content">
        <section className="form-section">
          <h1>Cadastrar Empresa</h1>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Nome da Empresa:</label>
              <input
                value={form.nome}
                onChange={handleNomeChange}
                required
                placeholder="Digite o nome da empresa"
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="save-button"
                disabled={!form.nome.trim()}
              >
                Salvar Empresa
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* ✅ Modal de Sucesso */}
      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-icon">
              <FiCheck size={48} color="#28a745" />
            </div>
            <h3>Cadastro Realizado!</h3>
            <p>Empresa cadastrada com sucesso!</p>
          </div>
        </div>
      )}
    </div>
  );
}
