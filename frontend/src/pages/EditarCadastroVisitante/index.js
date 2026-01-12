// src/pages/EditarCadastroVisitante/index.js
import React, { useState, useEffect } from "react";
import { Link, useHistory, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import api from "../../services/api";
import { getCache, setCache } from "../../services/cacheService";
import { usePermissoes } from "../../hooks/usePermissoes";
import "./styles.css";
import logoImg from "../../assets/logo.svg";

export default function EditarCadastroVisitante() {
  // Lista de cores pré-definidas (mesmo do cadastro)
  const opcoesCores = [
    "PRETO",
    "BRANCO",
    "PRATA",
    "CINZA",
    "VERMELHO",
    "AZUL",
    "VERDE",
    "AMARELO",
    "LARANJA",
  ];

  const [form, setForm] = useState({
    nome: "",
    nascimento: "",
    cpf: "",
    empresa: "",
    setor: "",
    telefone: "",
    placa_veiculo: "",
    cor_veiculo: "",
    observacao: "",
    bloqueado: false,
  });

  const history = useHistory();
  const { id } = useParams();
  const [empresas, setEmpresas] = useState([]);
  const [setores, setSetores] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [avatar, setAvatar] = useState("");
  const [errors, setErrors] = useState({
    placa_veiculo: "",
    cor_veiculo: "",
  });

  const { isAdmin, temPermissao } = usePermissoes();

  useEffect(() => {
    async function loadData() {
      try {
        // ✅ Primeiro verifica se já tem empresas e setores no cache
        const cachedEmpresas = getCache("empresas");
        const cachedSetores = getCache("setores");

        // Busca dados do visitante (sempre da API - dados específicos)
        const incidentRes = await api.get(`/cadastro-visitantes/${id}`);
        const data = incidentRes.data;

        setForm({
          ...data,
          cpf: formatCPF(data.cpf || ""),
          telefone: formatTelefone(data.telefone || ""),
          placa_veiculo: formatPlaca(data.placa_veiculo || ""),
          bloqueado: Boolean(data.bloqueado),
        });

        setFotos(data.fotos || []);
        setAvatar(data.avatar_imagem || data.fotos?.[0] || "");

        // Usa cache para empresas e setores se disponível
        if (cachedEmpresas && cachedSetores) {
          console.log("📦 Usando empresas e setores do cache");
          setEmpresas(cachedEmpresas);
          setSetores(cachedSetores);
        } else {
          // Se não tem cache, busca da API
          const [empresasRes, setoresRes] = await Promise.all([
            api.get("/empresas-visitantes"),
            api.get("/setores-visitantes"),
          ]);

          const empresasData = empresasRes.data;
          const setoresData = setoresRes.data;

          // Salva no cache
          setCache("empresas", empresasData);
          setCache("setores", setoresData);

          setEmpresas(empresasData);
          setSetores(setoresData);
        }
      } catch (err) {
        alert("Erro ao carregar dados do incidente");
        history.push("/listagem-visitante");
      }
    }

    loadData();
  }, [id, history]);

  // === Funções de formatação (iguais ao cadastro) ===
  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/(\d{3})(\d{3})(\d{3})(\d{2})/);
    return match ? `${match[1]}.${match[2]}.${match[3]}-${match[4]}` : value;
  };

  const formatTelefone = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return value;
  };

  // ← FUNÇÃO PARA FORMATAR PLACA (igual ao cadastro)
  const formatPlaca = (value) => {
    const cleaned = value
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 7);

    if (cleaned.length <= 3) {
      return cleaned;
    }

    // Formato Mercosul: AAA1A11 ou Formato antigo: AAA1111
    if (cleaned.length > 3) {
      return `${cleaned.slice(0, 3)}${cleaned.slice(3, 4)}${cleaned.slice(4, 5)}${cleaned.slice(5, 7)}`;
    }

    return cleaned;
  };

  // ← VALIDAÇÃO DE PLACA EM TEMPO REAL (igual ao cadastro)
  const validatePlaca = (value) => {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleaned.length > 0 && cleaned.length < 7) {
      setErrors((prev) => ({
        ...prev,
        placa_veiculo: "Placa deve ter 7 caracteres",
      }));
    } else {
      setErrors((prev) => ({
        ...prev,
        placa_veiculo: "",
      }));
    }
  };

  // === Handlers ===
  const handleChange = (e) => {
    const { name, value } = e.target;

    let newValue = value;

    if (name === "nome") {
      newValue = value.toUpperCase();
    } else if (name === "placa_veiculo") {
      newValue = formatPlaca(value); // Formata a placa
      validatePlaca(newValue); // Valida em tempo real
    }

    setForm((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleCpfChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setForm((prev) => ({ ...prev, cpf: formatted }));
  };

  const handleTelefoneChange = (e) => {
    const formatted = formatTelefone(e.target.value);
    setForm((prev) => ({ ...prev, telefone: formatted }));
  };

  // Nova função para lidar com o bloqueio
  const handleBlockChange = async (e) => {
    if (!isAdmin) return;

    const novoEstado = e.target.checked;

    try {
      await api.put(`/cadastro-visitantes/${id}/bloquear`, {
        bloqueado: novoEstado,
      });
      setForm((prev) => ({ ...prev, bloqueado: novoEstado }));
      alert(
        `Cadastro ${novoEstado ? "bloqueado" : "desbloqueado"} com sucesso!`
      );
    } catch (err) {
      console.error("Erro ao atualizar bloqueio:", err);
      alert(
        err.response?.data?.error || "Erro ao atualizar status de bloqueio"
      );
      setForm((prev) => ({ ...prev, bloqueado: !novoEstado }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cpfClean = form.cpf.replace(/\D/g, "");
    const telefoneClean = form.telefone.replace(/\D/g, "");
    const placaClean = form.placa_veiculo
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    // Limpa erros anteriores
    setErrors({
      placa_veiculo: "",
      cor_veiculo: "",
    });

    if (cpfClean.length !== 11) {
      return alert("CPF inválido. Deve conter 11 dígitos.");
    }

    if (telefoneClean.length !== 11) {
      return alert("Telefone inválido. Deve conter 11 dígitos com DDD.");
    }

    if (!form.empresa || !form.setor) {
      return alert("Empresa e setor são obrigatórios.");
    }

    // ← VALIDAÇÃO: Se tem placa, deve ter cor (igual ao cadastro)
    const hasPlaca = placaClean.trim().length > 0;
    const hasCor = form.cor_veiculo.trim().length > 0;

    if (hasPlaca && !hasCor) {
      setErrors((prev) => ({
        ...prev,
        cor_veiculo: "Cor do veículo é obrigatória quando a placa é informada",
      }));
      return alert("Por favor, selecione a cor do veículo.");
    }

    if (hasCor && !hasPlaca) {
      setErrors((prev) => ({
        ...prev,
        placa_veiculo:
          "Placa do veículo é obrigatória quando a cor é informada",
      }));
      alert("Por favor, preencha a placa do veículo.");
      return;
    }

    // Valida formato da placa
    if (hasPlaca && placaClean.length < 7) {
      setErrors((prev) => ({
        ...prev,
        placa_veiculo: "Placa deve ter 7 caracteres",
      }));
      return alert("Placa do veículo deve ter 7 caracteres.");
    }

    const payload = {
      nome: form.nome,
      nascimento: form.nascimento,
      cpf: cpfClean,
      empresa: form.empresa,
      setor: form.setor,
      telefone: telefoneClean,
      placa_veiculo: placaClean, // ← INCLUIR PLACA NO PAYLOAD
      cor_veiculo: form.cor_veiculo, // ← INCLUIR COR NO PAYLOAD
      observacao: form.observacao,
      avatar_imagem: avatar,
    };

    try {
      await api.put(`/cadastro-visitantes/${id}`, payload, {
        headers: {
          authorization: localStorage.getItem("ongId"),
        },
      });

      // Socket.IO vai sincronizar automaticamente com outros usuários

      alert("Dados atualizados com sucesso!");
      history.push("/listagem-visitante");
    } catch (err) {
      console.error("Erro na atualização:", err.response?.data || err);
      alert(err.response?.data?.error || "Erro ao atualizar incidente");
    }
  };

  return (
    <div className="new-incident-container">
      <div className="content">
        <section>
          <img src={logoImg} alt="Logo" width="350px" />
          <h1>Editar Cadastro</h1>
          <p>Atualize os dados do cadastro.</p>
          <Link className="back-link" to="/listagem-visitante">
            <FiArrowLeft size={16} color="#e02041" />
            Voltar
          </Link>
        </section>

        <form onSubmit={handleSubmit}>
          <input
            name="nome"
            placeholder="Nome"
            value={form.nome}
            onChange={handleChange}
            required
            disabled={!isAdmin}
          />

          <input
            type="date"
            name="nascimento"
            value={form.nascimento}
            onChange={handleChange}
            required
            disabled={!isAdmin}
          />

          <input
            name="cpf"
            placeholder="CPF"
            value={form.cpf}
            onChange={handleCpfChange}
            maxLength={14}
            required
            disabled={!isAdmin}
          />

          <select
            name="empresa"
            value={form.empresa}
            onChange={handleChange}
            required
          >
            <option value="">Empresa</option>
            {empresas.map((opt) => (
              <option key={opt.id} value={opt.nome}>
                {opt.nome}
              </option>
            ))}
          </select>

          <select
            name="setor"
            value={form.setor}
            onChange={handleChange}
            required
          >
            <option value="">Setor</option>
            {setores.map((opt) => (
              <option key={opt.id} value={opt.nome}>
                {opt.nome}
              </option>
            ))}
          </select>

          {/* ← CAMPOS DE PLACA E COR (iguais ao cadastro) */}
          <input
            name="placa_veiculo"
            placeholder="Placa do Veículo (ex: ABC1D23)"
            value={form.placa_veiculo}
            onChange={handleChange}
            maxLength={7}
            className={errors.placa_veiculo ? "error" : ""}
          />
          {errors.placa_veiculo && (
            <span className="error-message">{errors.placa_veiculo}</span>
          )}

          <select
            name="cor_veiculo"
            value={form.cor_veiculo}
            onChange={handleChange}
            className={errors.cor_veiculo ? "error" : ""}
          >
            <option value="">Selecione a cor</option>
            {opcoesCores.map((cor) => (
              <option key={cor} value={cor}>
                {cor}
              </option>
            ))}
          </select>
          {errors.cor_veiculo && (
            <span className="error-message">{errors.cor_veiculo}</span>
          )}

          <input
            name="telefone"
            placeholder="(DD)99999-9999"
            value={form.telefone}
            onChange={handleTelefoneChange}
            maxLength={15}
            required
          />

          <div className="checkbox-container">
            <input
              type="checkbox"
              id="bloqueado-checkbox"
              checked={form.bloqueado}
              onChange={handleBlockChange}
              disabled={!isAdmin}
              className={!isAdmin ? "disabled-checkbox" : ""}
            />
            <label htmlFor="bloqueado-checkbox">
              {form.bloqueado ? "✅ Cadastro Bloqueado" : "⛔ Bloquear Acesso"}
            </label>
          </div>

          <textarea
            name="observacao"
            placeholder="Observações"
            value={form.observacao}
            onChange={handleChange}
          />

          {fotos.length > 0 && (
            <div className="photo-selector">
              <h3>Selecionar Avatar</h3>
              <div className="photo-list">
                {fotos.map((foto, index) => (
                  <img
                    key={index}
                    src={foto}
                    alt={`Foto ${index + 1}`}
                    className={`photo-item ${avatar === foto ? "selected" : ""}`}
                    onClick={() => setAvatar(foto)}
                  />
                ))}
              </div>
            </div>
          )}

          <button className="button" type="submit">
            Atualizar
          </button>
        </form>
      </div>
    </div>
  );
}
