// src/pages/NewIncident/index.js
import React, { useState } from 'react';
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
    empresa: '',
    setor: '',
    telefone: '',
    observacao: '',
    fotos: []
  });

  const history = useHistory();
  const empresas = ["Dime", "Dimep", "Dime Saúde"];
  const setores = ["Reunião", "Entrega", "Visita"];

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
    if (!form.empresa || !form.setor) return alert('Empresa e setor são obrigatórios.');
    if (form.fotos.length === 0) return alert('Envie pelo menos uma imagem.');

    const data = new FormData();
    data.append('nome', form.nome);
    data.append('nascimento', form.nascimento);
    data.append('cpf', cpfClean);
    data.append('empresa', form.empresa);
    data.append('setor', form.setor);
    data.append('telefone', telefoneClean);
    data.append('observacao', form.observacao);

    form.fotos.forEach((foto) => {
      data.append('fotos', foto);
    });

    try {
      await api.post('/incidents', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: localStorage.getItem('ongId')
        }
      });

      alert('Visitante cadastrado com sucesso!');
      history.push('/profile');
    } catch (err) {
      alert('Erro no cadastro');
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
            name="empresa"
            value={form.empresa}
            onChange={handleChange}
            required
          >
            <option value="">Empresa</option>
            {empresas.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>

          <select
            name="setor"
            value={form.setor}
            onChange={handleChange}
            required
          >
            <option value="">Setor</option>
            {setores.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
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

