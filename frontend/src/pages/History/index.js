import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiSearch, FiFileText } from 'react-icons/fi';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import api from '../../services/api';
import Loading from '../../components/Loading';
import './styles.css';

import logoImg from '../../assets/logo.svg';

export default function History() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const [selectedObservation, setSelectedObservation] = useState(null); // 👈 guarda obs do visitante
  const [isModalOpen, setIsModalOpen] = useState(false);

  const ongId = localStorage.getItem('ongId');
  const ongName = localStorage.getItem('ongName');

  useEffect(() => {
    const simulateProgress = () => {
      let value = 0;
      const interval = setInterval(() => {
        value += 10;
        setProgress(value);
        if (value >= 100) clearInterval(interval);
      }, 100);
    };

    const fetchHistory = async () => {
      try {
        simulateProgress();

        const response = await api.get('history', {
          headers: {
            Authorization: ongId,
          },
        });

        // Ordenar os dados por data de entrada (mais recente primeiro)
        const sortedData = response.data.sort((a, b) => {
          const dateA = new Date(a.entry_date || a.created_at);
          const dateB = new Date(b.entry_date || b.created_at);
          return dateB - dateA; // Ordem decrescente
        });

        setHistoryData(sortedData);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        alert('Erro ao carregar histórico. Verifique sua conexão.');
      } finally {
        setTimeout(() => {
          setLoading(false);
          setProgress(100);
        }, 1000);
      }
    };

    fetchHistory();
  }, [ongId]);

  const filteredHistoryData = historyData.filter(visitor => {
    const matchesSearch =
      (visitor.name && visitor.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (visitor.cpf && visitor.cpf.includes(searchTerm));

    if (!filterDate) return matchesSearch;

    function formatDateToLocalYYYYMMDD(dateString) {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const entryDateFormatted = formatDateToLocalYYYYMMDD(visitor.entry_date || visitor.created_at);

    return matchesSearch && entryDateFormatted === filterDate;
  });

  function exportToExcel(data) {
    const formattedData = data.map(visitor => ({
      Nome: visitor.name || 'Não informado',
      CPF: visitor.cpf || 'Não informado',
      Empresa: visitor.company || visitor.empresa || 'Não informado',
      Setor: visitor.sector || visitor.setor || 'Não informado',
      Placa: visitor.placa_veiculo || 'Não informado',
      Cor: visitor.cor_veiculo || 'Não informado',
      Observação: visitor.observacao || 'Não informado',
      Entrada: visitor.entry_date
        ? new Date(visitor.entry_date).toLocaleString()
        : new Date(visitor.created_at).toLocaleString(),
      Saída: visitor.exit_date
        ? new Date(visitor.exit_date).toLocaleString()
        : 'Não informado',
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório de Visitas");

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "relatorio_visitas.xlsx");
  }

  // 👇 abre modal e mostra observação
  function handleOpenObservation(observacao) {
    setSelectedObservation(observacao || 'Nenhuma observação cadastrada.');
    setIsModalOpen(true);
  }

  // ✅ Loading de tela cheia
  if (loading) return <Loading progress={progress} message="Carregando histórico..." />;

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="page-title-wrapper">
          <img src={logoImg} alt="DIME" />
          <span>Bem-vindo(a), {ongName}</span>
        </div>

        <div className="search-history">
          <FiSearch className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Consultar por nome ou CPF"
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Link className="back-link" to="/profile">
          <FiArrowLeft size={16} color="#E02041" />
          Voltar
        </Link>
      </header>

      <div className="sub-lista">
        <button
          onClick={() => exportToExcel(filteredHistoryData)}
          className="exportar-button excel"
        >
          <FiFileText size={16} />
          Gerar Relatório
        </button>

        <div className="date-filter">
          <label>
            Filtrar por data:
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="content">
        <section className="historico-visitas">
          <h1>Histórico</h1>
          <h2>Visitantes com visita encerrada</h2>

          {filteredHistoryData.length === 0 ? (
            <p className="no-visitors">Nenhuma visita encerrada até o momento.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Empresa</th>
                  <th>Setor</th>
                  <th>Placa</th>
                  <th>Cor</th>
                  <th>Responsavel</th>
                  {/* <th>Obervação</th> */}
                  <th>Entrada</th>
                  <th>Saída</th>
                  <th>Observação</th> 
                </tr>
              </thead>
              <tbody>
                {filteredHistoryData.map((visitor, index) => (
                  <tr key={visitor.id}>
                    <td>{filteredHistoryData.length - index}</td>
                    <td>{visitor.name || 'Não informado'}</td>
                    <td>{visitor.cpf || 'Não informado'}</td>
                    <td>{visitor.company || visitor.empresa || 'Não informado'}</td>
                    <td>{visitor.sector || visitor.setor || 'Não informado'}</td>
                    <td className='placaendcor'>{visitor.placa_veiculo || '-'}</td>
                    <td className='placaendcor'>{visitor.cor_veiculo || '-'}</td>
                    <td>{visitor.responsavel || 'Não informado'}</td>
                    {/* <td>{visitor.observacao || 'Não informado'}</td> */}
                    <td>
                      {visitor.entry_date
                        ? new Date(visitor.entry_date).toLocaleString()
                        : new Date(visitor.created_at).toLocaleString()}
                    </td>
                    <td>
                      {visitor.exit_date
                        ? new Date(visitor.exit_date).toLocaleString()
                        : 'Não informado'}
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenObservation(visitor.observacao)}
                        className="observacao-button"
                        title="Ver observação"
                      >
                        <FiSearch size={18} strokeWidth={3}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div className="modal-observacao-visitantes" onClick={() => setIsModalOpen(false)}>
          <div className="modal-conteudo-visitantes" onClick={e => e.stopPropagation()}>
            <h2>Observação</h2>
            <p>{selectedObservation}</p>
            <button onClick={() => setIsModalOpen(false)} className="fechar-modal">
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}