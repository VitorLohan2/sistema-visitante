// src/pages/NovoCadastroVisitante/index.js
import React, { useState, useEffect, useRef } from "react";
import { Link, useHistory } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCamera,
  FiUser,
  FiTruck,
  FiImage,
  FiCheck,
  FiX,
  FiPlus,
} from "react-icons/fi";
import api from "../../services/api";
import "./styles.css";
import logoImg from "../../assets/logo.svg";

export default function NewVisitor() {
  // Etapas do formulário
  const STEPS = [
    { id: 1, title: "Dados Pessoais", icon: FiUser },
    { id: 2, title: "Veículo", icon: FiTruck },
    { id: 3, title: "Fotos", icon: FiImage },
  ];

  const [currentStep, setCurrentStep] = useState(1);

  // Lista de cores pré-definidas
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
    empresa_id: "",
    setor_id: "",
    telefone: "",
    placa_veiculo: "",
    cor_veiculo: "",
    observacao: "",
    fotos: [],
  });

  const history = useHistory();
  const [empresasVisitantes, setEmpresasVisitantes] = useState([]);
  const [setoresVisitantes, setSetoresVisitantes] = useState([]);

  // Referências para câmera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Tela de carregamento com progresso real
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  // Modal Confirmar Cadastro
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Modal de visualização de imagem ampliada
  const [selectedImage, setSelectedImage] = useState(null);

  const [errors, setErrors] = useState({
    placa_veiculo: "",
    cor_veiculo: "",
  });

  // Busca empresas e setores do banco de dados
  useEffect(() => {
    async function loadData() {
      try {
        const [empresasResponse, setoresResponse] = await Promise.all([
          api.get("/empresas-visitantes"),
          api.get("/setores-visitantes"),
        ]);

        setEmpresasVisitantes(empresasResponse.data);
        setSetoresVisitantes(setoresResponse.data);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        alert("Erro ao carregar opções de empresa e setor");
      }
    }

    loadData();
  }, []);

  // === Funções de formatação ===
  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    const match = cleaned.match(/(\d{3})(\d{3})(\d{3})(\d{2})/);
    return match ? `${match[1]}.${match[2]}.${match[3]}-${match[4]}` : cleaned;
  };

  const formatTelefone = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return cleaned;
  };

  const formatPlaca = (value) => {
    const cleaned = value
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 7);

    if (cleaned.length <= 3) {
      return cleaned;
    }

    if (cleaned.length > 3) {
      return `${cleaned.slice(0, 3)}${cleaned.slice(3, 4)}${cleaned.slice(4, 5)}${cleaned.slice(5, 7)}`;
    }

    return cleaned;
  };

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
      newValue = formatPlaca(value);
      validatePlaca(newValue);
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

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);

    setForm((prev) => {
      const nonDuplicateFiles = newFiles.filter(
        (newFile) =>
          !prev.fotos.some(
            (existingFile) =>
              existingFile.name === newFile.name &&
              existingFile.size === newFile.size &&
              existingFile.lastModified === newFile.lastModified
          )
      );

      const combinedFiles = [...prev.fotos, ...nonDuplicateFiles].slice(0, 3);

      if (nonDuplicateFiles.length < newFiles.length) {
        alert("Algumas imagens foram ignoradas porque já foram selecionadas.");
      }

      return { ...prev, fotos: combinedFiles };
    });

    e.target.value = "";
  };

  // === Funções da Câmera ===
  useEffect(() => {
    const iniciarCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Erro ao acessar a câmera:", err);
        alert("Não foi possível acessar a câmera.");
        setCameraAtiva(false);
        setShowModal(false);
      }
    };

    if (cameraAtiva) {
      iniciarCamera();
    }

    return () => {
      const stream = videoRef.current?.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraAtiva]);

  const pararCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setCameraAtiva(false);
    setShowModal(false);
  };

  const tirarFoto = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `webcam_${Date.now()}.png`, {
        type: "image/png",
      });
      setForm((prev) => {
        if (prev.fotos.length >= 3) {
          alert("Máximo de 3 imagens atingido.");
          return prev;
        }
        return { ...prev, fotos: [...prev.fotos, file] };
      });
      pararCamera();
    }, "image/png");
  };

  // === Validação por etapa ===
  const validateStep = (step) => {
    const cpfClean = form.cpf.replace(/\D/g, "");
    const telefoneClean = form.telefone.replace(/\D/g, "");

    switch (step) {
      case 1:
        if (!form.nome.trim()) {
          alert("Nome é obrigatório.");
          return false;
        }
        if (!form.nascimento) {
          alert("Data de nascimento é obrigatória.");
          return false;
        }
        if (cpfClean.length !== 11) {
          alert("CPF inválido. Deve conter 11 dígitos.");
          return false;
        }
        if (!form.empresa_id || !form.setor_id) {
          alert("Empresa e setor são obrigatórios.");
          return false;
        }
        if (telefoneClean.length !== 11) {
          alert("Telefone inválido. Deve conter 11 dígitos com DDD.");
          return false;
        }
        return true;

      case 2:
        const placaClean = form.placa_veiculo
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase();
        const hasPlaca = placaClean.trim().length > 0;
        const hasCor = form.cor_veiculo.trim().length > 0;

        if (hasPlaca && !hasCor) {
          setErrors((prev) => ({
            ...prev,
            cor_veiculo:
              "Cor do veículo é obrigatória quando a placa é informada",
          }));
          alert("Por favor, selecione a cor do veículo.");
          return false;
        }

        if (hasCor && !hasPlaca) {
          setErrors((prev) => ({
            ...prev,
            placa_veiculo:
              "Placa do veículo é obrigatória quando a cor é informada",
          }));
          alert("Por favor, preencha a placa do veículo.");
          return false;
        }

        if (hasPlaca && placaClean.length < 7) {
          setErrors((prev) => ({
            ...prev,
            placa_veiculo: "Placa deve ter 7 caracteres",
          }));
          alert("Placa do veículo deve ter 7 caracteres.");
          return false;
        }
        return true;

      case 3:
        if (form.fotos.length === 0) {
          alert("Envie pelo menos uma imagem.");
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  // === Navegação entre etapas ===
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const goToStep = (step) => {
    // Permite voltar para etapas anteriores ou ir para próxima se a atual estiver válida
    if (step < currentStep) {
      setCurrentStep(step);
    } else if (step === currentStep + 1 && validateStep(currentStep)) {
      setCurrentStep(step);
    }
  };

  // === Submit ===
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const cpfClean = form.cpf.replace(/\D/g, "");
    const telefoneClean = form.telefone.replace(/\D/g, "");
    const placaClean = form.placa_veiculo
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    setErrors({
      placa_veiculo: "",
      cor_veiculo: "",
    });

    // Validação final
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(0);
      setUploadStatus("Verificando CPF...");

      const { data } = await api.get(`/cadastro-visitantes/cpf/${cpfClean}`);
      if (data.exists) {
        setIsSubmitting(false);
        return alert("CPF já cadastrado. Verifique antes de continuar.");
      }

      setUploadStatus("Preparando dados...");
      setUploadProgress(10);

      const dataToSend = new FormData();
      dataToSend.append("nome", form.nome);
      dataToSend.append("nascimento", form.nascimento);
      dataToSend.append("cpf", cpfClean);
      dataToSend.append("empresa", form.empresa_id);
      dataToSend.append("setor", form.setor_id);
      dataToSend.append("telefone", telefoneClean);
      dataToSend.append("placa_veiculo", placaClean);
      dataToSend.append("cor_veiculo", form.cor_veiculo);
      dataToSend.append("observacao", form.observacao);

      form.fotos.forEach((foto) => {
        dataToSend.append("fotos", foto);
      });

      setUploadStatus("Enviando dados e fotos...");

      await api.post("/cadastro-visitantes", dataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: localStorage.getItem("ongId"),
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted =
            Math.round((progressEvent.loaded * 80) / progressEvent.total) + 10; // 10% inicial + até 80% do upload
          setUploadProgress(Math.min(percentCompleted, 90));
        },
      });

      setUploadStatus("Finalizando cadastro...");
      setUploadProgress(100);

      // Pequeno delay para o usuário ver que completou
      setTimeout(() => {
        setIsSubmitting(false);
        history.push("/listagem-visitante");
      }, 500);
    } catch (err) {
      console.error("Erro detalhado:", err.response?.data);
      setIsSubmitting(false);
      alert(`Erro: ${err.response?.data?.error || "Falha no cadastro"}`);
    }
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (validateStep(3)) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false);
    handleSubmit();
  };

  // Calcula o progresso do stepper
  const getStepperProgress = () => {
    const totalSteps = STEPS.length;
    const completedSteps = currentStep - 1;
    // Etapa 1: 0%, Etapa 2: 50%, Etapa 3: 100%
    const progressPercentage = completedSteps / (totalSteps - 1);
    // Calcula a largura relativa à linha base (que vai de 22px até calc(100% - 22px))
    // A linha base tem largura de calc(100% - 44px)
    return `calc((100% - 44px) * ${progressPercentage})`;
  };

  return (
    <div className="cadastro-visitante-page">
      {/* Overlay de Loading durante o cadastro */}
      {isSubmitting && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h3>Cadastrando Visitante</h3>
            <p className="loading-status">{uploadStatus}</p>
            <div className="loading-progress-bar">
              <div
                className="loading-progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="loading-percentage">{uploadProgress}%</span>
          </div>
        </div>
      )}

      <div className="cadastro-card">
        {/* Header */}
        <div className="cadastro-header">
          <img src={logoImg} alt="Logo" className="cadastro-logo" />
          <h1>Cadastrar Visitante</h1>
          <p>Preencha os dados em etapas simples</p>
        </div>

        {/* Stepper */}
        <div className="stepper-container">
          <div className="stepper">
            <div
              className="stepper-progress"
              style={{ width: getStepperProgress() }}
            />
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`step ${currentStep === step.id ? "active" : ""} ${
                  currentStep > step.id ? "completed" : ""
                }`}
                onClick={() => goToStep(step.id)}
              >
                <div className="step-circle">
                  <span>{step.id}</span>
                </div>
                <span className="step-label">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conteúdo do Formulário */}
        <div className="cadastro-content">
          <form onSubmit={(e) => e.preventDefault()}>
            {/* Etapa 1: Dados Pessoais */}
            {currentStep === 1 && (
              <div className="step-content">
                <h2 className="step-title">
                  <span className="step-title-icon">
                    <FiUser size={16} />
                  </span>
                  Dados Pessoais
                </h2>
                <p className="step-description">
                  Informe os dados pessoais do visitante
                </p>

                <div className="form-group">
                  <label className="form-label required">Nome Completo</label>
                  <input
                    type="text"
                    name="nome"
                    className="form-input"
                    placeholder="Digite o nome completo"
                    value={form.nome}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      name="nascimento"
                      className="form-input"
                      value={form.nascimento}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label required">CPF</label>
                    <input
                      type="text"
                      name="cpf"
                      className="form-input"
                      placeholder="000.000.000-00"
                      value={form.cpf}
                      onChange={handleCpfChange}
                      maxLength={14}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Empresa</label>
                    <select
                      name="empresa_id"
                      className="form-select"
                      value={form.empresa_id}
                      onChange={handleChange}
                    >
                      <option value="">Selecione a empresa</option>
                      {empresasVisitantes.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Setor</label>
                    <select
                      name="setor_id"
                      className="form-select"
                      value={form.setor_id}
                      onChange={handleChange}
                    >
                      <option value="">Selecione o setor</option>
                      {setoresVisitantes.map((setor) => (
                        <option key={setor.id} value={setor.id}>
                          {setor.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label required">Telefone</label>
                  <input
                    type="text"
                    name="telefone"
                    className="form-input"
                    placeholder="(00) 00000-0000"
                    value={form.telefone}
                    onChange={handleTelefoneChange}
                    maxLength={15}
                  />
                </div>
              </div>
            )}

            {/* Etapa 2: Veículo */}
            {currentStep === 2 && (
              <div className="step-content">
                <h2 className="step-title">
                  <span className="step-title-icon">
                    <FiTruck size={16} />
                  </span>
                  Informações do Veículo
                </h2>
                <p className="step-description">
                  Preencha apenas se o visitante possuir veículo
                </p>

                <div className="attention-alert">
                  <span className="attention-alert-icon">⚠️</span>
                  <span className="attention-alert-text">
                    Se não houver veículo, deixe os campos em branco e avance
                    para a próxima etapa.
                  </span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Placa do Veículo</label>
                    <input
                      type="text"
                      name="placa_veiculo"
                      className={`form-input ${errors.placa_veiculo ? "error" : ""}`}
                      placeholder="ABC1D23"
                      value={form.placa_veiculo}
                      onChange={handleChange}
                      maxLength={7}
                    />
                    {errors.placa_veiculo && (
                      <span className="error-message">
                        {errors.placa_veiculo}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cor do Veículo</label>
                    <select
                      name="cor_veiculo"
                      className={`form-select ${errors.cor_veiculo ? "error" : ""}`}
                      value={form.cor_veiculo}
                      onChange={handleChange}
                    >
                      <option value="">Selecione a cor</option>
                      {opcoesCores.map((cor) => (
                        <option key={cor} value={cor}>
                          {cor}
                        </option>
                      ))}
                    </select>
                    {errors.cor_veiculo && (
                      <span className="error-message">
                        {errors.cor_veiculo}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Observações</label>
                  <textarea
                    name="observacao"
                    className="form-textarea"
                    placeholder="Informações adicionais sobre o visitante ou veículo..."
                    value={form.observacao}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {/* Etapa 3: Fotos */}
            {currentStep === 3 && (
              <div className="step-content">
                <h2 className="step-title">
                  <span className="step-title-icon">
                    <FiImage size={16} />
                  </span>
                  Fotos do Visitante
                </h2>
                <p className="step-description">
                  Capture ou selecione até 3 fotos do visitante
                </p>

                <div className="upload-section">
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    disabled={form.fotos.length >= 3}
                    style={{ display: "none" }}
                  />

                  <div className="upload-buttons">
                    <label
                      htmlFor="image-upload"
                      className={`upload-btn upload-btn-file ${form.fotos.length >= 3 ? "disabled" : ""}`}
                    >
                      <FiPlus size={20} />
                      Selecionar Imagens
                    </label>

                    <button
                      type="button"
                      className="upload-btn upload-btn-camera"
                      onClick={() => {
                        setCameraAtiva(true);
                        setShowModal(true);
                      }}
                      disabled={form.fotos.length >= 3}
                    >
                      <FiCamera size={20} />
                      Abrir Webcam
                    </button>
                  </div>

                  <p className="upload-hint">
                    {form.fotos.length < 3
                      ? `Selecione mais ${3 - form.fotos.length} imagem(ns)`
                      : "Máximo de 3 imagens atingido"}
                  </p>

                  {form.fotos.length > 0 && (
                    <div className="image-preview-grid">
                      {form.fotos.map((file, index) => (
                        <div
                          key={`${file.name}-${file.size}-${index}`}
                          className="image-preview-item"
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            onClick={() => setSelectedImage(file)}
                            style={{ cursor: "pointer" }}
                          />
                          <button
                            type="button"
                            className="image-remove-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setForm((prev) => ({
                                ...prev,
                                fotos: prev.fotos.filter((_, i) => i !== index),
                              }));
                            }}
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navegação entre etapas */}
            <div className="step-navigation">
              {currentStep > 1 ? (
                <button
                  type="button"
                  className="nav-btn nav-btn-prev"
                  onClick={prevStep}
                >
                  <FiArrowLeft size={18} />
                  Anterior
                </button>
              ) : (
                <div />
              )}

              {currentStep < STEPS.length ? (
                <button
                  type="button"
                  className="nav-btn nav-btn-next"
                  onClick={nextStep}
                >
                  Próximo
                  <FiArrowRight size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  className="nav-btn nav-btn-submit"
                  onClick={handleOpenConfirm}
                >
                  <FiCheck size={18} />
                  Cadastrar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Modal da Webcam */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-webcam-content">
              <div className="modal-webcam-header">
                <h3>Capturar Foto</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={pararCamera}
                >
                  <FiX />
                </button>
              </div>
              <div className="modal-webcam-body">
                <video ref={videoRef} autoPlay className="webcam-video" />
                <canvas
                  ref={canvasRef}
                  width="640"
                  height="480"
                  style={{ display: "none" }}
                />
                <div className="modal-webcam-actions">
                  <button
                    type="button"
                    className="nav-btn nav-btn-submit"
                    onClick={tirarFoto}
                  >
                    <FiCamera size={18} />
                    Tirar Foto
                  </button>
                  <button
                    type="button"
                    className="nav-btn nav-btn-prev"
                    onClick={pararCamera}
                  >
                    <FiX size={18} />
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação */}
        {showConfirmModal && (
          <div className="modal-overlay">
            <div className="modal-confirm-content">
              <div className="modal-confirm-icon">❓</div>
              <h3>Confirmar Cadastro</h3>
              <p>Deseja realmente cadastrar este visitante?</p>
              <div className="modal-confirm-actions">
                <button
                  type="button"
                  className="nav-btn nav-btn-submit"
                  onClick={handleConfirmSubmit}
                >
                  <FiCheck size={18} />
                  Confirmar
                </button>
                <button
                  type="button"
                  className="nav-btn nav-btn-prev"
                  onClick={() => setShowConfirmModal(false)}
                >
                  <FiX size={18} />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Visualização de Imagem Ampliada */}
        {selectedImage && (
          <div className="modal-overlay" onClick={() => setSelectedImage(null)}>
            <div
              className="modal-image-viewer"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="modal-image-close"
                onClick={() => setSelectedImage(null)}
              >
                <FiX size={24} />
              </button>
              <img
                src={URL.createObjectURL(selectedImage)}
                alt="Visualização ampliada"
                className="modal-image-full"
              />
              <div className="modal-image-info">
                <span>{selectedImage.name}</span>
                <span>{Math.round(selectedImage.size / 1024)} KB</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
