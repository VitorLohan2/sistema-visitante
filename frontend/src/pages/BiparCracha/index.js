import React, { useState, useEffect } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './styles.css';
import logoImg from '../../assets/logo.svg';
import Loading from '../../components/Loading';

export default function BiparCracha() {
  const [cracha, setCracha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupTipo, setPopupTipo] = useState('erro'); // erro | alerta
  const [loading, setLoading] = useState(false);
  const [ultimoRegistro, setUltimoRegistro] = useState(null);
  const [nomeFuncionario, setNomeFuncionario] = useState('');

  useEffect(() => {
    if (showPopup) {
      const timeout = setTimeout(() => setShowPopup(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [showPopup]);

  const handleBipar = async () => {
    if (!cracha) {
      setMensagem('Número do crachá é obrigatório');
      setPopupTipo('alerta');
      setShowPopup(true);
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(
        '/registros-ponto',
        { cracha },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('ongId')
          }
        }
      );

      setMensagem(response.data.mensagem);
      setUltimoRegistro(response.data.registro);
      setNomeFuncionario(response.data.nomeFuncionario || '');
      setCracha('');
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.error || 'Erro ao registrar ponto';

      if (status === 400 && msg.toLowerCase().includes('obrigatório')) {
        setPopupTipo('alerta');
      } else if (status === 404 || msg.toLowerCase().includes('não encontrado')) {
        setPopupTipo('alerta');
      } else {
        setPopupTipo('erro');
      }

      setMensagem(msg);
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bipar-container">
      {loading && <Loading progress={100} />}

      {/* POPUP CENTRALIZADO */}
      {showPopup && (
        <div className="popup-notificacao">
          <div className={`popup-conteudo ${popupTipo === 'erro' ? 'popup-erro' : 'popup-alerta'}`}>
            {mensagem}
          </div>
        </div>
      )}

      <header>
        <div className="ajuste-Titulo">
          <img src={logoImg} alt="DIME" />
        </div>
        <Link className="back-link" to="/funcionarios">
          <FiArrowLeft size={16} color="#E02041" />
          Voltar
        </Link>
      </header>

      <div className="content">
        <section className="bipar-section">
          <h1>Registro de Ponto</h1>

          <div className="bipar-card">
            <input
              type="text"
              value={cracha}
              onChange={(e) => setCracha(e.target.value)}
              placeholder="Digite o número do crachá"
              onKeyPress={(e) => e.key === 'Enter' && handleBipar()}
              autoFocus
              className="bipar-input"
            />

            <button
              onClick={handleBipar}
              className="bipar-button"
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Confirmar'}
            </button>

            {mensagem && !showPopup && (
              <div className={`feedback ${mensagem.includes('sucesso') ? 'success' : 'error'}`}>
                {mensagem}
              </div>
            )}

            {ultimoRegistro && (
              <div className="ultimo-registro">
                {nomeFuncionario && (
                  <p><strong>Funcionário: {nomeFuncionario}</strong></p>
                )}
                {ultimoRegistro.tipo === 'entrada' ? (
                  <>
                    <p><strong>Primeiro Registro: Entrada</strong></p>
                    <p><strong>Horário Atual: {new Date(ultimoRegistro.hora_entrada).toLocaleString()}</strong></p>
                  </>
                ) : (
                  <>
                    <p><strong>Segundo Registro: Saída</strong></p>
                    <p><strong>Horário Atual: {new Date(ultimoRegistro.hora_saida).toLocaleString()}</strong></p>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}