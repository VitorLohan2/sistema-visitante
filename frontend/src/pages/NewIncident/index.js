// src/pages/NewIncident/index.js
import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../../services/api';
import './styles.css';
import logoImg from '../../assets/logo.svg';

export default function NewVisitor() {
  const [form, setForm] = useState({
    nome: '',
    nascimento: '',
    cpf: '',
    empresa_id: '',
    setor_id: '',
    telefone: '',
    observacao: '',
    fotos: [],
  });

  const history = useHistory();
  const [empresasVisitantes, setEmpresasVisitantes] = useState([]);
  const [setoresVisitantes, setSetoresVisitantes] = useState([]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'nome' ? value.toUpperCase() : value;
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
      // Verifica arquivos duplicados
      const nonDuplicateFiles = newFiles.filter(newFile => 
        !prev.fotos.some(existingFile => 
          existingFile.name === newFile.name && 
          existingFile.size === newFile.size &&
          existingFile.lastModified === newFile.lastModified
        )
      );
      
      // Combina as fotos existentes com as novas (limitando a 3 no total)
      const combinedFiles = [...prev.fotos, ...nonDuplicateFiles].slice(0, 3);
      
      // Mostra alerta se algum arquivo foi rejeitado por ser duplicado
      if (nonDuplicateFiles.length < newFiles.length) {
        alert('Algumas imagens foram ignoradas porque já foram selecionadas.');
      }
      
      return { ...prev, fotos: combinedFiles };
    });
    
    // Limpa o input para permitir nova seleção
    e.target.value = '';
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  const cpfClean = form.cpf.replace(/\D/g, '');
  const telefoneClean = form.telefone.replace(/\D/g, '');

  if (cpfClean.length !== 11) return alert('CPF inválido. Deve conter 11 dígitos.');
  if (telefoneClean.length !== 11) return alert('Telefone inválido. Deve conter 11 dígitos com DDD.');
  if (!form.empresa_id || !form.setor_id) return alert('Empresa e setor são obrigatórios.');
  if (form.fotos.length === 0) return alert('Envie pelo menos uma imagem.');

  try {
    // ⚠️ Verifica se o CPF já está cadastrado
    const { data } = await api.get(`/cpf-existe/${cpfClean}`);
    if (data.exists) {
      return alert('CPF já cadastrado. Verifique antes de continuar.');
    }

    // Prossegue com o envio se o CPF for único
    const dataToSend = new FormData();
    dataToSend.append('nome', form.nome);
    dataToSend.append('nascimento', form.nascimento);
    dataToSend.append('cpf', cpfClean);
    dataToSend.append('empresa', form.empresa_id);
    dataToSend.append('setor', form.setor_id);
    dataToSend.append('telefone', telefoneClean);
    dataToSend.append('observacao', form.observacao);
    
    // Anexa cada arquivo individualmente (sem array)
    form.fotos.forEach((foto) => {
      dataToSend.append('fotos', foto);
    });

      // Log para debug
      console.log('Dados sendo enviados:', {
        nome: form.nome.trim(),
        nascimento: form.nascimento,
        cpf: cpfClean,
        empresa: form.empresa_id,    // Note: 'empresa', não 'empresa_id'
        setor: form.setor_id,        // Note: 'setor', não 'setor_id'
        telefone: telefoneClean,
        observacao: form.observacao.trim(),
        fotos_count: form.fotos.length
      });

    await api.post('/incidents', dataToSend, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: localStorage.getItem('ongId')
      }
    });

    alert('Visitante cadastrado com sucesso!');
    history.push('/profile');
  } catch (err) {
    console.error('Erro detalhado:', err.response?.data); // Log detalhado
    alert(`Erro: ${err.response?.data?.error || 'Falha no cadastro'}`);
  }
};
  
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

        <form onSubmit={handleSubmit}>
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
          
          <div className="file-upload-wrapper">
            {/* Input escondido */}
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              disabled={form.fotos.length >= 3}
              style={{ display: 'none' }}
            />
            
            {/* Botão personalizado */}
            <label htmlFor="image-upload" className="upload-button">
              <span className="button-icon">+</span>
              <span className="button-text">Selecionar Imagens</span>
            </label>
            
            {/* Texto de orientação */}
            <div className="upload-hint">
              {form.fotos.length < 3 
                ? `Selecione mais ${3 - form.fotos.length} imagem(ns)` 
                : 'Máximo de 3 imagens atingido'}
            </div>
            
            {/* Pré-visualização das imagens */}
            <div className="image-previews">
              {form.fotos.map((file, index) => (
                <div key={`${file.name}-${file.size}`} className="image-preview">
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
                    <span className="image-size">({Math.round(file.size/1024)} KB)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="button" type="submit">
            Cadastrar
          </button>
        </form>
      </div>
    </div>
  );
}

