import React, { useEffect, useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import { FiImage, FiX } from "react-icons/fi";
import "./styles.css";
import api from "../../services/api";
import Loading from "../../components/Loading";

export default function VisualizarVisitante() {
  const { id } = useParams();
  const history = useHistory();
  const [visitor, setVisitor] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    async function fetchVisitor() {
      try {
        const response = await api.get(`/cadastro-visitantes/${id}`);

        // Extrai as fotos dos campos imagem1, imagem2, imagem3
        const fotos = [];
        if (response.data.imagem1) fotos.push(response.data.imagem1);
        if (response.data.imagem2) fotos.push(response.data.imagem2);
        if (response.data.imagem3) fotos.push(response.data.imagem3);

        setVisitor({
          ...response.data,
          fotos, // Adiciona o array de fotos ao state
        });
      } catch (err) {
        alert("Erro ao buscar o cadastro.");
        history.push("/listagem-visitante");
      }
    }

    fetchVisitor();
  }, [id, history]);

  const formatCPF = (cpf) =>
    cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");

  const formatTelefone = (tel) =>
    tel.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");

  if (!visitor)
    return <Loading variant="page" message="Carregando visitante..." />;

  return (
    <div className="view-visitor-container">
      <div className="content">
        <div className="view-header">
          <h1>Visualização de Cadastro</h1>
          <p>Informações detalhadas do visitante.</p>
        </div>

        <div className="readonly-form">
          <div className="form-group">
            <label>Nome</label>
            <input value={visitor.nome} readOnly />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data de Nascimento</label>
              <input type="date" value={visitor.nascimento} readOnly />
            </div>

            <div className="form-group">
              <label>CPF</label>
              <input value={formatCPF(visitor.cpf)} readOnly />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Empresa</label>
              <input value={visitor.empresa} readOnly />
            </div>

            <div className="form-group">
              <label>Setor</label>
              <input value={visitor.setor} readOnly />
            </div>
          </div>

          <div className="form-group">
            <label>Função</label>
            <input value={visitor.funcao || "Não informado"} readOnly />
          </div>

          <div className="form-group">
            <label>Placa do Veículo</label>
            <input value={visitor.placa_veiculo || "Não informado"} readOnly />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo do Veículo</label>
              <input value={visitor.tipo_veiculo || "Não informado"} readOnly />
            </div>

            <div className="form-group">
              <label>Cor do Veículo</label>
              <input value={visitor.cor_veiculo || "Não informado"} readOnly />
            </div>
          </div>

          <div className="form-group">
            <label>Telefone</label>
            <input value={formatTelefone(visitor.telefone)} readOnly />
          </div>

          <div className="form-group">
            <label>Observação</label>
            <textarea value={visitor.observacao || ""} readOnly rows={4} />
          </div>

          {/* Seção de visualização de fotos */}
          <div className="photo-gallery-section">
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
                        e.target.src =
                          "https://via.placeholder.com/150?text=Imagem+não+encontrada";
                      }}
                    />
                    <span className="photo-label">Foto {index + 1}</span>
                  </div>
                ))
              ) : (
                <div className="no-photos">
                  <FiImage size={24} color="#64748b" />
                  <span>Nenhuma foto cadastrada</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para visualização ampliada */}
      {selectedImage && (
        <div
          className="image-modal-visualizacao"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="modal-content-visualizacao"
            onClick={(e) => e.stopPropagation()}
          >
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
                e.target.src =
                  "https://via.placeholder.com/600?text=Imagem+não+encontrada";
              }}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
