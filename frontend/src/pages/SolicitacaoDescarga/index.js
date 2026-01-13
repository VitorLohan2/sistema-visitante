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
} from "react-icons/fi";
import api from "../../services/api";
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
    // Agendamento
    tipo_carga: "",
    horario_solicitado: "",
    observacao: "",
  });

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
        valorFormatado = value.toUpperCase();
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
      const response = await api.post("/solicitacoes-descarga", {
        empresa_nome: formData.empresa_nome,
        empresa_cnpj: formData.empresa_cnpj,
        empresa_email: formData.empresa_email,
        empresa_contato: formData.empresa_contato || null,
        empresa_telefone: formData.empresa_telefone || null,
        motorista_nome: formData.motorista_nome,
        motorista_cpf: formData.motorista_cpf,
        placa_veiculo: formData.placa_veiculo,
        tipo_veiculo: formData.tipo_veiculo || null,
        tipo_carga: formData.tipo_carga,
        observacao: formData.observacao || null,
        // Enviar data/hora sem conversão de timezone
        horario_solicitado: formData.horario_solicitado,
      });

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
      tipo_carga: "",
      horario_solicitado: "",
      observacao: "",
    });
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
        <div className="sd-container sd-sucesso">
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

  return (
    <div className="sd-page">
      <div className="sd-container">
        {/* Header */}
        <header className="sd-header">
          <div className="sd-header-icon">
            <FiTruck size={40} />
          </div>
          <h1>Agendamento de Descarga</h1>
          <p>Preencha o formulário para solicitar um horário de descarga</p>
        </header>

        {/* Stepper */}
        <div className="sd-stepper">
          {ETAPAS.map((etapa, index) => (
            <div
              key={etapa.id}
              className={`sd-step ${etapaAtual >= etapa.id ? "sd-active" : ""} ${etapaAtual > etapa.id ? "sd-completed" : ""}`}
            >
              <div className="sd-step-circle">
                {etapaAtual > etapa.id ? <FiCheckCircle /> : <etapa.icone />}
              </div>
              <span className="sd-step-title">{etapa.titulo}</span>
              {index < ETAPAS.length - 1 && <div className="sd-step-line" />}
            </div>
          ))}
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
                <label htmlFor="empresa_nome">Nome da Empresa *</label>
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
                  <label htmlFor="empresa_cnpj">CNPJ *</label>
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
                    <FiMail /> E-mail *
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
                  <label htmlFor="empresa_contato">Nome do Contato</label>
                  <input
                    type="text"
                    id="empresa_contato"
                    name="empresa_contato"
                    value={formData.empresa_contato}
                    onChange={handleChange}
                    placeholder="João Silva"
                  />
                </div>

                <div className="sd-form-group">
                  <label htmlFor="empresa_telefone">
                    <FiPhone /> Telefone
                  </label>
                  <input
                    type="text"
                    id="empresa_telefone"
                    name="empresa_telefone"
                    value={formData.empresa_telefone}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                  />
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
                  <label htmlFor="tipo_veiculo">Tipo de Veículo</label>
                  <select
                    id="tipo_veiculo"
                    name="tipo_veiculo"
                    value={formData.tipo_veiculo}
                    onChange={handleChange}
                  >
                    <option value="">Selecione (opcional)</option>
                    {TIPOS_VEICULO.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>
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
