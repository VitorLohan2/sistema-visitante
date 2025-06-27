import React, { useState, useEffect } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCalendar, FiFilter } from 'react-icons/fi';
import api from '../../services/api';
import './styles.css';
import logoImg from '../../assets/logo.svg';
import Loading from '../../components/Loading';

export default function HistoricoFuncionarios() {
  const [registros, setRegistros] = useState([]);
  const [funcionario, setFuncionario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: ''
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const history = useHistory();
  const { cracha } = useParams();
  const ongName = localStorage.getItem('ongName');

  useEffect(() => {
    carregarDados();
  }, [cracha]);

  // Funções para tratamento de datas no fuso horário do Brasil (GMT-3)
  const formatarDataParaAPI = (dataString) => {
    if (!dataString) return '';
    
    const data = new Date(dataString);
    // Ajusta para o fuso horário do Brasil (GMT-3)
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset() + 180);
    return data.toISOString().split('T')[0];
  };

  const formatarDataExibicao = (dataString) => {
    if (!dataString) return '-';
    
    const data = new Date(dataString);
    // Ajusta para o fuso horário do Brasil
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset() + 180);
    
    return data.toLocaleDateString('pt-BR');
  };

  const formatarHoraExibicao = (dataString) => {
    if (!dataString) return '-';
    
    const data = new Date(dataString);
    // Ajusta para o fuso horário do Brasil
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset() + 180);
    
    // Formato 24h + am/pm
    const horas = data.getHours();
    const minutos = data.getMinutes();
    const periodo = horas >= 12 ? 'pm' : 'am';
    
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')} ${periodo}`;
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carrega dados do funcionário
      const responseFunc = await api.get(`/funcionarios/${cracha}`, {
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      setFuncionario(responseFunc.data);

      // Carrega histórico
      await carregarHistorico();
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao carregar dados');
      history.push('/funcionarios');
    } finally {
      setLoading(false);
    }
  };

  const carregarHistorico = async () => {
    try {
      const params = {};
      
      // Formata as datas para o fuso horário do Brasil antes de enviar
      if (filtros.dataInicio) {
        params.dataInicio = formatarDataParaAPI(filtros.dataInicio);
      }
      if (filtros.dataFim) {
        // Adiciona 1 dia para incluir o dia inteiro da data fim
        const dataFim = new Date(filtros.dataFim);
        dataFim.setDate(dataFim.getDate() + 1);
        params.dataFim = formatarDataParaAPI(dataFim.toISOString().split('T')[0]);
      }

      const response = await api.get(`/registros-ponto/historico`, {
        params: { cracha, ...params },
        headers: { Authorization: localStorage.getItem('ongId') }
      });
      
      setRegistros(response.data.registros);
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao carregar histórico');
    }
  };

  const calcularHorasTrabalhadas = (registro) => {
    if (!registro.hora_entrada || !registro.hora_saida) return '-';
    
    try {
      const ajustarFusoBrasil = (dataString) => {
        const data = new Date(dataString);
        data.setMinutes(data.getMinutes() + data.getTimezoneOffset() + 180);
        return data;
      };
      
      const entrada = ajustarFusoBrasil(registro.hora_entrada);
      const saida = ajustarFusoBrasil(registro.hora_saida);
      
      if (saida <= entrada) return 'Inválido';
      
      const diffMs = saida - entrada;
      const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      // Formatação apenas em 24h (sem AM/PM)
      return `${String(diffHoras).padStart(2, '0')}:${String(diffMinutos).padStart(2, '0')}`;
    } catch (error) {
      console.error('Erro ao calcular horas:', error);
      return 'Erro';
    }
  };

  const aplicarFiltros = async () => {
    try {
      setLoading(true);
      await carregarHistorico();
      setMostrarFiltros(false);
    } finally {
      setLoading(false);
    }
  };

  const limparFiltros = async () => {
    setFiltros({
      dataInicio: '',
      dataFim: ''
    });
    await carregarHistorico();
  };

  return (
    <div className="historico-container">
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
        <section className="historico-section">
          <div className="historico-header">
            <h1>Histórico de Pontos</h1>
            <button 
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="filter-button"
            >
              <FiFilter size={18} />
              Filtros
            </button>
          </div>

          {funcionario && (
            <div className="funcionario-info">
              <h2>{funcionario.nome}</h2>
              <p>Crachá: {funcionario.cracha} | Setor: {funcionario.setor}</p>
            </div>
          )}

          {mostrarFiltros && (
            <div className="filtros-container">
              <div className="filtros-linha">
                <div className="filtro-group">
                  <label>
                    <FiCalendar size={16} />
                    Data Início:
                  </label>
                  <input
                    type="date"
                    value={filtros.dataInicio}
                    onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
                  />
                </div>

                <div className="filtro-group">
                  <label>
                    <FiCalendar size={16} />
                    Data Fim:
                  </label>
                  <input
                    type="date"
                    value={filtros.dataFim}
                    onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
                  />
                </div>
              </div>

              <div className="filtro-actions">
                <button onClick={aplicarFiltros} className="aplicar-button">
                  Aplicar Filtros
                </button>
                <button onClick={limparFiltros} className="limpar-button">
                  Limpar Filtros
                </button>
              </div>
            </div>
          )}

          <div className="historico-table-container">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Entrada</th>
                  <th>Saída</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center' }}>
                      {loading ? 'Carregando...' : 'Nenhum registro encontrado'}
                    </td>
                  </tr>
                ) : (
                  registros.map(registro => (
                    <tr key={registro.id}>
                      <td>{formatarDataExibicao(registro.data)}</td>
                      <td>
                        {registro.hora_entrada 
                          ? formatarHoraExibicao(registro.hora_entrada)
                          : '-'}
                      </td>
                      <td>
                        {registro.hora_saida 
                          ? formatarHoraExibicao(registro.hora_saida)
                          : '-'}
                      </td>
                      <td>{calcularHorasTrabalhadas(registro)}</td>
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