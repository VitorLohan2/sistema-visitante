import React, { useEffect, useState } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import { FiArrowLeft, FiImage, FiX } from 'react-icons/fi';
import './styles.css';
import logoImg from '../../assets/logo.svg';
import api from '../../services/api';

export default function ViewVisitor() {
  const { id } = useParams();
  const history = useHistory();
  const [visitor, setVisitor] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const ongId = localStorage.getItem('ongId');

  useEffect(() => {
    async function fetchVisitor() {
      try {
        const response = await api.get(`/incidents/${id}`, {
          headers: { Authorization: ongId }
        });
        
        // Extrai as fotos dos campos imagem1, imagem2, imagem3
        const fotos = [];
        if (response.data.imagem1) fotos.push(response.data.imagem1);
        if (response.data.imagem2) fotos.push(response.data.imagem2);
        if (response.data.imagem3) fotos.push(response.data.imagem3);
        
        setVisitor({
          ...response.data,
          fotos // Adiciona o array de fotos ao state
        });
        
      } catch (err) {
        alert('Erro ao buscar o cadastro.');
        history.push('/profile');
      }
    }

    fetchVisitor();
  }, [id, ongId, history]);

  const formatCPF = (cpf) =>
    cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');

  const formatTelefone = (tel) =>
    tel.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');

  if (!visitor) return <div className="loading">Carregando...</div>;

  return (
    <div className="view-visitor-container">
      <header>
        <div className="ajuste-Titulo">
          <img src={logoImg} alt="Logo" />
          <span>Bem-vindo(a), {localStorage.getItem('ongName')}</span>
        </div>
        <Link className="back-link" to="/profile">
          <FiArrowLeft size={16} color="#E02041"/>
          Voltar
        </Link>
      </header>

      <div className="content">
        <section className="visitor-details">
          <h1>Visualização de Cadastro</h1>
          <p>Informações detalhadas do visitante.</p>

          <div className="readonly-form">
            <label>Nome</label>
            <input value={visitor.nome} readOnly />

            <label>Data de Nascimento</label>
            <input type="date" value={visitor.nascimento} readOnly />

            <label>CPF</label>
            <input value={formatCPF(visitor.cpf)} readOnly />

            <label>Empresa</label>
            <input value={visitor.empresa} readOnly />

            <label>Setor</label>
            <input value={visitor.setor} readOnly />

            <label>Telefone</label>
            <input value={formatTelefone(visitor.telefone)} readOnly />

            <label>Observação</label>
            <textarea value={visitor.observacao || ''} readOnly />

            {/* Seção de visualização de fotos */}
            <label>Fotos do Visitante</label>
            <div className="photo-gallery">
              {visitor.fotos && visitor.fotos.length > 0 ? (
                visitor.fotos.map((foto, index) => (
                  <div 
                    key={index} 
                    className="photo-thumbnail"
                    onClick={() => setSelectedImage(foto)}
                  >
                    <img 
                      src={foto}
                      alt={`Foto ${index + 1}`}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/150?text=Imagem+não+encontrada';
                      }}
                    />
                    <span className="photo-label">Foto {index + 1}</span>
                  </div>
                ))
              ) : (
                <div className="no-photos">
                  <FiImage size={24} color="#737380" />
                  <span>Nenhuma foto cadastrada</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Modal para visualização ampliada */}
      {selectedImage && (
        <div className="image-modal" onClick={() => setSelectedImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="close-button"
              onClick={() => setSelectedImage(null)}
            >
              <FiX size={24} />
            </button>
            <img 
              src={selectedImage}
              alt="Ampliada"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/600?text=Imagem+não+encontrada';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
