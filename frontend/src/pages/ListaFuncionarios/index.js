import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiTrash2, FiEdit2, FiClock, FiArrowLeft } from 'react-icons/fi';
import api from '../../services/api';
import './styles.css';
import logoImg from '../../assets/logo.svg';
import Loading from '../../components/Loading';

export default function ListaFuncionarios() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const history = useHistory();
  const ongName = localStorage.getItem('ongName');
  const isAdmin = localStorage.getItem('ongType') === 'ADM';

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  const carregarFuncionarios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/funcionarios', {
        params: { mostrarInativos: true },
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      
    // Ordenar por nome (case insensitive)
    const funcionariosOrdenados = response.data.sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
    );

    setFuncionarios(funcionariosOrdenados);
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  };

  const handleInativar = async (cracha) => {
    if (!window.confirm('Deseja inativar este funcionário?')) return;

    try {
      setLoading(true);
      await api.put(`/funcionarios/${cracha}`, {
        ativo: false,
        data_demissao: new Date().toISOString().split('T')[0]
      }, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      await carregarFuncionarios();
      alert('Funcionário inativado!');
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao inativar funcionário');
    } finally {
      setLoading(false);
    }
  };

  const handleReativar = async (cracha) => {
    if (!window.confirm('Deseja reativar este funcionário?')) return;

    try {
      setLoading(true);
      await api.put(`/funcionarios/${cracha}`, {
        ativo: true,
        data_demissao: null
      }, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      await carregarFuncionarios();
      alert('Funcionário reativado!');
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao reativar funcionário');
    } finally {
      setLoading(false);
    }
  };

  const filteredFuncionarios = funcionarios.filter(funcionario =>
    funcionario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    funcionario.cracha.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="funcionarios-container">
      {loading && <Loading progress={100} />}

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
        <section className="funcionarios-section">
          <h1>Funcionários</h1>

          <div className="funcionarios-header">
            {isAdmin && (
              <Link to="/funcionarios/cadastrar" className="new-button">
                Cadastrar Funcionário
              </Link>
            )}
            <input
              type="text"
              placeholder="Buscar por nome ou crachá"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input-Funcionarios"
            />
          </div>

          <div className="tabela-funcionarios-wrapper">
            <table className="tabela-funcionarios thead-table">
              <thead>
                <tr>
                  <th>Crachá</th>
                  <th>Nome</th>
                  <th>Setor</th>
                  <th>Função</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
            </table>
            <div className="tbody-scroll">
              <table className="tabela-funcionarios tbody-table">
                <tbody>
                  {filteredFuncionarios.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center' }}>
                        {loading ? 'Carregando...' : 'Nenhum funcionário encontrado'}
                      </td>
                    </tr>
                  ) : (
                    filteredFuncionarios.map(funcionario => (
                      <tr key={funcionario.cracha} className={!funcionario.ativo ? 'inactive-row' : ''}>
                        <td><strong>{funcionario.cracha}</strong></td>
                        <td className={!funcionario.ativo ? 'inactive-name' : ''}>{funcionario.nome}</td>
                        <td>{funcionario.setor}</td>
                        <td>{funcionario.funcao}</td>
                        <td>
                          <span className={`status-badge ${funcionario.ativo ? 'active' : 'inactive'}`}>
                            {funcionario.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="actions-list-funcionarios">
                          <div className="actions-container">
                            <Link to={`/funcionarios/historico/${funcionario.cracha}`} className="history-button" title="Histórico">
                              <FiClock size={16} />
                            </Link>
                            {isAdmin && (
                              <>
                                <Link to={`/funcionarios/editar/${funcionario.cracha}`} className="edit-fun-button" title="Editar">
                                  <FiEdit2 size={16} />
                                </Link>
                                <button
                                  onClick={() =>
                                    funcionario.ativo
                                      ? handleInativar(funcionario.cracha)
                                      : handleReativar(funcionario.cracha)
                                  }
                                  className={`status-button ${funcionario.ativo ? 'inactivate' : 'reactivate'}`}
                                  title={funcionario.ativo ? 'Inativar' : 'Reativar'}
                                >
                                  {funcionario.ativo ? 'Inativar' : 'Reativar'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="contador-funcionarios">
            <div className="contador-edit">
              Total de funcionários cadastrados: {filteredFuncionarios.length}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
