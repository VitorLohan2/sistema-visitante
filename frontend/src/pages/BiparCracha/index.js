import React, { useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './styles.css';
import logoImg from '../../assets/logo.svg';
import Loading from '../../components/Loading';

export default function BiparCracha() {
  const [cracha, setCracha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [ultimoRegistro, setUltimoRegistro] = useState(null);
  const [nomeFuncionario, setNomeFuncionario] = useState('');

const handleBipar = async () => {
  if (!cracha) {
    setMensagem('Digite o número do crachá');
    return;
  }

  try {
    setLoading(true);
    console.log('Enviando crachá:', cracha);

    const response = await api.post('/registros-ponto', 
      { cracha: cracha }, // Garanta que está enviando como objeto
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: localStorage.getItem('ongId') // Adicione autenticação se necessário
        }
      }
    );
    
    console.log('Resposta:', response.data);
    setMensagem(response.data.mensagem);
    setUltimoRegistro(response.data.registro);
    setNomeFuncionario(response.data.nomeFuncionario || ''); // Adiciona o nome do funcionário
    setCracha('');
  } catch (error) {
    console.error('Erro detalhado:', error.response);
    setMensagem(error.response?.data?.error || 'Erro ao registrar ponto');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="bipar-container">
      {loading && <Loading progress={100} />}

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

            {mensagem && (
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