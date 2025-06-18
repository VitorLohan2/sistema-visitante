import React, { useState, useEffect } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../../services/api';
import './styles.css';
import logoImg from '../../assets/logo.svg';
import Loading from '../../components/Loading';

// Dados estruturais dos setores e funções
const setoresEFuncoes = {
  'EXPEDIÇÃO': [
    'TRAINEE GESTÃO LOGÍSTICA',
    'TRAINEE ASSIST. DE EXPEDIÇÃO',
    'ASSISTENTE DE EXPEDIÇÃO I',
    'ASSIST. DE EXPEDIÇÃO II',
    'ASSIST. DE EXPEDIÇÃO III',
    'ASSIST. DE EXPEDIÇÃO IV',
    'AUXILIAR DE EXPEDIÇÃO',
    'ASSIST. DE SALA NOBRE',
    'CONFERENTE DE CARGA I',
    'CONFERENTE DE CARGA II',
    'AUX. CONFERENTE DE CARGA',
    'MECANICO DE VEICULOS',
    'MANOBRISTA',
    'LAVADOR DE VEICULOS II'      
  ],
  'ADMINISTRATIVO': [
    'ASSISTENTE ADMINISTRATIVO',
    'ANALISTA ADMINISTRATIVO',
    'GERENTE ADMINISTRATIVO'
  ]
};

export default function EditarFuncionario() {
  const [form, setForm] = useState({
    cracha: '',
    nome: '',
    setor: '',
    funcao: '',
    data_admissao: new Date().toISOString().split('T')[0],
    ativo: true,
    data_demissao: ''
  });
  const [funcoesDisponiveis, setFuncoesDisponiveis] = useState([]);
  const [loading, setLoading] = useState(false);
  const history = useHistory();
  const { cracha } = useParams(); // Alterado de id para cracha
  const ongName = localStorage.getItem('ongName');

  useEffect(() => {
    carregarFuncionario();
  }, [cracha]); // Alterado para depender de cracha

  // Atualiza as funções disponíveis quando o setor é alterado
  useEffect(() => {
    if (form.setor && setoresEFuncoes[form.setor]) {
      setFuncoesDisponiveis(setoresEFuncoes[form.setor]);
    } else {
      setFuncoesDisponiveis([]);
    }
  }, [form.setor]);

  const carregarFuncionario = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/funcionarios/${cracha}`, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });

      const funcionario = response.data;
      
      setForm({
        cracha: funcionario.cracha,
        nome: funcionario.nome,
        setor: funcionario.setor,
        funcao: funcionario.funcao,
        data_admissao: funcionario.data_admissao.split('T')[0],
        ativo: funcionario.ativo,
        data_demissao: funcionario.data_demissao ? funcionario.data_demissao.split('T')[0] : ''
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
    
    // Validação básica dos campos obrigatórios
    if (!form.nome || !form.setor || !form.funcao || !form.data_admissao) {
      alert('Preencha todos os campos obrigatórios!');
      return;
    }

    try {
      setLoading(true);
      
      // Prepara os dados para envio
      const dadosParaEnviar = {
        nome: form.nome,
        setor: form.setor,
        funcao: form.funcao,
        data_admissao: form.data_admissao,
        data_demissao: form.data_demissao || null,
        ativo: form.ativo
      };

      await api.put(`/funcionarios/${cracha}`, dadosParaEnviar, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      
      alert('Funcionário atualizado com sucesso!');
      history.push('/funcionarios');
    } catch (error) {
      console.error('Erro completo:', error.response?.data);
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

  const handleNomeChange = (e) => {
    setForm({...form, nome: e.target.value.toUpperCase()});
  };

  const handleCrachaChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setForm({...form, cracha: value});
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
                onChange={handleCrachaChange}
                required
                maxLength="20"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                disabled
              />
            </div>

            <div className="input-group">
              <label>Nome Completo:</label>
              <input
                value={form.nome}
                onChange={handleNomeChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Setor:</label>
                <select
                  value={form.setor}
                  onChange={(e) => setForm({...form, setor: e.target.value})}
                  required
                  className="input-select"
                >
                  <option value="">Selecione um setor</option>
                  {Object.keys(setoresEFuncoes).map(setor => (
                    <option key={setor} value={setor}>{setor}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Função:</label>
                <select
                  value={form.funcao}
                  onChange={(e) => setForm({...form, funcao: e.target.value})}
                  required
                  disabled={!form.setor}
                  className="input-select"
                >
                  <option value="">Selecione uma função</option>
                  {funcoesDisponiveis.map(funcao => (
                    <option key={funcao} value={funcao}>{funcao}</option>
                  ))}
                </select>
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
                    disabled={form.ativo}
                  />
                </div>
              )}
            </div>

            <div className="marcador">
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