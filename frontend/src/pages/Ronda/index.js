/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Ronda de Vigilante
 * Interface para o vigilante iniciar, registrar checkpoints e finalizar rondas
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from "react";
import {
  FiPlay,
  FiSquare,
  FiMapPin,
  FiClock,
  FiNavigation,
  FiAlertCircle,
  FiCheckCircle,
  FiX,
  FiList,
  FiRefreshCw,
} from "react-icons/fi";
import { useRonda } from "../../hooks/useRonda";
import { usePermissoes } from "../../hooks/usePermissoes";
import { Link } from "react-router-dom";
import "./styles.css";

export default function Ronda() {
  // ═══════════════════════════════════════════════════════════════════════════
  // HOOKS
  // ═══════════════════════════════════════════════════════════════════════════
  const {
    rondaAtual,
    posicaoAtual,
    carregando,
    erro,
    tempoDecorridoFormatado,
    gpsAtivo,
    erroGps,
    iniciarRonda,
    registrarCheckpoint,
    finalizarRonda,
    cancelarRonda,
    limparErro,
    formatarTempo,
  } = useRonda();

  const { temPermissao } = usePermissoes();

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS LOCAIS
  // ═══════════════════════════════════════════════════════════════════════════
  const [descricaoCheckpoint, setDescricaoCheckpoint] = useState("");
  const [observacaoFinal, setObservacaoFinal] = useState("");
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false);
  const [mostrarModalFinalizar, setMostrarModalFinalizar] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [processando, setProcessando] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Exibe mensagem de sucesso temporária
   */
  const mostrarSucesso = useCallback((mensagem) => {
    setMensagemSucesso(mensagem);
    setTimeout(() => setMensagemSucesso(""), 4000);
  }, []);

  /**
   * Handler para iniciar ronda
   */
  const handleIniciarRonda = useCallback(async () => {
    try {
      setProcessando(true);
      await iniciarRonda();
      mostrarSucesso("Ronda iniciada com sucesso! GPS ativo.");
    } catch (err) {
      // Erro já tratado no hook
    } finally {
      setProcessando(false);
    }
  }, [iniciarRonda, mostrarSucesso]);

  /**
   * Handler para registrar checkpoint
   */
  const handleRegistrarCheckpoint = useCallback(async () => {
    try {
      setProcessando(true);
      await registrarCheckpoint(descricaoCheckpoint);
      setDescricaoCheckpoint("");
      mostrarSucesso("Checkpoint registrado com sucesso!");
    } catch (err) {
      // Erro já tratado no hook
    } finally {
      setProcessando(false);
    }
  }, [registrarCheckpoint, descricaoCheckpoint, mostrarSucesso]);

  /**
   * Handler para finalizar ronda
   */
  const handleFinalizarRonda = useCallback(async () => {
    try {
      setProcessando(true);
      const resultado = await finalizarRonda(observacaoFinal);
      setObservacaoFinal("");
      setMostrarModalFinalizar(false);
      mostrarSucesso(
        `Ronda finalizada! Tempo total: ${resultado.ronda.tempo_total}`
      );
    } catch (err) {
      // Erro já tratado no hook
    } finally {
      setProcessando(false);
    }
  }, [finalizarRonda, observacaoFinal, mostrarSucesso]);

  /**
   * Handler para cancelar ronda
   */
  const handleCancelarRonda = useCallback(async () => {
    try {
      setProcessando(true);
      await cancelarRonda(motivoCancelamento);
      setMotivoCancelamento("");
      setMostrarModalCancelar(false);
      mostrarSucesso("Ronda cancelada.");
    } catch (err) {
      // Erro já tratado no hook
    } finally {
      setProcessando(false);
    }
  }, [cancelarRonda, motivoCancelamento, mostrarSucesso]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  // Verificação de permissão
  if (!temPermissao("ronda_iniciar")) {
    return (
      <div className="ronda-container">
        <div className="ronda-acesso-negado">
          <FiAlertCircle size={48} />
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar o módulo de rondas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ronda-container">
      {/* Header */}
      <header className="ronda-header">
        <div className="ronda-header-titulo">
          <FiNavigation size={28} />
          <h1>Ronda de Vigilante</h1>
        </div>
        <div className="ronda-header-acoes">
          {temPermissao("ronda_visualizar_historico") && (
            <Link to="/ronda/historico" className="btn-secundario">
              <FiList size={18} />
              Histórico
            </Link>
          )}
        </div>
      </header>

      {/* Mensagens de feedback */}
      {erro && (
        <div className="ronda-mensagem erro">
          <FiAlertCircle size={20} />
          <span>{erro}</span>
          <button onClick={limparErro}>
            <FiX size={18} />
          </button>
        </div>
      )}

      {erroGps && (
        <div className="ronda-mensagem aviso">
          <FiAlertCircle size={20} />
          <span>{erroGps}</span>
        </div>
      )}

      {mensagemSucesso && (
        <div className="ronda-mensagem sucesso">
          <FiCheckCircle size={20} />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {/* Conteúdo principal */}
      <main className="ronda-main">
        {carregando && !rondaAtual ? (
          <div className="ronda-loading">
            <FiRefreshCw className="spin" size={32} />
            <p>Carregando...</p>
          </div>
        ) : !rondaAtual ? (
          /* Tela de iniciar ronda */
          <div className="ronda-iniciar-container">
            <div className="ronda-iniciar-card">
              <div className="ronda-iniciar-icone">
                <FiNavigation size={64} />
              </div>
              <h2>Iniciar Nova Ronda</h2>
              <p>
                Ao iniciar, sua localização GPS será capturada em tempo real.
                Certifique-se de que o GPS está habilitado.
              </p>

              {posicaoAtual && (
                <div className="ronda-posicao-preview">
                  <FiMapPin size={16} />
                  <span>
                    Posição atual: {posicaoAtual.latitude.toFixed(6)},{" "}
                    {posicaoAtual.longitude.toFixed(6)}
                  </span>
                </div>
              )}

              <button
                onClick={handleIniciarRonda}
                disabled={processando}
                className="btn-iniciar-ronda"
              >
                {processando ? (
                  <>
                    <FiRefreshCw className="spin" size={20} />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <FiPlay size={20} />
                    Iniciar Ronda
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Tela de ronda em andamento */
          <div className="ronda-em-andamento">
            {/* Card de informações */}
            <div className="ronda-info-card">
              <div className="ronda-info-header">
                <div className="ronda-status-badge ativa">
                  <span className="pulse"></span>
                  Ronda em Andamento
                </div>
                <span className="ronda-id">#{rondaAtual.id}</span>
              </div>

              <div className="ronda-info-grid">
                <div className="ronda-info-item">
                  <FiClock size={24} />
                  <div>
                    <span className="label">Tempo Decorrido</span>
                    <span className="valor destaque">
                      {tempoDecorridoFormatado}
                    </span>
                  </div>
                </div>

                <div className="ronda-info-item">
                  <FiMapPin size={24} />
                  <div>
                    <span className="label">Checkpoints</span>
                    <span className="valor">
                      {rondaAtual.total_checkpoints || 0}
                    </span>
                  </div>
                </div>

                <div className="ronda-info-item">
                  <FiNavigation size={24} />
                  <div>
                    <span className="label">GPS</span>
                    <span className={`valor ${gpsAtivo ? "ativo" : "inativo"}`}>
                      {gpsAtivo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>

                {posicaoAtual && (
                  <div className="ronda-info-item posicao">
                    <FiMapPin size={24} />
                    <div>
                      <span className="label">Posição Atual</span>
                      <span className="valor coordenadas">
                        {posicaoAtual.latitude.toFixed(6)},{" "}
                        {posicaoAtual.longitude.toFixed(6)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card de checkpoint */}
            {temPermissao("ronda_registrar_checkpoint") && (
              <div className="ronda-checkpoint-card">
                <h3>
                  <FiMapPin size={20} />
                  Registrar Checkpoint
                </h3>
                <div className="ronda-checkpoint-form">
                  <input
                    type="text"
                    placeholder="Descrição do ponto (opcional)"
                    value={descricaoCheckpoint}
                    onChange={(e) => setDescricaoCheckpoint(e.target.value)}
                    maxLength={500}
                  />
                  <button
                    onClick={handleRegistrarCheckpoint}
                    disabled={processando}
                    className="btn-checkpoint"
                  >
                    {processando ? (
                      <FiRefreshCw className="spin" size={18} />
                    ) : (
                      <FiMapPin size={18} />
                    )}
                    Marcar Ponto
                  </button>
                </div>
              </div>
            )}

            {/* Lista de checkpoints */}
            {rondaAtual.checkpoints && rondaAtual.checkpoints.length > 0 && (
              <div className="ronda-checkpoints-lista">
                <h3>
                  <FiList size={20} />
                  Checkpoints Registrados
                </h3>
                <ul>
                  {rondaAtual.checkpoints.map((cp, index) => (
                    <li key={cp.id || index} className="checkpoint-item">
                      <div className="checkpoint-numero">
                        {cp.numero_sequencial}
                      </div>
                      <div className="checkpoint-info">
                        <span className="checkpoint-hora">
                          {new Date(cp.data_hora).toLocaleTimeString("pt-BR")}
                        </span>
                        {cp.descricao && (
                          <span className="checkpoint-descricao">
                            {cp.descricao}
                          </span>
                        )}
                        <span className="checkpoint-tempo">
                          +
                          {cp.tempo_desde_anterior ||
                            formatarTempo(cp.tempo_desde_anterior_segundos)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Botões de ação */}
            <div className="ronda-acoes">
              {temPermissao("ronda_finalizar") && (
                <button
                  onClick={() => setMostrarModalFinalizar(true)}
                  className="btn-finalizar"
                  disabled={processando}
                >
                  <FiSquare size={20} />
                  Finalizar Ronda
                </button>
              )}

              {temPermissao("ronda_cancelar") && (
                <button
                  onClick={() => setMostrarModalCancelar(true)}
                  className="btn-cancelar"
                  disabled={processando}
                >
                  <FiX size={20} />
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal de Finalizar */}
      {mostrarModalFinalizar && (
        <div className="ronda-modal-overlay">
          <div className="ronda-modal">
            <h3>
              <FiSquare size={24} />
              Finalizar Ronda
            </h3>
            <p>
              Tem certeza que deseja finalizar a ronda? O trajeto e checkpoints
              serão salvos.
            </p>
            <textarea
              placeholder="Observações finais (opcional)"
              value={observacaoFinal}
              onChange={(e) => setObservacaoFinal(e.target.value)}
              rows={3}
              maxLength={1000}
            />
            <div className="ronda-modal-acoes">
              <button
                onClick={() => setMostrarModalFinalizar(false)}
                className="btn-secundario"
                disabled={processando}
              >
                Voltar
              </button>
              <button
                onClick={handleFinalizarRonda}
                className="btn-finalizar"
                disabled={processando}
              >
                {processando ? (
                  <FiRefreshCw className="spin" size={18} />
                ) : (
                  <FiSquare size={18} />
                )}
                Confirmar Finalização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelar */}
      {mostrarModalCancelar && (
        <div className="ronda-modal-overlay">
          <div className="ronda-modal">
            <h3>
              <FiX size={24} />
              Cancelar Ronda
            </h3>
            <p>
              Tem certeza que deseja cancelar a ronda? Esta ação não pode ser
              desfeita.
            </p>
            <textarea
              placeholder="Motivo do cancelamento (opcional)"
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <div className="ronda-modal-acoes">
              <button
                onClick={() => setMostrarModalCancelar(false)}
                className="btn-secundario"
                disabled={processando}
              >
                Voltar
              </button>
              <button
                onClick={handleCancelarRonda}
                className="btn-danger"
                disabled={processando}
              >
                {processando ? (
                  <FiRefreshCw className="spin" size={18} />
                ) : (
                  <FiX size={18} />
                )}
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
