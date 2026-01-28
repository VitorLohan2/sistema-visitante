import logger from "../../utils/logger";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VISUALIZAR VISITANTE - Página de Detalhes do Cadastro
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dados: Carregados do cache (Home é responsável pelo carregamento inicial)
 * Atualização: Via Socket.IO em tempo real
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, useRef } from "react";
import { useParams, useHistory } from "react-router-dom";
import { FiImage, FiX } from "react-icons/fi";
import "./styles.css";
import api from "../../services/api";
import { getCache, setCache } from "../../services/cacheService";
import * as socketService from "../../services/socketService";
import Loading from "../../components/Loading";

export default function VisualizarCadastroVisitante() {
  const { id } = useParams();
  const history = useHistory();
  const [visitor, setVisitor] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const socketListenersRef = useRef([]);

  // ═══════════════════════════════════════════════════════════════
  // CARREGAMENTO INICIAL - Primeiro do cache, depois API se necessário
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    async function loadVisitor() {
      try {
        // ✅ Primeiro verifica se já tem no cache
        const cachedVisitantes = getCache("cadastroVisitantes") || [];
        const cachedVisitor = cachedVisitantes.find(
          (v) => v.id === parseInt(id),
        );

        if (cachedVisitor) {
          logger.log("📦 Usando visitante do cache");
          // Extrai as fotos dos campos imagem1, imagem2, imagem3
          const fotos = [];
          if (cachedVisitor.imagem1) fotos.push(cachedVisitor.imagem1);
          if (cachedVisitor.imagem2) fotos.push(cachedVisitor.imagem2);
          if (cachedVisitor.imagem3) fotos.push(cachedVisitor.imagem3);

          setVisitor({
            ...cachedVisitor,
            fotos,
          });
          return;
        }

        // Se não tem no cache, busca da API
        const response = await api.get(`/cadastro-visitantes/${id}`);

        // Extrai as fotos dos campos imagem1, imagem2, imagem3
        const fotos = [];
        if (response.data.imagem1) fotos.push(response.data.imagem1);
        if (response.data.imagem2) fotos.push(response.data.imagem2);
        if (response.data.imagem3) fotos.push(response.data.imagem3);

        setVisitor({
          ...response.data,
          fotos,
        });
      } catch (err) {
        alert("Erro ao buscar o cadastro.");
        history.push("/listagem-visitante");
      }
    }

    loadVisitor();
  }, [id, history]);

  // ═══════════════════════════════════════════════════════════════
  // SOCKET.IO - Sincronização em tempo real
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    // Limpa listeners anteriores
    socketListenersRef.current.forEach((unsub) => unsub && unsub());
    socketListenersRef.current = [];

    // Listener: Visitante atualizado
    const unsubUpdate = socketService.on("visitante:updated", (dados) => {
      if (dados.id === parseInt(id)) {
        logger.log("📝 Socket: Visitante atualizado em tempo real", dados.id);

        // Atualiza o estado local
        setVisitor((prev) => {
          if (!prev) return prev;

          // Extrai as fotos atualizadas
          const fotos = [];
          if (dados.imagem1 || prev.imagem1)
            fotos.push(dados.imagem1 || prev.imagem1);
          if (dados.imagem2 || prev.imagem2)
            fotos.push(dados.imagem2 || prev.imagem2);
          if (dados.imagem3 || prev.imagem3)
            fotos.push(dados.imagem3 || prev.imagem3);

          return {
            ...prev,
            ...dados,
            fotos,
          };
        });

        // Atualiza também no cache global
        const cachedVisitantes = getCache("cadastroVisitantes") || [];
        const novosVisitantes = cachedVisitantes.map((v) =>
          v.id === dados.id ? { ...v, ...dados } : v,
        );
        setCache("cadastroVisitantes", novosVisitantes);
      }
    });

    // Listener: Visitante deletado
    const unsubDelete = socketService.on("visitante:deleted", (dados) => {
      if (dados.id === parseInt(id)) {
        logger.log("🗑️ Socket: Visitante deletado", dados.id);
        alert("Este visitante foi removido do sistema.");
        history.push("/listagem-visitante");
      }
    });

    socketListenersRef.current.push(unsubUpdate, unsubDelete);

    // Cleanup ao desmontar
    return () => {
      socketListenersRef.current.forEach((unsub) => unsub && unsub());
      socketListenersRef.current = [];
    };
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


