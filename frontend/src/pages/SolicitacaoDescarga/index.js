// src/pages/SolicitacaoDescarga/index.js
import React, { useState } from "react";
import {
  FiTruck,
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiPackage,
  FiFileText,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiHash,
} from "react-icons/fi";
import api from "../../services/api";
import logoImg from "../../assets/logo.svg";
import "./styles.css";

// Constantes
const TIPOS_VEICULO = [
  "Caminhão Baú",
  "Caminhão Truck",
  "Carreta",
  "Van",
  "Furgão",
  "Caminhonete",
  "Outro",
];

const ETAPAS = [
  { id: 1, titulo: "Empresa", icone: FiUser },
  { id: 2, titulo: "Motorista", icone: FiTruck },
  { id: 3, titulo: "Agendamento", icone: FiCalendar },
];

export default function SolicitacaoDescarga() {
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sucesso, setSucesso] = useState(null);
  const [erro, setErro] = useState(null);

  const [formData, setFormData] = useState({
    // Empresa
    empresa_nome: "",
    empresa_cnpj: "",
    empresa_email: "",
    empresa_contato: "",
    empresa_telefone: "",
    // Motorista
    motorista_nome: "",
    motorista_cpf: "",
    placa_veiculo: "",
    tipo_veiculo: "",
    transportadora_nome: "",
    // Agendamento
    tipo_carga: "",
    horario_solicitado: "",
    observacao: "",
    quantidade_volumes: "",
  });

  const [notasFiscais, setNotasFiscais] = useState([""]);
  const [errosCampo, setErrosCampo] = useState({});

  // Formatadores
  const formatarCNPJ = (valor) => {
    const numeros = valor.replace(/\D/g, "").slice(0, 14);
    return numeros
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const formatarCPF = (valor) => {
    const numeros = valor.replace(/\D/g, "").slice(0, 11);
    return numeros
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const formatarTelefone = (valor) => {
    const numeros = valor.replace(/\D/g, "").slice(0, 11);
    if (numeros.length <= 10) {
      return numeros.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return numeros.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  const formatarPlaca = (valor) => {
    return valor
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 7);
  };

  // Validações
  const validarCNPJ = (cnpj) => {
    cnpj = cnpj.replace(/[^\d]/g, "");
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado != digitos.charAt(0)) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    return resultado == digitos.charAt(1);
  };

  const validarCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]/g, "");
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    return resto === parseInt(cpf.charAt(10));
  };

  const validarEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handler de mudança
  const handleChange = (e) => {
    const { name, value } = e.target;
    let valorFormatado = value;

    switch (name) {
      case "empresa_cnpj":
        valorFormatado = formatarCNPJ(value);
        break;
      case "motorista_cpf":
        valorFormatado = formatarCPF(value);
        break;
      case "empresa_telefone":
        valorFormatado = formatarTelefone(value);
        break;
      case "placa_veiculo":
        valorFormatado = formatarPlaca(value);
        break;
      case "empresa_nome":
      case "motorista_nome":
      case "transportadora_nome":
        valorFormatado = value.toUpperCase();
        break;
      case "quantidade_volumes":
        valorFormatado = value.replace(/\D/g, "");
        break;
      default:
        break;
    }

    setFormData((prev) => ({ ...prev, [name]: valorFormatado }));
    setErrosCampo((prev) => ({ ...prev, [name]: "" }));
  };

  // Validação por etapa
  const validarEtapa = (etapa) => {
    const erros = {};

    switch (etapa) {
      case 1:
        if (!formData.empresa_nome.trim()) {
          erros.empresa_nome = "Nome da empresa é obrigatório";
        }
        if (!formData.empresa_cnpj) {
          erros.empresa_cnpj = "CNPJ é obrigatório";
        } else if (!validarCNPJ(formData.empresa_cnpj)) {
          erros.empresa_cnpj = "CNPJ inválido";
        }
        if (!formData.empresa_email) {
          erros.empresa_email = "E-mail é obrigatório";
        } else if (!validarEmail(formData.empresa_email)) {
          erros.empresa_email = "E-mail inválido";
        }
        if (!formData.empresa_contato || !formData.empresa_contato.trim()) {
          erros.empresa_contato = "Nome do solicitante é obrigatório";
        }
        if (!formData.empresa_telefone) {
          erros.empresa_telefone = "Telefone é obrigatório";
        } else if (formData.empresa_telefone.replace(/\D/g, "").length < 10) {
          erros.empresa_telefone = "Telefone inválido";
        }
        break;

      case 2:
        if (!formData.motorista_nome.trim()) {
          erros.motorista_nome = "Nome do motorista é obrigatório";
        }
        if (!formData.motorista_cpf) {
          erros.motorista_cpf = "CPF é obrigatório";
        } else if (!validarCPF(formData.motorista_cpf)) {
          erros.motorista_cpf = "CPF inválido";
        }
        if (!formData.placa_veiculo) {
          erros.placa_veiculo = "Placa é obrigatória";
        } else if (formData.placa_veiculo.length < 7) {
          erros.placa_veiculo = "Placa deve ter 7 caracteres";
        }
        if (!formData.tipo_veiculo) {
          erros.tipo_veiculo = "Tipo de veículo é obrigatório";
        }
        if (
          !formData.transportadora_nome ||
          !formData.transportadora_nome.trim()
        ) {
          erros.transportadora_nome = "Nome da transportadora é obrigatório";
        }
        break;

      case 3:
        if (!formData.tipo_carga.trim()) {
          erros.tipo_carga = "Tipo de carga é obrigatório";
        }
        if (!formData.horario_solicitado) {
          erros.horario_solicitado = "Data/hora é obrigatória";
        } else {
          const dataHorario = new Date(formData.horario_solicitado);
          if (dataHorario <= new Date()) {
            erros.horario_solicitado = "Data/hora deve ser no futuro";
          }
        }
        if (
          !formData.quantidade_volumes ||
          parseInt(formData.quantidade_volumes) <= 0
        ) {
          erros.quantidade_volumes = "Quantidade de volumes é obrigatória";
        }
        break;

      default:
        break;
    }

    setErrosCampo(erros);
    return Object.keys(erros).length === 0;
  };

  // Navegação
  const proximaEtapa = () => {
    if (validarEtapa(etapaAtual)) {
      setEtapaAtual((prev) => Math.min(prev + 1, ETAPAS.length));
    }
  };

  const etapaAnterior = () => {
    setEtapaAtual((prev) => Math.max(prev - 1, 1));
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarEtapa(3)) return;

    setIsSubmitting(true);
    setErro(null);

    try {
      // Filtrar notas fiscais preenchidas
      const notasPreenchidas = notasFiscais.filter((nf) => nf.trim() !== "");

      const dadosEnvio = {
        empresa_nome: formData.empresa_nome,
        empresa_cnpj: formData.empresa_cnpj,
        empresa_email: formData.empresa_email,
        empresa_contato: formData.empresa_contato,
        empresa_telefone: formData.empresa_telefone,
        motorista_nome: formData.motorista_nome,
        motorista_cpf: formData.motorista_cpf,
        placa_veiculo: formData.placa_veiculo,
        tipo_veiculo: formData.tipo_veiculo,
        transportadora_nome: formData.transportadora_nome,
        tipo_carga: formData.tipo_carga,
        observacao: formData.observacao || null,
        horario_solicitado: formData.horario_solicitado,
        notas_fiscais: notasPreenchidas.length > 0 ? notasPreenchidas.join(", ") : null,
        quantidade_volumes: parseInt(formData.quantidade_volumes),
      };

      console.log("=== DADOS ENVIADOS ===", dadosEnvio);

      const response = await api.post("/solicitacoes-descarga", dadosEnvio);

      setSucesso({
        message: response.data.message,
        protocolo: response.data.protocolo,
      });
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error);
      setErro(
        error.response?.data?.error ||
          "Erro ao enviar solicitação. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nova solicitação
  const novaSolicitacao = () => {
    setFormData({
      empresa_nome: "",
      empresa_cnpj: "",
      empresa_email: "",
      empresa_contato: "",
      empresa_telefone: "",
      motorista_nome: "",
      motorista_cpf: "",
      placa_veiculo: "",
      tipo_veiculo: "",
      transportadora_nome: "",
      tipo_carga: "",
      horario_solicitado: "",
      observacao: "",
      quantidade_volumes: "",
    });
    setNotasFiscais([""]);
    setEtapaAtual(1);
    setSucesso(null);
    setErro(null);
    setErrosCampo({});
  };

  // Data mínima (próxima hora)
  const minDateTime = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  // Tela de sucesso
  if (sucesso) {
    return (
      <div className="sd-page">
        <div className="sd-card sd-sucesso">
          <div className="sd-sucesso-icon">
            <FiCheckCircle size={80} />
          </div>
          <h1>Solicitação Enviada!</h1>
          <p>{sucesso.message}</p>

          <div className="sd-protocolo-box">
            <span className="sd-protocolo-label">Seu Protocolo:</span>
            <span className="sd-protocolo-numero">{sucesso.protocolo}</span>
          </div>

          <p className="sd-sucesso-info">
            Você receberá um e-mail de confirmação em{" "}
            <strong>{formData.empresa_email}</strong>
          </p>
          <p className="sd-sucesso-info">
            Aguarde o contato da nossa equipe para confirmação do agendamento.
          </p>

          <button className="sd-btn-nova" onClick={novaSolicitacao}>
            Nova Solicitação
          </button>
        </div>
      </div>
    );
  }

  // Calcula a largura da barra de progresso do stepper
  const calcularProgressoStepper = () => {
    if (etapaAtual === 1) return 0;
    if (etapaAtual === 2) return 50;
    return 100;
  };

  return (
    <div className="sd-page">
      <div className="sd-card">
        {/* Header */}
        <header className="sd-header">
          <img src={logoImg} alt="Logo" className="sd-logo" />
          <div className="sd-header-content">
            <h1>Agendamento de Descarga</h1>
            <p>Preencha o formulário para solicitar um horário de descarga</p>
          </div>
        </header>

        {/* Stepper */}
        <div className="sd-stepper-container">
          <div className="sd-stepper">
            <div
              className="sd-stepper-progress"
              style={{
                width: `calc(${calcularProgressoStepper()}% - ${calcularProgressoStepper() === 100 ? "30px" : calcularProgressoStepper() === 50 ? "15px" : "0px"})`,
              }}
            />
            {ETAPAS.map((etapa) => (
              <div
                key={etapa.id}
                className={`sd-step ${etapaAtual >= etapa.id ? "sd-active" : ""} ${etapaAtual > etapa.id ? "sd-completed" : ""}`}
              >
                <div className="sd-step-circle">
                  {etapaAtual > etapa.id ? (
                    <span>✓</span>
                  ) : (
                    <span>{etapa.id}</span>
                  )}
                </div>
                <span className="sd-step-label">{etapa.titulo}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Erro geral */}
        {erro && (
          <div className="sd-erro-geral">
            <FiAlertCircle />
            <span>{erro}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="sd-form">
          {/* Etapa 1 - Empresa */}
          {etapaAtual === 1 && (
            <div className="sd-form-etapa">
              <h2>
                <FiUser /> Dados da Empresa
              </h2>

              <div className="sd-form-group">
                <label htmlFor="empresa_nome">
                  Nome da Empresa
                  <span className="sd-obrigatorio">*</span>
                </label>
                <input
                  type="text"
                  id="empresa_nome"
                  name="empresa_nome"
                  value={formData.empresa_nome}
                  onChange={handleChange}
                  placeholder="NOME DA EMPRESA LTDA"
                  className={errosCampo.empresa_nome ? "sd-erro" : ""}
                />
                {errosCampo.empresa_nome && (
                  <span className="sd-erro-campo">
                    {errosCampo.empresa_nome}
                  </span>
                )}
              </div>

              <div className="sd-form-row">
                <div className="sd-form-group">
                  <label htmlFor="empresa_cnpj">
                    CNPJ
                    <span className="sd-obrigatorio">*</span>
                  </label>
                  <input
                    type="text"
                    id="empresa_cnpj"
                    name="empresa_cnpj"
                    value={formData.empresa_cnpj}
                    onChange={handleChange}
                    placeholder="00.000.000/0000-00"
                    className={errosCampo.empresa_cnpj ? "sd-erro" : ""}
                  />
                  {errosCampo.empresa_cnpj && (
                    <span className="sd-erro-campo">
                      {errosCampo.empresa_cnpj}
                    </span>
                  )}
                </div>

                <div className="sd-form-group">
                  <label htmlFor="empresa_email">
                    <FiMail /> E-mail
                    <span className="sd-obrigatorio">*</span>
                  </label>
                  <input
                    type="email"
                    id="empresa_email"
                    name="empresa_email"
                    value={formData.empresa_email}
                    onChange={handleChange}
                    placeholder="contato@empresa.com.br"
                    className={errosCampo.empresa_email ? "sd-erro" : ""}
                  />
                  {errosCampo.empresa_email && (
                    <span className="sd-erro-campo">
                      {errosCampo.empresa_email}
                    </span>
                  )}
                </div>
              </div>

              <div className="sd-form-row">
                <div className="sd-form-group">
                  <label htmlFor="empresa_contato">
                    Nome do Solicitante{" "}
                    <span className="sd-obrigatorio">*</span>
                  </label>
                  <input
                    type="text"
                    id="empresa_contato"
                    name="empresa_contato"
                    value={formData.empresa_contato}
                    onChange={handleChange}
                    placeholder="João Silva"
                    className={errosCampo.empresa_contato ? "sd-erro" : ""}
                  />
                  {errosCampo.empresa_contato && (
                    <span className="sd-erro-campo">
                      {errosCampo.empresa_contato}
                    </span>
                  )}
                </div>

                <div className="sd-form-group">
                  <label htmlFor="empresa_telefone">
                    <FiPhone /> Telefone{" "}
                    <span className="sd-obrigatorio">*</span>
                  </label>
                  <input
                    type="text"
                    id="empresa_telefone"
                    name="empresa_telefone"
                    value={formData.empresa_telefone}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                    className={errosCampo.empresa_telefone ? "sd-erro" : ""}
                  />
                  {errosCampo.empresa_telefone && (
                    <span className="sd-erro-campo">
                      {errosCampo.empresa_telefone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Etapa 2 - Motorista/Veículo */}
          {etapaAtual === 2 && (
            <div className="sd-form-etapa">
              <h2>
                <FiTruck /> Motorista e Veículo
              </h2>

              <div className="sd-form-row">
                <div className="sd-form-group">
                  <label htmlFor="motorista_nome">Nome do Motorista *</label>
                  <input
                    type="text"
                    id="motorista_nome"
                    name="motorista_nome"
                    value={formData.motorista_nome}
                    onChange={handleChange}
                    placeholder="NOME COMPLETO DO MOTORISTA"
                    className={errosCampo.motorista_nome ? "sd-erro" : ""}
                  />
                  {errosCampo.motorista_nome && (
                    <span className="sd-erro-campo">
                      {errosCampo.motorista_nome}
                    </span>
                  )}
                </div>

                <div className="sd-form-group">
                  <label htmlFor="motorista_cpf">CPF do Motorista *</label>
                  <input
                    type="text"
                    id="motorista_cpf"
                    name="motorista_cpf"
                    value={formData.motorista_cpf}
                    onChange={handleChange}
                    placeholder="000.000.000-00"
                    className={errosCampo.motorista_cpf ? "sd-erro" : ""}
                  />
                  {errosCampo.motorista_cpf && (
                    <span className="sd-erro-campo">
                      {errosCampo.motorista_cpf}
                    </span>
                  )}
                </div>
              </div>

              <div className="sd-form-row">
                <div className="sd-form-group">
                  <label htmlFor="placa_veiculo">Placa do Veículo *</label>
                  <input
                    type="text"
                    id="placa_veiculo"
                    name="placa_veiculo"
                    value={formData.placa_veiculo}
                    onChange={handleChange}
                    placeholder="ABC1D23"
                    maxLength={7}
                    className={errosCampo.placa_veiculo ? "sd-erro" : ""}
                  />
                  {errosCampo.placa_veiculo && (
                    <span className="sd-erro-campo">
                      {errosCampo.placa_veiculo}
                    </span>
                  )}
                </div>

                <div className="sd-form-group">
                  <label htmlFor="tipo_veiculo">
                    Tipo de Veículo <span className="sd-obrigatorio">*</span>
                  </label>
                  <select
                    id="tipo_veiculo"
                    name="tipo_veiculo"
                    value={formData.tipo_veiculo}
                    onChange={handleChange}
                    className={errosCampo.tipo_veiculo ? "sd-erro" : ""}
                  >
                    <option value="">Selecione</option>
                    {TIPOS_VEICULO.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                  {errosCampo.tipo_veiculo && (
                    <span className="sd-erro-campo">
                      {errosCampo.tipo_veiculo}
                    </span>
                  )}
                </div>
              </div>

              <div className="sd-form-group">
                <label htmlFor="transportadora_nome">
                  <FiTruck /> Nome da Transportadora{" "}
                  <span className="sd-obrigatorio">*</span>
                </label>
                <input
                  type="text"
                  id="transportadora_nome"
                  name="transportadora_nome"
                  value={formData.transportadora_nome}
                  onChange={handleChange}
                  placeholder="NOME DA TRANSPORTADORA"
                  className={errosCampo.transportadora_nome ? "sd-erro" : ""}
                />
                {errosCampo.transportadora_nome && (
                  <span className="sd-erro-campo">
                    {errosCampo.transportadora_nome}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Etapa 3 - Agendamento */}
          {etapaAtual === 3 && (
            <div className="sd-form-etapa">
              <h2>
                <FiCalendar /> Dados do Agendamento
              </h2>

              <div className="sd-form-row">
                <div className="sd-form-group">
                  <label htmlFor="horario_solicitado">
                    <FiCalendar /> Data e Hora Desejada *
                  </label>
                  <input
                    type="datetime-local"
                    id="horario_solicitado"
                    name="horario_solicitado"
                    value={formData.horario_solicitado}
                    onChange={handleChange}
                    min={minDateTime}
                    className={errosCampo.horario_solicitado ? "sd-erro" : ""}
                  />
                  {errosCampo.horario_solicitado && (
                    <span className="sd-erro-campo">
                      {errosCampo.horario_solicitado}
                    </span>
                  )}
                </div>
              </div>

              {/* Notas Fiscais */}
              <div className="sd-form-group">
                <label>
                  <FiFileText /> Notas Fiscais (Opcional)
                </label>
                <div className="sd-notas-fiscais">
                  {notasFiscais.map((nota, index) => (
                    <div key={index} className="sd-nota-fiscal-row">
                      <input
                        type="text"
                        value={nota}
                        onChange={(e) => {
                          const novas = [...notasFiscais];
                          novas[index] = e.target.value;
                          setNotasFiscais(novas);
                          setErrosCampo((prev) => ({
                            ...prev,
                            notas_fiscais: "",
                          }));
                        }}
                        placeholder={`Nota Fiscal ${index + 1}`}
                        className={
                          errosCampo.notas_fiscais && index === 0
                            ? "sd-erro"
                            : ""
                        }
                      />
                      {notasFiscais.length > 1 && (
                        <button
                          type="button"
                          className="sd-btn-remover-nota"
                          onClick={() => {
                            const novas = notasFiscais.filter(
                              (_, i) => i !== index
                            );
                            setNotasFiscais(novas);
                          }}
                          title="Remover nota fiscal"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="sd-btn-adicionar-nota"
                    onClick={() => setNotasFiscais([...notasFiscais, ""])}
                  >
                    <FiPlus /> Adicionar Nota Fiscal
                  </button>
                </div>
                {errosCampo.notas_fiscais && (
                  <span className="sd-erro-campo">
                    {errosCampo.notas_fiscais}
                  </span>
                )}
              </div>

              <div className="sd-form-row">
                <div className="sd-form-group">
                  <label htmlFor="quantidade_volumes">
                    <FiHash /> Quantidade de Volumes *
                  </label>
                  <input
                    type="text"
                    id="quantidade_volumes"
                    name="quantidade_volumes"
                    value={formData.quantidade_volumes}
                    onChange={handleChange}
                    placeholder="Ex: 10"
                    className={errosCampo.quantidade_volumes ? "sd-erro" : ""}
                  />
                  {errosCampo.quantidade_volumes && (
                    <span className="sd-erro-campo">
                      {errosCampo.quantidade_volumes}
                    </span>
                  )}
                </div>

                <div className="sd-form-group">
                  <label htmlFor="tipo_carga">
                    <FiPackage /> Tipo de Carga *
                  </label>
                  <input
                    type="text"
                    id="tipo_carga"
                    name="tipo_carga"
                    value={formData.tipo_carga}
                    onChange={handleChange}
                    placeholder="Ex: Material de escritório, Equipamentos..."
                    className={errosCampo.tipo_carga ? "sd-erro" : ""}
                  />
                  {errosCampo.tipo_carga && (
                    <span className="sd-erro-campo">
                      {errosCampo.tipo_carga}
                    </span>
                  )}
                </div>
              </div>

              <div className="sd-form-group">
                <label htmlFor="observacao">
                  <FiFileText /> Observações
                </label>
                <textarea
                  id="observacao"
                  name="observacao"
                  value={formData.observacao}
                  onChange={handleChange}
                  placeholder="Informações adicionais sobre a descarga (opcional)"
                  rows={4}
                  maxLength={500}
                />
                <small className="sd-char-count">
                  {formData.observacao.length}/500
                </small>
              </div>

              {/* Resumo */}
              <div className="sd-resumo">
                <h3>📋 Resumo da Solicitação</h3>
                <div className="sd-resumo-grid">
                  <div className="sd-resumo-item">
                    <span className="sd-resumo-label">Empresa:</span>
                    <span className="sd-resumo-valor">
                      {formData.empresa_nome}
                    </span>
                  </div>
                  <div className="sd-resumo-item">
                    <span className="sd-resumo-label">CNPJ:</span>
                    <span className="sd-resumo-valor">
                      {formData.empresa_cnpj}
                    </span>
                  </div>
                  <div className="sd-resumo-item">
                    <span className="sd-resumo-label">Motorista:</span>
                    <span className="sd-resumo-valor">
                      {formData.motorista_nome}
                    </span>
                  </div>
                  <div className="sd-resumo-item">
                    <span className="sd-resumo-label">Placa:</span>
                    <span className="sd-resumo-valor">
                      {formData.placa_veiculo}
                    </span>
                  </div>
                  {formData.transportadora_nome && (
                    <div className="sd-resumo-item">
                      <span className="sd-resumo-label">Transportadora:</span>
                      <span className="sd-resumo-valor">
                        {formData.transportadora_nome}
                      </span>
                    </div>
                  )}
                  <div className="sd-resumo-item">
                    <span className="sd-resumo-label">Notas Fiscais:</span>
                    <span className="sd-resumo-valor">
                      {notasFiscais
                        .filter((nf) => nf.trim() !== "")
                        .join(", ") || "-"}
                    </span>
                  </div>
                  <div className="sd-resumo-item">
                    <span className="sd-resumo-label">Volumes:</span>
                    <span className="sd-resumo-valor">
                      {formData.quantidade_volumes || "-"}
                    </span>
                  </div>
                  <div className="sd-resumo-item">
                    <span className="sd-resumo-label">Tipo de Carga:</span>
                    <span className="sd-resumo-valor">
                      {formData.tipo_carga}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botões de navegação */}
          <div className="sd-form-actions">
            {etapaAtual > 1 && (
              <button
                type="button"
                className="sd-btn-voltar"
                onClick={etapaAnterior}
              >
                <FiArrowLeft /> Voltar
              </button>
            )}

            {etapaAtual < ETAPAS.length && (
              <button
                type="button"
                className="sd-btn-avancar"
                onClick={proximaEtapa}
              >
                Avançar <FiArrowRight />
              </button>
            )}

            {etapaAtual === ETAPAS.length && (
              <button
                type="submit"
                className="sd-btn-enviar"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="sd-spinner"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <FiCheckCircle /> Enviar Solicitação
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        {/* Footer */}
        <footer className="sd-footer">
          <p>Após o envio, você receberá um e-mail de confirmação.</p>
          <p>
            Aguarde o contato da nossa equipe para a validação do agendamento.
          </p>
        </footer>
      </div>
    </div>
  );
}
