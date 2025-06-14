import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiTrash2, FiPlus, FiArrowLeft } from 'react-icons/fi';
import api from '../../services/api';
import './styles.css';
import logoImg from '../../assets/logo.svg';

export default function GeradorCodigo() {
  const [codigos, setCodigos] = useState([]);
  const [novoCodigo, setNovoCodigo] = useState('');
  const [limiteUsos, setLimiteUsos] = useState(1);
  const [loading, setLoading] = useState(false);
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

    try {
      await api.post('/codigos', {
        codigo: novoCodigo,
        limite_usos: limiteUsos
      }, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      setNovoCodigo('');
      carregarCodigos();
      alert('Código criado com sucesso!');
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao criar código');
    }
  };

  const handleDesativarTemporario = async (id) => {
    if (!window.confirm('Deseja desativar este código?')) return;

    try {
      await api.put(`/codigos/${id}/desativar`, null, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      carregarCodigos();
      alert('Código desativado!');
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao desativar código');
    }
  };

  const handleAtivarCodigo = async (id) => {
    if (!window.confirm('Deseja reativar este código?')) return;

    try {
      await api.put(`/codigos/${id}/ativar`, null, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      carregarCodigos();
      alert('Código reativado!');
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao ativar código');
    }
  };

  const handleDeletarCodigoPermanentemente = async (id) => {
    if (!window.confirm('Excluir permanentemente este código? Essa ação não pode ser desfeita.')) return;

    try {
      await api.delete(`/codigos/${id}/delete`, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      carregarCodigos();
      alert('Código excluído do banco.');
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao excluir código');
    }
  };

  return (
    <div className="gerador-container">
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
              placeholder="Nome do código (ex: TURMA2024)"
              value={novoCodigo}
              onChange={(e) => setNovoCodigo(e.target.value.toUpperCase())}
            />
            <input
              className="input-limite"
              type="number"
              placeholder="Limite de usos"
              min="1"
              value={limiteUsos}
              onChange={(e) => setLimiteUsos(e.target.value)}
            />
            <button 
              onClick={handleGerarCodigo} 
              className="gerar-button"
              disabled={loading}
            >
              <FiPlus size={16} />
              {loading ? 'Gerando...' : 'Gerar Código'}
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
                      Nenhum código cadastrado
                    </td>
                  </tr>
                ) : (
                  codigos.map(codigo => (
                    <tr key={codigo.id}>
                      <td>{codigo.codigo}</td>
                      <td>{codigo.usos_atuais} / {codigo.limite_usos}</td>
                      <td>{codigo.ativo ? 'Ativo' : 'Inativo'}</td>
                      <td className="actions">
                        {codigo.ativo && (
                          <button
                            onClick={() => handleDesativarTemporario(codigo.id)}
                            className="delete-button"
                            title="Desativar código"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}

                        {!codigo.ativo && codigo.usos_atuais < codigo.limite_usos && (
                          <button
                            onClick={() => handleAtivarCodigo(codigo.id)}
                            className="reactivate-button"
                            title="Ativar código"
                          >
                            Ativar
                          </button>
                        )}

                        <button
                          onClick={() => handleDeletarCodigoPermanentemente(codigo.id)}
                          className="delete-permanent-button"
                          title="Excluir permanentemente"
                        >
                          🗑️
                        </button>
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
