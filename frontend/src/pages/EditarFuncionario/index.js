import React, { useState, useEffect } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../../services/api';
import './styles.css';
import logoImg from '../../assets/logo.svg';
import Loading from '../../components/Loading';

export default function EditarFuncionario() {
  const [form, setForm] = useState({
    cracha: '',
    nome: '',
    setor: '',
    funcao: '',
    data_admissao: '',
    data_demissao: '',
    ativo: true
  });
  const [loading, setLoading] = useState(false);
  const history = useHistory();
  const { id } = useParams();
  const ongName = localStorage.getItem('ongName');

  useEffect(() => {
    carregarFuncionario();
  }, [id]);

  const carregarFuncionario = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/funcionarios/${id}`, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      setForm({
        cracha: response.data.cracha,
        nome: response.data.nome,
        setor: response.data.setor,
        funcao: response.data.funcao,
        data_admissao: response.data.data_admissao,
        data_demissao: response.data.data_demissao || '',
        ativo: response.data.ativo
      });
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao carregar funcionário');
      history.push('/funcionarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.put(`/funcionarios/${id}`, form, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      alert('Funcionário atualizado com sucesso!');
      history.push('/funcionarios');
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao atualizar funcionário');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (e) => {
    const ativo = e.target.value === 'ativo';
    setForm({
      ...form,
      ativo,
      data_demissao: ativo ? '' : new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="form-container">
      {loading && <Loading progress={100} />}

      <header>
        <div className="ajuste-Titulo">
          <img src={logoImg} alt="DIME" />
          <span>Bem-vindo(a), {ongName}</span>
        </div>
        <Link className="back-link" to="/funcionarios">
          <FiArrowLeft size={16} color="#E02041" />
          Voltar
        </Link>
      </header>

      <div className="content">
        <section className="form-section">
          <h1>Editar Funcionário</h1>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Crachá:</label>
              <input
                value={form.cracha}
                onChange={(e) => setForm({...form, cracha: e.target.value})}
                required
                maxLength="20"
                disabled
              />
            </div>

            <div className="input-group">
              <label>Nome Completo:</label>
              <input
                value={form.nome}
                onChange={(e) => setForm({...form, nome: e.target.value})}
                required
              />
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Setor:</label>
                <input
                  value={form.setor}
                  onChange={(e) => setForm({...form, setor: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label>Função:</label>
                <input
                  value={form.funcao}
                  onChange={(e) => setForm({...form, funcao: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Data de Admissão:</label>
                <input
                  type="date"
                  value={form.data_admissao}
                  onChange={(e) => setForm({...form, data_admissao: e.target.value})}
                  required
                />
              </div>

              {!form.ativo && (
                <div className="input-group">
                  <label>Data de Demissão:</label>
                  <input
                    type="date"
                    value={form.data_demissao}
                    onChange={(e) => setForm({...form, data_demissao: e.target.value})}
                  />
                </div>
              )}
            </div>

            <div className="input-group">
              <label>Status:</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    value="ativo"
                    checked={form.ativo}
                    onChange={handleStatusChange}
                  />
                  Ativo
                </label>
                <label>
                  <input
                    type="radio"
                    value="inativo"
                    checked={!form.ativo}
                    onChange={handleStatusChange}
                  />
                  Inativo
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-button">
                Salvar Alterações
              </button>
              <Link to="/funcionarios" className="cancel-button">
                Cancelar
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}