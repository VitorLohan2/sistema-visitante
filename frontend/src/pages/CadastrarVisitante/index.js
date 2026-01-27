import logger from "../../utils/logger";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CADASTRAR VISITANTE - Página de Criação de Novos Visitantes
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dados: Carregados do cache (useDataLoader é responsável pelo carregamento inicial)
 * Atualização: Via Socket.IO em tempo real
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// src/pages/CadastrarVisitante/index.js
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
import Loading from "../../components/Loading";
import { getCache, setCache } from "../../services/cacheService";
import * as socketService from "../../services/socketService";
import "./styles.css";
import logoImg from "../../assets/logo.svg";

export default function CadastrarVisitante() {
  // Etapas do formulário
  const STEPS = [
    { id: 1, title: "Dados Pessoais", icon: FiUser },
    { id: 2, title: "Veículo", icon: FiTruck },
    { id: 3, title: "Fotos", icon: FiImage },
  ];

  const [currentStep, setCurrentStep] = useState(1);

  // Dados das novas tabelas (carregados da API)
  const [coresVeiculos, setCoresVeiculos] = useState([]);
  const [tiposVeiculos, setTiposVeiculos] = useState([]);
  const [funcoesVisitantes, setFuncoesVisitantes] = useState([]);

  const [form, setForm] = useState({
    nome: "",
    nascimento: "",
    cpf: "",
    empresa_id: "",
    setor_id: "",
    telefone: "",
    placa_veiculo: "",
    cor_veiculo_visitante_id: "",
    tipo_veiculo_visitante_id: "",
    funcao_visitante_id: "",
    observacao: "",
    fotos: [],
  });

  const history = useHistory();

  // ═══════════════════════════════════════════════════════════════
  // DADOS DO CACHE (carregados pelo useDataLoader)
  // ═══════════════════════════════════════════════════════════════
  const [empresasVisitantes, setEmpresasVisitantes] = useState(
    () => getCache("empresasVisitantes") || [],
  );
  const [setoresVisitantes, setSetoresVisitantes] = useState(
    () => getCache("setoresVisitantes") || [],
  );
  const socketListenersRef = useRef([]);

  // Referências para câmera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [cameraReady, setCameraReady] = useState(false);

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
    cor_veiculo_visitante_id: "",
    tipo_veiculo_visitante_id: "",
  });

  // ═══════════════════════════════════════════════════════════════
  // CARREGAMENTO DE DADOS - Primeiro do cache, depois API se necessário
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    async function loadData() {
      try {
        // ✅ Primeiro verifica se já tem no cache
        const cachedEmpresas = getCache("empresasVisitantes");
        const cachedSetores = getCache("setoresVisitantes");

        if (
          cachedEmpresas &&
          cachedEmpresas.length > 0 &&
          cachedSetores &&
          cachedSetores.length > 0
        ) {
          logger.log("📦 Usando empresas e setores do cache");
          setEmpresasVisitantes(cachedEmpresas);
          setSetoresVisitantes(cachedSetores);
        } else {
          // Se não tem cache, busca da API
          const [empresasResponse, setoresResponse] = await Promise.all([
            api.get("/empresas-visitantes"),
            api.get("/setores-visitantes"),
          ]);

          const empresasData = empresasResponse.data;
          const setoresData = setoresResponse.data;

          // Salva no cache para próximos acessos
          setCache("empresasVisitantes", empresasData);
          setCache("setoresVisitantes", setoresData);

          setEmpresasVisitantes(empresasData);
          setSetoresVisitantes(setoresData);
        }

        // Carregar dados das novas tabelas
        const [coresResponse, tiposResponse, funcoesResponse] =
          await Promise.all([
            api.get("/cores-veiculos-visitantes"),
            api.get("/tipos-veiculos-visitantes"),
            api.get("/funcoes-visitantes"),
          ]);

        setCoresVeiculos(coresResponse.data);
        setTiposVeiculos(tiposResponse.data);
        setFuncoesVisitantes(funcoesResponse.data);
      } catch (err) {
        logger.error("Erro ao carregar dados:", err);
        alert("Erro ao carregar opções de empresa e setor");
      }
    }

    loadData();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // SOCKET.IO - Sincronização em tempo real
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    // Limpa listeners anteriores
    socketListenersRef.current.forEach((unsub) => unsub && unsub());
    socketListenersRef.current = [];

    // Listener: Nova empresa criada
    const unsubEmpresaCreate = socketService.on(
      "empresa:created",
      (empresa) => {
        logger.log("📥 Socket: Nova empresa recebida", empresa.nome);
        setEmpresasVisitantes((prev) => {
          if (prev.find((e) => e.id === empresa.id)) return prev;
          const novos = [...prev, empresa].sort((a, b) =>
            (a.nome || "").localeCompare(b.nome || "", "pt-BR"),
          );
          setCache("empresasVisitantes", novos);
          return novos;
        });
      },
    );

    // Listener: Empresa atualizada
    const unsubEmpresaUpdate = socketService.on("empresa:updated", (dados) => {
      logger.log("📝 Socket: Empresa atualizada", dados.id);
      setEmpresasVisitantes((prev) => {
        const novos = prev.map((e) =>
          e.id === dados.id ? { ...e, ...dados } : e,
        );
        setCache("empresasVisitantes", novos);
        return novos;
      });
    });

    // Listener: Empresa deletada
    const unsubEmpresaDelete = socketService.on("empresa:deleted", (dados) => {
      logger.log("🗑️ Socket: Empresa removida", dados.id);
      setEmpresasVisitantes((prev) => {
        const novos = prev.filter((e) => e.id !== dados.id);
        setCache("empresasVisitantes", novos);
        return novos;
      });
    });

    // Listener: Novo setor criado
    const unsubSetorCreate = socketService.on("setor:created", (setor) => {
      logger.log("📥 Socket: Novo setor recebido", setor.nome);
      setSetoresVisitantes((prev) => {
        if (prev.find((s) => s.id === setor.id)) return prev;
        const novos = [...prev, setor].sort((a, b) =>
          (a.nome || "").localeCompare(b.nome || "", "pt-BR"),
        );
        setCache("setoresVisitantes", novos);
        return novos;
      });
    });

    // Listener: Setor atualizado
    const unsubSetorUpdate = socketService.on("setor:updated", (dados) => {
      logger.log("📝 Socket: Setor atualizado", dados.id);
      setSetoresVisitantes((prev) => {
        const novos = prev.map((s) =>
          s.id === dados.id ? { ...s, ...dados } : s,
        );
        setCache("setoresVisitantes", novos);
        return novos;
      });
    });

    // Listener: Setor deletado
    const unsubSetorDelete = socketService.on("setor:deleted", (dados) => {
      logger.log("🗑️ Socket: Setor removido", dados.id);
      setSetoresVisitantes((prev) => {
        const novos = prev.filter((s) => s.id !== dados.id);
        setCache("setoresVisitantes", novos);
        return novos;
      });
    });

    socketListenersRef.current.push(
      unsubEmpresaCreate,
      unsubEmpresaUpdate,
      unsubEmpresaDelete,
      unsubSetorCreate,
      unsubSetorUpdate,
      unsubSetorDelete,
    );

    // Cleanup ao desmontar
    return () => {
      socketListenersRef.current.forEach((unsub) => unsub && unsub());
      socketListenersRef.current = [];
    };
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
              existingFile.lastModified === newFile.lastModified,
          ),
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
      setCameraLoading(true);
      setCameraReady(false);
      setCameraZoom(1);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setCameraLoading(false);
            setCameraReady(true);
          };
        }
      } catch (err) {
        logger.error("Erro ao acessar a câmera:", err);
        alert("Não foi possível acessar a câmera.");
        setCameraAtiva(false);
        setShowModal(false);
        setCameraLoading(false);
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
    setCameraLoading(false);
    setCameraReady(false);
    setCameraZoom(1);
  };

  // Controles de zoom da câmera
  const handleZoomIn = () => {
    setCameraZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setCameraZoom((prev) => Math.max(prev - 0.25, 1));
  };

  const handleZoomReset = () => {
    setCameraZoom(1);
  };

  const tirarFoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // Usa as dimensões reais do vídeo para manter proporção
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Calcula a área visível considerando o zoom
    const zoomFactor = cameraZoom;
    const visibleWidth = videoWidth / zoomFactor;
    const visibleHeight = videoHeight / zoomFactor;

    // Calcula o offset para centralizar a captura (área do zoom)
    const offsetX = (videoWidth - visibleWidth) / 2;
    const offsetY = (videoHeight - visibleHeight) / 2;

    // Define o canvas com as proporções corretas da área capturada
    canvas.width = visibleWidth;
    canvas.height = visibleHeight;

    // Desenha apenas a área visível (com zoom) do vídeo no canvas
    context.drawImage(
      video,
      offsetX,
      offsetY,
      visibleWidth,
      visibleHeight, // Área de origem (com zoom)
      0,
      0,
      visibleWidth,
      visibleHeight, // Área de destino no canvas
    );

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
        const hasCor = form.cor_veiculo_visitante_id !== "";
        const hasTipo = form.tipo_veiculo_visitante_id !== "";

        if (hasPlaca && !hasCor) {
          setErrors((prev) => ({
            ...prev,
            cor_veiculo_visitante_id:
              "Cor do veículo é obrigatória quando a placa é informada",
          }));
          alert("Por favor, selecione a cor do veículo.");
          return false;
        }

        if (hasPlaca && !hasTipo) {
          setErrors((prev) => ({
            ...prev,
            tipo_veiculo_visitante_id:
              "Tipo do veículo é obrigatório quando a placa é informada",
          }));
          alert("Por favor, selecione o tipo do veículo.");
          return false;
        }

        if ((hasCor || hasTipo) && !hasPlaca) {
          setErrors((prev) => ({
            ...prev,
            placa_veiculo:
              "Placa do veículo é obrigatória quando a cor/tipo é informada",
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
      cor_veiculo_visitante_id: "",
      tipo_veiculo_visitante_id: "",
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

      // Só adiciona os IDs se tiverem valor válido (evita enviar string vazia)
      if (
        form.cor_veiculo_visitante_id &&
        form.cor_veiculo_visitante_id !== ""
      ) {
        dataToSend.append(
          "cor_veiculo_visitante_id",
          form.cor_veiculo_visitante_id,
        );
      }
      if (
        form.tipo_veiculo_visitante_id &&
        form.tipo_veiculo_visitante_id !== ""
      ) {
        dataToSend.append(
          "tipo_veiculo_visitante_id",
          form.tipo_veiculo_visitante_id,
        );
      }
      if (form.funcao_visitante_id && form.funcao_visitante_id !== "") {
        dataToSend.append("funcao_visitante_id", form.funcao_visitante_id);
      }

      dataToSend.append("observacao", form.observacao);

      form.fotos.forEach((foto) => {
        dataToSend.append("fotos", foto);
      });

      setUploadStatus("Enviando dados e fotos...");

      await api.post("/cadastro-visitantes", dataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
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
      logger.error("Erro detalhado:", err.response?.data);
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
      {/* Loading durante o cadastro */}
      {isSubmitting && (
        <Loading
          variant="overlay"
          showProgress={true}
          progress={uploadProgress}
          message="Cadastrando Visitante"
        />
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

                <div className="form-group">
                  <label className="form-label">Função do Visitante</label>
                  <select
                    name="funcao_visitante_id"
                    className="form-select"
                    value={form.funcao_visitante_id}
                    onChange={handleChange}
                  >
                    <option value="">Selecione a função</option>
                    {funcoesVisitantes.map((funcao) => (
                      <option key={funcao.id} value={funcao.id}>
                        {funcao.nome}
                      </option>
                    ))}
                  </select>
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
                    <label className="form-label">Tipo do Veículo</label>
                    <select
                      name="tipo_veiculo_visitante_id"
                      className={`form-select ${errors.tipo_veiculo_visitante_id ? "error" : ""}`}
                      value={form.tipo_veiculo_visitante_id}
                      onChange={handleChange}
                    >
                      <option value="">Selecione o tipo</option>
                      {tiposVeiculos.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </option>
                      ))}
                    </select>
                    {errors.tipo_veiculo_visitante_id && (
                      <span className="error-message">
                        {errors.tipo_veiculo_visitante_id}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Cor do Veículo</label>
                  <select
                    name="cor_veiculo_visitante_id"
                    className={`form-select ${errors.cor_veiculo_visitante_id ? "error" : ""}`}
                    value={form.cor_veiculo_visitante_id}
                    onChange={handleChange}
                  >
                    <option value="">Selecione a cor</option>
                    {coresVeiculos.map((cor) => (
                      <option key={cor.id} value={cor.id}>
                        {cor.nome}
                      </option>
                    ))}
                  </select>
                  {errors.cor_veiculo_visitante_id && (
                    <span className="error-message">
                      {errors.cor_veiculo_visitante_id}
                    </span>
                  )}
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
                {/* Loading enquanto câmera inicializa */}
                {cameraLoading && (
                  <div className="webcam-loading">
                    <div className="webcam-loading-spinner"></div>
                    <p>Iniciando câmera...</p>
                  </div>
                )}

                {/* Container do vídeo com zoom */}
                <div
                  className="webcam-video-container"
                  style={{ display: cameraLoading ? "none" : "block" }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="webcam-video"
                    style={{ transform: `scale(${cameraZoom})` }}
                  />
                </div>

                <canvas
                  ref={canvasRef}
                  width="640"
                  height="480"
                  style={{ display: "none" }}
                />

                {/* Controles de Zoom */}
                {cameraReady && (
                  <div className="webcam-zoom-controls">
                    <span className="zoom-label">
                      Zoom: {Math.round(cameraZoom * 100)}%
                    </span>
                    <div className="zoom-buttons">
                      <button
                        type="button"
                        className="zoom-btn"
                        onClick={handleZoomOut}
                        disabled={cameraZoom <= 1}
                        title="Diminuir zoom"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        className="zoom-btn zoom-btn-reset"
                        onClick={handleZoomReset}
                        title="Resetar zoom"
                      >
                        100%
                      </button>
                      <button
                        type="button"
                        className="zoom-btn"
                        onClick={handleZoomIn}
                        disabled={cameraZoom >= 3}
                        title="Aumentar zoom"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                <div className="modal-webcam-actions">
                  <button
                    type="button"
                    className="nav-btn nav-btn-submit"
                    onClick={tirarFoto}
                    disabled={!cameraReady}
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
