import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiTrash2, FiPlus, FiArrowLeft } from 'react-icons/fi';
import api from '../../services/api';
import './styles.css';
import logoImg from '../../assets/logo.svg';
import SwitchToggle from '../../components/SwitchToggle';
import Loading from '../../components/Loading';

export default function GeradorCodigo() {
  const [codigos, setCodigos] = useState([]);
  const [novoCodigo, setNovoCodigo] = useState('');
  const [limiteUsos, setLimiteUsos] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const history = useHistory();
  const ongName = localStorage.getItem('ongName');

  useEffect(() => {
    carregarCodigos();
  }, []);

  const carregarCodigos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/codigos', {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      setCodigos(response.data);
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao carregar códigos');
    } finally {
      setLoading(false);
    }
  };

  const handleGerarCodigo = async () => {
    if (!novoCodigo) {
      alert('Preencha o código!');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    
    // Simulação de progresso (pode ser substituído por progresso real da API)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 300);

    try {
      await api.post('/codigos', {
        codigo: novoCodigo,
        limite_usos: limiteUsos
      }, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      setNovoCodigo('');
      await carregarCodigos();
      alert('Código criado com sucesso!');
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao criar código');
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const handleDesativarTemporario = async (id) => {
    if (!window.confirm('Deseja desativar este código?')) return;

    try {
      setLoading(true);
      await api.put(`/codigos/${id}/desativar`, null, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      await carregarCodigos();
      alert('Código desativado!');
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao desativar código');
    } finally {
      setLoading(false);
    }
  };

  const handleAtivarCodigo = async (id) => {
    if (!window.confirm('Deseja reativar este código?')) return;

    try {
      setLoading(true);
      await api.put(`/codigos/${id}/ativar`, null, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      await carregarCodigos();
      alert('Código reativado!');
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao ativar código');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletarCodigoPermanentemente = async (id) => {
    if (!window.confirm('Excluir permanentemente este código? Essa ação não pode ser desfeita.')) return;

    try {
      setLoading(true);
      await api.delete(`/codigos/${id}/delete`, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      await carregarCodigos();
      alert('Código excluído do banco.');
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao excluir código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gerador-container">
      {isGenerating && <Loading progress={progress} />}
      {loading && <Loading progress={100} />} {/* Loading genérico para outras operações */}

      <header>
        <div className="ajuste-Titulo">
          <img src={logoImg} alt="DIME" />
          <span>Bem-vindo(a), {ongName}</span>
        </div>
        <Link className="back-link" to="/profile">
          <FiArrowLeft size={16} color="#E02041" />
          Voltar
        </Link>
      </header>

      <div className="content">
        <section className="gerador-section">
          <h1>Código de Cadastro</h1>

          <div className="gerador-form-inline">
            <input
              className="input-codigo"
              placeholder="Nome do código (ex: DIME2025)"
              value={novoCodigo}
              onChange={(e) => setNovoCodigo(e.target.value.toUpperCase())}
              disabled={isGenerating || loading}
            />
            <input
              className="input-limite"
              type="number"
              placeholder="Limite de usos"
              min="1"
              value={limiteUsos}
              onChange={(e) => setLimiteUsos(e.target.value)}
              disabled={isGenerating || loading}
            />
            <button 
              onClick={handleGerarCodigo} 
              className="gerar-button"
              disabled={isGenerating || loading}
            >
              <FiPlus size={16} />
              {isGenerating ? 'Gerando...' : 'Gerar Código'}
            </button>
          </div>

          <div className="gerador-table-container">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Usos</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {codigos.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center' }}>
                      {loading ? 'Carregando...' : 'Nenhum código cadastrado'}
                    </td>
                  </tr>
                ) : (
                  codigos.map(codigo => (
                    <tr key={codigo.id}>
                      <td><strong>{codigo.codigo}</strong></td>
                      <td>{codigo.usos_atuais} / {codigo.limite_usos}</td>
                      <td>{codigo.ativo ? 'Ativo' : 'Inativo'}</td>
                      <td className="actions">
                        <div className="actions-container">
                          <SwitchToggle
                            isOn={codigo.ativo}
                            handleToggle={() =>
                              codigo.ativo
                                ? handleDesativarTemporario(codigo.id)
                                : handleAtivarCodigo(codigo.id)
                            }
                            disabled={loading}
                          />
                          <button
                            onClick={() => handleDeletarCodigoPermanentemente(codigo.id)}
                            className="delete-permanent-button"
                            title="Excluir permanentemente"
                            disabled={loading}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
