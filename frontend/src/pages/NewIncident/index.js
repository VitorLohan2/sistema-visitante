// src/pages/NewIncident/index.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiArrowLeft, FiCamera } from 'react-icons/fi';
import api from '../../services/api';
import './styles.css';
import logoImg from '../../assets/logo.svg';
import Loading from '../../components/Loading';


export default function NewVisitor() {
  // Lista de cores pré-definidas
  const opcoesCores = [
    'PRETO', 'BRANCO', 'PRATA', 'CINZA', 'VERMELHO', 'AZUL', 'VERDE', 'AMARELO',
    'LARANJA',
  ];

  const [form, setForm] = useState({
    nome: '',
    nascimento: '',
    cpf: '',
    empresa_id: '',
    setor_id: '',
    telefone: '',
    placa_veiculo: '',
    cor_veiculo: '',
    observacao: '',
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

  //Tela de carregamento
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Modal Confirmar Cadastro
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [errors, setErrors] = useState({
    placa_veiculo: '',
    cor_veiculo: ''
  });

  const simulateProgress = () => {
    let value = 0;
    const interval = setInterval(() => {
      value += 15;
      setProgress(value);
      if (value >= 100) clearInterval(interval);
    }, 150);
  };

  // Busca empresas e setores do banco de dados
  useEffect(() => {
    async function loadData() {
      try {
        const [empresasResponse, setoresResponse] = await Promise.all([
          api.get('/empresas-visitantes'),
          api.get('/setores-visitantes')
        ]);

        setEmpresasVisitantes(empresasResponse.data);
        setSetoresVisitantes(setoresResponse.data);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        alert('Erro ao carregar opções de empresa e setor');
      }
    }

    loadData();
  }, []);

  // === Funções de formatação ===
  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    const match = cleaned.match(/(\d{3})(\d{3})(\d{3})(\d{2})/);
    return match ? `${match[1]}.${match[2]}.${match[3]}-${match[4]}` : cleaned;
  };

  const formatTelefone = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return cleaned;
  };

  // ← NOVA FUNÇÃO PARA FORMATAR PLACA
  const formatPlaca = (value) => {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7);

    if (cleaned.length <= 3) {
      return cleaned;
    }

    // Formato Mercosul: AAA1A11 ou Formato antigo: AAA1111
    if (cleaned.length > 3) {
      return `${cleaned.slice(0, 3)}${cleaned.slice(3, 4)}${cleaned.slice(4, 5)}${cleaned.slice(5, 7)}`;
    }

    return cleaned;
  };

  // Adicione esta função para validar a placa em tempo real
  const validatePlaca = (value) => {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned.length > 0 && cleaned.length < 7) {
      setErrors(prev => ({
        ...prev,
        placa_veiculo: 'Placa deve ter 7 caracteres'
      }));
    } else {
      setErrors(prev => ({
        ...prev,
        placa_veiculo: ''
      }));
    }
  };

  // === Handlers ===
  const handleChange = (e) => {
    const { name, value } = e.target;

    let newValue = value;

    if (name === 'nome') {
      newValue = value.toUpperCase();
    } else if (name === 'placa_veiculo') {
      newValue = formatPlaca(value); // Formata a placa
      validatePlaca(newValue)
    }
    // A cor já vem formatada do select (se você mudar para select)

    setForm(prev => ({ ...prev, [name]: newValue }));
  };

  const handleCpfChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setForm(prev => ({ ...prev, cpf: formatted }));
  };

  const handleTelefoneChange = (e) => {
    const formatted = formatTelefone(e.target.value);
    setForm(prev => ({ ...prev, telefone: formatted }));
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);

    setForm(prev => {
      const nonDuplicateFiles = newFiles.filter(newFile =>
        !prev.fotos.some(existingFile =>
          existingFile.name === newFile.name &&
          existingFile.size === newFile.size &&
          existingFile.lastModified === newFile.lastModified
        )
      );

      const combinedFiles = [...prev.fotos, ...nonDuplicateFiles].slice(0, 3);

      if (nonDuplicateFiles.length < newFiles.length) {
        alert('Algumas imagens foram ignoradas porque já foram selecionadas.');
      }

      return { ...prev, fotos: combinedFiles };
    });

    e.target.value = '';
  };

  // === Funções da Câmera ===
  useEffect(() => {
    const iniciarCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraAtiva]);

  const pararCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
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
      const file = new File([blob], `webcam_${Date.now()}.png`, { type: "image/png" });
      setForm(prev => {
        if (prev.fotos.length >= 3) {
          alert("Máximo de 3 imagens atingido.");
          return prev;
        }
        return { ...prev, fotos: [...prev.fotos, file] };
      });
      // Fecha modal após tirar a foto
      pararCamera();
    }, "image/png");
  };

  // === Submit ===
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const cpfClean = form.cpf.replace(/\D/g, '');
    const telefoneClean = form.telefone.replace(/\D/g, '');
    const placaClean = form.placa_veiculo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // Limpa erros anteriores
    setErrors({
      placa_veiculo: '',
      cor_veiculo: ''
    });

    if (cpfClean.length !== 11) {
      alert('CPF inválido. Deve conter 11 dígitos.');
      return;
    }
    if (telefoneClean.length !== 11) {
      alert('Telefone inválido. Deve conter 11 dígitos com DDD.');
      return;
    }
    if (!form.empresa_id || !form.setor_id) {
      alert('Empresa e setor são obrigatórios.');
      return;
    }
    if (form.fotos.length === 0) {
      alert('Envie pelo menos uma imagem.');
      return;
    }

    // ← NOVA VALIDAÇÃO: Se tem placa, deve ter cor
    const hasPlaca = placaClean.trim().length > 0;
    const hasCor = form.cor_veiculo.trim().length > 0;

    if (hasPlaca && !hasCor) {
      setErrors(prev => ({
        ...prev,
        cor_veiculo: 'Cor do veículo é obrigatória quando a placa é informada'
      }));
      alert('Por favor, selecione a cor do veículo.');
      return;
    }

    if (hasCor && !hasPlaca) {
      setErrors(prev => ({
        ...prev,
        placa_veiculo: 'Placa do veículo é obrigatória quando a cor é informada'
      }));
      alert('Por favor, preencha a placa do veículo.');
      return;
    }

    // Valida formato da placa (opcional, se quiser)
    if (hasPlaca && placaClean.length < 7) {
      setErrors(prev => ({
        ...prev,
        placa_veiculo: 'Placa deve ter 7 caracteres'
      }));
      alert('Placa do veículo deve ter 7 caracteres.');
      return;
    }

    try {
      setLoading(true);
      simulateProgress();

      const { data } = await api.get(`/cpf-existe/${cpfClean}`);
      if (data.exists) {
        setLoading(false);
        return alert('CPF já cadastrado. Verifique antes de continuar.');
      }

      const dataToSend = new FormData();
      dataToSend.append('nome', form.nome);
      dataToSend.append('nascimento', form.nascimento);
      dataToSend.append('cpf', cpfClean);
      dataToSend.append('empresa', form.empresa_id);
      dataToSend.append('setor', form.setor_id);
      dataToSend.append('telefone', telefoneClean);
      dataToSend.append('placa_veiculo', placaClean);
      dataToSend.append('cor_veiculo', form.cor_veiculo);
      dataToSend.append('observacao', form.observacao);

      form.fotos.forEach((foto) => {
        dataToSend.append('fotos', foto);
      });

      await api.post('/incidents', dataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: localStorage.getItem('ongId')
        }
      });

      setTimeout(() => {
        setLoading(false);
        history.push('/profile');
      }, 1200);
    } catch (err) {
      console.error('Erro detalhado:', err.response?.data);
      setLoading(false);
      alert(`Erro: ${err.response?.data?.error || 'Falha no cadastro'}`);
    }
  };

  // Nova função para abrir o modal ao tentar enviar
  const handleOpenConfirm = (e) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  // Função que confirma e chama o submit real
  const handleConfirmSubmit = (e) => {
    setShowConfirmModal(false);
    handleSubmit();
  };

  if (loading) return <Loading progress={progress} message="Cadastrando visitante..." />;

  return (
    <div className="new-incident-container">
      <div className="content">
        <section>
          <img src={logoImg} alt="Logo" width="350px" />
          <h1>Cadastrar Visitante</h1>
          <p>Informe os dados do visitante.</p>
          <Link className="back-link" to="/profile">
            <FiArrowLeft size={16} color="#e02041" />
            Voltar
          </Link>
        </section>

        <form>
          <p className='aviso-no-cadastro'>[ATENÇÃO] Se não houver placa, deixe em branco!!</p>
          <input
            name="nome"
            placeholder="Nome"
            value={form.nome}
            onChange={handleChange}
            required
          />

          <input
            type="date"
            name="nascimento"
            value={form.nascimento}
            onChange={handleChange}
            required
          />

          <input
            name="cpf"
            placeholder="CPF"
            value={form.cpf}
            onChange={handleCpfChange}
            maxLength={14}
            required
          />

          <select
            name="empresa_id"
            value={form.empresa_id}
            onChange={handleChange}
            required
          >
            <option value="">Selecione a empresa</option>
            {empresasVisitantes.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </select>

          <select
            name="setor_id"
            value={form.setor_id}
            onChange={handleChange}
            required
          >
            <option value="">Selecione o setor</option>
            {setoresVisitantes.map((setor) => (
              <option key={setor.id} value={setor.id}>
                {setor.nome}
              </option>
            ))}
          </select>


          <input
            name="placa_veiculo"
            placeholder="Placa do Veículo (ex: ABC1D23)"
            value={form.placa_veiculo}
            onChange={handleChange}
            maxLength={7}
            className={errors.placa_veiculo ? 'error' : ''}
          />
          {errors.placa_veiculo && (
            <span className="error-message">{errors.placa_veiculo}</span>
          )}

          <select
            name="cor_veiculo"
            value={form.cor_veiculo}
            onChange={handleChange}
            className={errors.cor_veiculo ? 'error' : ''}
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

          <textarea
            name="observacao"
            placeholder="Observações"
            value={form.observacao}
            onChange={handleChange}
          />

          {/* Upload de arquivo e webcam lado a lado */}
          <div className="file-upload-wrapper">
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              disabled={form.fotos.length >= 3}
              style={{ display: 'none' }}
            />

            {/* Container para os botões lado a lado */}
            <div className="upload-buttons-container">
              <label htmlFor="image-upload" className="upload-button">
                <span className="button-icon">+</span>
                <span className="button-text">Selecionar Imagens</span>
              </label>

              <button
                type="button"
                className="camera-button"
                onClick={() => { setCameraAtiva(true); setShowModal(true); }}
                disabled={form.fotos.length >= 3}
              >
                <FiCamera size={20} className='button-icon' /> Abrir Webcam
              </button>
            </div>

            <div className="upload-hint">
              {form.fotos.length < 3
                ? `Selecione mais ${3 - form.fotos.length} imagem(ns)`
                : 'Máximo de 3 imagens atingido'}
            </div>

            <div className="image-previews">
              {form.fotos.map((file, index) => (
                <div key={`${file.name}-${file.size}-${index}`} className="image-preview">
                  <div className="image-container">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Pré-visualização"
                      onLoad={() => URL.revokeObjectURL(file)}
                    />
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        fotos: prev.fotos.filter((_, i) => i !== index)
                      }))}
                      className="remove-image"
                    >
                      ×
                    </button>
                  </div>
                  <div className="image-info">
                    <span className="image-name">{file.name}</span>
                    <span className="image-size">({Math.round(file.size / 1024)} KB)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Webcam Modal */}
          {showModal && (
            <div className="modal-webcam">
              <div className="modal-estrtura-webcam">
                <video ref={videoRef} autoPlay width="780" height="620" />
                <canvas ref={canvasRef} width="780" height="620" style={{ display: 'none' }} />
                <div className="camera-webcam">
                  <button
                    type="button"
                    className="camera-action-btn btn-capture"
                    onClick={tirarFoto}
                  >
                    <FiCamera className="btn-icon" />
                    Tirar Foto
                  </button>
                  <button
                    type="button"
                    className="camera-action-btn btn-close"
                    onClick={pararCamera}
                  >
                    <FiArrowLeft className="btn-icon" />
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            className="button"
            type="button"
            onClick={handleOpenConfirm}
          >
            Cadastrar
          </button>
        </form>

        {showConfirmModal && (
          <div className="modal-cadastro-visitante">
            <div className="modal-content-visitante">
              <h3>Deseja realmente realizar o cadastro?</h3>
              <div className="modal-actions-visistante">
                <button
                  className="button yes"
                  onClick={handleConfirmSubmit}
                >
                  Sim
                </button>
                <button
                  className="button no"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Não
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}