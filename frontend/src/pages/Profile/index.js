import React, { useState, useEffect, useRef } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiPower, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

import notificacaoSom from '../../assets/notificacao.mp3';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Loading from '../../components/Loading';

import VisitorCard from "../../components/VisitorCard";
import ProfileMenu from '../../components/ProfileMenu';
import ConfigModal from '../../components/ConfigModal';

import './styles.css';
import '../../styles/dark-theme.css';
import '../../styles/visitorcard.css';

import logo from '../../assets/logo.svg';

export default function Profile() {
  const [incidents, setIncidents] = useState([]);
  const [allIncidents, setAllIncidents] = useState([]); // lista completa original
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false); // 🆕 Flag para controlar busca
  const history = useHistory();

  const { user, logout } = useAuth();
  const ongId = user?.id;
  const ongName = user?.name;

  const [unseenCount, setUnseenCount] = useState(0);
  const unseenRef = useRef(0);
  const [userData, setUserData] = useState({ setor: '' });
  const isFirstLoad = useRef(true);

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const [pageGroup, setPageGroup] = useState(0);
  const pagesPerGroup = 4;
  const [progress, setProgress] = useState(0);

  const [empresasVisitantes, setEmpresasVisitantes] = useState([]);
  const [setoresVisitantes, setSetoresVisitantes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [badgeData, setBadgeData] = useState(null);

  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [userDetails, setUserDetails] = useState(null);

  // Carregar tema do localStorage na inicialização
  useEffect(() => {
    const savedTheme = localStorage.getItem('darkTheme');
    if (savedTheme) {
      setDarkTheme(JSON.parse(savedTheme));
      document.body.classList.toggle('dark-theme', JSON.parse(savedTheme));
    }
  }, []);

  function toggleTheme() {
    const newTheme = !darkTheme;
    setDarkTheme(newTheme);
    localStorage.setItem('darkTheme', JSON.stringify(newTheme));
    document.body.classList.toggle('dark-theme', newTheme);
  }

  async function handleOpenConfigModal() {
    try {
      const response = await api.get(`ongs/${ongId}`);
      setUserDetails(response.data);
      setConfigModalVisible(true);
    } catch (err) {
      alert('Erro ao carregar informações do usuário: ' + err.message);
    }
  }

  function handleCloseConfigModal() {
    setConfigModalVisible(false);
    setUserDetails(null);
  }

  function formatarData(data) {
    if (!data) return 'Data não informada';

    const dataParte = data.split('T')[0];
    const partes = dataParte.split('-');

    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return data;
  }

  // 🔹 FUNÇÃO PARA MAPEAR DADOS COM EMPRESA/SETOR
  const mapIncidentsWithNames = (incidentsData) => {
    return incidentsData.map(incident => ({
      ...incident,
      empresa: empresasVisitantes.find(e => e.id === incident.empresa_id)?.nome || 'Não informado',
      setor: setoresVisitantes.find(s => s.id === incident.setor_id)?.nome || 'Não informado'
    }));
  };

  // 🔹 CARREGAMENTO INICIAL - SÓ UMA VEZ
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!ongId) return;

      try {
        let value = 0;
        const interval = setInterval(() => {
          value += 10;
          setProgress(value);
          if (value >= 100) clearInterval(interval);
        }, 100);

        // 1. Carrega empresas e setores primeiro
        const [empresasResponse, setoresResponse] = await Promise.all([
          api.get('/empresas-visitantes'),
          api.get('/setores-visitantes')
        ]);

        const empresas = empresasResponse.data;
        const setores = setoresResponse.data;

        setEmpresasVisitantes(empresas);
        setSetoresVisitantes(setores);

        // 2. Carrega dados da ONG
        const ongResponse = await api.get(`ongs/${ongId}`);
        const { setor, type, setor_id } = ongResponse.data;
        setUserData({ setor, type, setor_id });

        // 3. Carrega todos os incidents
        const profileResponse = await api.get('profile', {
          headers: { Authorization: ongId }
        });

        // 4. Mapeia com nomes de empresa/setor
        const incidentsWithNames = profileResponse.data.map(incident => ({
          ...incident,
          empresa: empresas.find(e => e.id === incident.empresa_id)?.nome || 'Não informado',
          setor: setores.find(s => s.id === incident.setor_id)?.nome || 'Não informado'
        }));

        // 5. Salva os dados
        setAllIncidents(incidentsWithNames);
        setIncidents(incidentsWithNames);

        // Lógica de segurança (mantida igual)
        if (setor === 'Segurança') {
          const unseenResponse = await api.get('/tickets/unseen', {
            headers: { Authorization: ongId }
          });

          const newCount = unseenResponse.data.count;
          if (!isFirstLoad.current && newCount > unseenRef.current) {
            const audio = new Audio(notificacaoSom);
            audio.play().catch(err => console.error("Erro ao tocar som:", err));
          }

          unseenRef.current = newCount;
          setUnseenCount(newCount);
          isFirstLoad.current = false;
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error.response?.data || error.message);
      } finally {
        setTimeout(() => {
          setLoading(false);
          setProgress(100);
        }, 500);
      }
    };

    fetchInitialData();
  }, [ongId, empresasVisitantes.length, setoresVisitantes.length]); // 🔹 Só executa quando necessário

  // 🔹 ATUALIZAÇÃO PERIÓDICA - SÓ SE NÃO ESTIVER BUSCANDO
  useEffect(() => {
    if (!ongId || isSearching || allIncidents.length === 0) return;

    const intervalId = setInterval(async () => {
      try {
        // Só atualiza se não estiver em busca ativa
        if (!isSearching && searchTerm.trim() === '') {
          const profileResponse = await api.get('profile', {
            headers: { Authorization: ongId }
          });

          const incidentsWithNames = mapIncidentsWithNames(profileResponse.data);
          setAllIncidents(incidentsWithNames);
          setIncidents(incidentsWithNames);
        }

        // Sempre atualiza notificações de segurança
        if (userData.setor === 'Segurança') {
          const unseenResponse = await api.get('/tickets/unseen', {
            headers: { Authorization: ongId }
          });

          const newCount = unseenResponse.data.count;
          if (newCount > unseenRef.current) {
            const audio = new Audio(notificacaoSom);
            audio.play().catch(err => console.error("Erro ao tocar som:", err));
          }

          unseenRef.current = newCount;
          setUnseenCount(newCount);
        }
      } catch (error) {
        console.error('Erro na atualização automática:', error);
      }
    }, 3000); // 🔹 Aumentei para 3 segundos para reduzir carga

    return () => clearInterval(intervalId);
  }, [ongId, userData.setor, isSearching, searchTerm, allIncidents.length]);

  // 🔹 BUSCA COM DEBOUNCE - CORRIGIDA
  useEffect(() => {
    const timer = setTimeout(async () => {
      //console.log('🔍 Executando busca para:', searchTerm); // Debug

      if (!searchTerm.trim()) {
        // Se busca vazia, volta para lista completa
        setIsSearching(false);
        setIncidents(allIncidents);
        // SÓ reseta página se estava buscando antes
        if (isSearching) {
          setCurrentPage(1);
        }
        return;
      }

      setIsSearching(true); // 🔹 Marca que está buscando
      setCurrentPage(1); // Reset da paginação só quando começa uma busca nova

      try {
        //console.log('📊 Dados disponíveis para busca:', allIncidents.length); // Debug

        // Busca localmente primeiro (mais rápido) - BUSCA MAIS PRECISA
        const searchLower = searchTerm.toLowerCase().trim();
        const cpfNumbers = searchTerm.replace(/\D/g, ''); // Remove formatação do CPF

        //console.log('🔍 Termo de busca processado:', { original: searchTerm, lower: searchLower, cpfNumbers }); // Debug

        const localResults = allIncidents.filter(incident => {
          // Verificações mais rigorosas
          const hasName = incident.nome && typeof incident.nome === 'string';
          const hasCpf = incident.cpf && typeof incident.cpf === 'string';

          // 🔹 BUSCA POR NOME - Busca por palavras inteiras, não apenas substring
          let nameMatch = false;
          if (hasName) {
            const nomeNormalizado = incident.nome.toLowerCase().trim();
            // Verifica se o termo de busca existe como palavra completa ou início de palavra
            nameMatch = nomeNormalizado.includes(searchLower) && (
              nomeNormalizado.startsWith(searchLower) || // Começa com o termo
              nomeNormalizado.includes(' ' + searchLower) || // Palavra inteira no meio
              nomeNormalizado === searchLower // Nome exato
            );
          }

          // 🔹 BUSCA POR CPF - Só busca se o termo tem números
          let cpfMatch = false;
          if (hasCpf && cpfNumbers.length > 0) {
            cpfMatch = incident.cpf.includes(searchTerm) ||
              incident.cpf.replace(/\D/g, '').includes(cpfNumbers);
          }

          console.log(`👤 ${incident.nome}:`, {
            hasName,
            hasCpf,
            nomeNormalizado: hasName ? incident.nome.toLowerCase() : 'N/A',
            nameMatch,
            cpfMatch,
            finalResult: nameMatch || cpfMatch
          }); // Debug detalhado

          return nameMatch || cpfMatch;
        });

        //console.log('📝 Resultados locais encontrados:', localResults.length); // Debug
        //console.log('📝 Nomes encontrados:', localResults.map(r => r.nome)); // Debug - listar nomes

        if (localResults.length > 0) {
          setIncidents(localResults);
        } else {
          console.log('🌐 Buscando na API...'); // Debug
          // Se não encontrar localmente, busca na API
          const response = await api.get('/search', {
            params: { query: searchTerm }
          });

          //console.log('📡 Resposta da API:', response.data); // Debug

          // Mapeia os resultados da API com empresa/setor
          const searchResults = mapIncidentsWithNames(response.data);
          setIncidents(searchResults);
        }
      } catch (err) {
        console.error('❌ Erro na busca:', err);
        // Se der erro, busca localmente como fallback - BUSCA MAIS PRECISA
        const searchLower = searchTerm.toLowerCase().trim();
        const cpfNumbers = searchTerm.replace(/\D/g, '');

        const localResults = allIncidents.filter(incident => {
          const hasName = incident.nome && typeof incident.nome === 'string';
          const hasCpf = incident.cpf && typeof incident.cpf === 'string';

          // Busca mais precisa por nome
          let nameMatch = false;
          if (hasName) {
            const nomeNormalizado = incident.nome.toLowerCase().trim();
            nameMatch = nomeNormalizado.includes(searchLower) && (
              nomeNormalizado.startsWith(searchLower) ||
              nomeNormalizado.includes(' ' + searchLower) ||
              nomeNormalizado === searchLower
            );
          }

          // Busca por CPF só se tiver números
          let cpfMatch = false;
          if (hasCpf && cpfNumbers.length > 0) {
            cpfMatch = incident.cpf.includes(searchTerm) ||
              incident.cpf.replace(/\D/g, '').includes(cpfNumbers);
          }

          return nameMatch || cpfMatch;
        });

        setIncidents(localResults);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]); // 🔹 REMOVIDO allIncidents da dependência para evitar loops

  // 🔹 RESET DA BUSCA QUANDO SAIR DO INPUT
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim() === '') {
      setIsSearching(false);
    }
  };

  // 🆕 EFEITO PARA ATUALIZAR A LISTA QUANDO allIncidents MUDA (mas não está buscando)
  useEffect(() => {
    if (!isSearching && searchTerm.trim() === '' && allIncidents.length > 0) {
      setIncidents(allIncidents);
    }
  }, [allIncidents, isSearching, searchTerm]);

  const filteredIncidents = incidents.sort((a, b) => a.nome.localeCompare(b.nome));

  // Cálculos de paginação
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredIncidents.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredIncidents.length / recordsPerPage);

  // 🔹 FUNÇÕES DE PAGINAÇÃO COM DEBUG
  const nextPage = () => {
    if (currentPage < totalPages) {
      console.log(`📄 Próxima página: ${currentPage} -> ${currentPage + 1}`); // Debug
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      //console.log(`📄 Página anterior: ${currentPage} -> ${currentPage - 1}`); // Debug
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber) => {
    //console.log(`📄 Indo para página: ${currentPage} -> ${pageNumber}`); // Debug
    setCurrentPage(pageNumber);
  };

  async function handleDeleteIncident(id) {
    if (!window.confirm('Tem certeza que deseja deletar este cadastro?')) return;

    try {
      const response = await api.delete(`incidents/${id}`, {
        headers: { Authorization: ongId }
      });

      if (response.status === 204) {
        // Remove da lista principal e da lista filtrada
        const newAllIncidents = allIncidents.filter(incident => incident.id !== id);
        const newIncidents = incidents.filter(incident => incident.id !== id);

        setAllIncidents(newAllIncidents);
        setIncidents(newIncidents);

        alert('Cadastro deletado com sucesso!');
      }
    } catch (err) {
      const error = err.response?.data?.error || err.message;
      alert(`Acesso Bloqueado: ${error}`);
    }
  }

  async function handleRegisterVisit(id) {
    try {
      const incident = incidents.find(inc => inc.id === id);
      if (incident.bloqueado) {
        alert('Este visitante está bloqueado. Registro de visita não permitido.');
        return;
      }

      await api.post('/visitors', {
        name: incident.nome,
        cpf: incident.cpf,
        company: incident.empresa,
        sector: incident.setor
      }, {
        headers: { Authorization: ongId }
      });

      alert('Visita registrada com sucesso!');
      history.push('/visitors');
    } catch (err) {
      alert('Erro ao registrar visita: ' + err.message);
    }
  }

  function handleEditProfile(id) {
    history.push(`/incidents/edit/${id}`);
  }

  function handleViewProfile(id) {
    history.push(`/incidents/view/${id}`);
  }

  function handleLogout() {
    if (window.confirm('Tem certeza que deseja sair?')) {
      logout();
    }
  }

  async function handleOpenBadgeModal(id) {
    try {
      const response = await api.get(`incidents/${id}/badge`);
      setBadgeData({
        ...response.data,
        imagem: response.data.avatar_imagem || response.data.imagem1 || null
      });
      setBadgeModalVisible(true);
    } catch (err) {
      alert('Erro ao abrir crachá: ' + err.message);
    }
  }

  function handlePrintBadge() {
    if (!badgeData) return;

    const printWindow = window.open('', 'PRINT', 'height=600,width=720');
    printWindow.document.write(`
    <html>
      <head>
        <title>Crachá de Visitante</title>
        <style>
          @page {
            size: 60mm 40mm landscape; /* imprime deitado */
            margin: 0;
          }
          html, body {
            width: 60mm;
            height: 40mm;
            margin: 0;
            padding: 0;
          }
          body {
            display: flex;
            justify-content: flex-start; /* canto superior esquerdo horizontal */
            align-items: flex-start;     /* canto superior esquerdo vertical */
          }
          .badge {
            width: 60mm;
            height: 40mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: flex-start; /* texto grudado à esquerda */
            font-family: Arial, sans-serif;
            border: 1px solid #000; /* opcional */
            border-radius: 6px;     /* opcional */
            padding: 2mm;           /* deixa um pouco de espaço interno */
            box-sizing: border-box;
          }
          .badge h1 {
            font-size: 12px;
            margin: 0 0 2px 0;
          }
          .badge p {
            font-size: 10px;
            margin: 1px 0;
          }
        </style>
      </head>
      <body>
        <div class="badge">
          <h1>Crachá de Visitante</h1>
          <p><strong>Nome:</strong> ${badgeData.nome}</p>
          <p><strong>Empresa:</strong> ${badgeData.empresa}</p>
          <p><strong>Setor:</strong> ${badgeData.setor}</p>
        </div>
      </body>
    </html>
  `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  function handleCloseBadgeModal() {
    setBadgeModalVisible(false);
    setBadgeData(null);
  }

  //const logoAtual = darkTheme ? logoImgWhite : logoImgBlack;

  if (loading) return <Loading progress={progress} message="Carregando Listagem..." />;

  return (
    <div className="profile-container">
      <header>
        <img src={logo} alt="DIME" />
        <span> Bem-vindo(a), {ongName} </span>

        <div className="search-container">
          <FiSearch className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Consultar por nome ou CPF"
            className="search-input"
            value={searchTerm}
            onChange={handleSearchChange} // 🔹 Função atualizada
          />
        </div>

        <Link className="button" to="/incidents/new">Cadastrar Visitante</Link>
        <button onClick={handleLogout} type="button">
          <FiPower size={18} color="#e02041" className='power'/>
        </button>
      </header>

      <ProfileMenu
        userData={userData}
        unseenCount={unseenCount}
        handleOpenConfigModal={handleOpenConfigModal}
      />

      <h1>
        Visitantes Cadastrados
        {isSearching && searchTerm && (
          <span className="search-results-info">
            - Buscando por "{searchTerm}" ({filteredIncidents.length} resultados)
          </span>
        )}
      </h1>

      {/* CARDS CONTAINER */}
      <div className="visitors-list">
        {currentRecords.map(incident => (
          <VisitorCard
            key={incident.id}
            incident={incident}
            formatarData={formatarData}
            handleRegisterVisit={handleRegisterVisit}
            handleViewProfile={handleViewProfile}
            handleEditProfile={handleEditProfile}
            handleOpenBadgeModal={handleOpenBadgeModal}
            handleDeleteIncident={handleDeleteIncident}
          />
        ))}
      </div>


      {/* Mensagem quando não há resultados */}
      {filteredIncidents.length === 0 && !loading && (
        <div className="no-results">
          {searchTerm ?
            `Nenhum resultado encontrado para "${searchTerm}"` :
            'Nenhum cadastro encontrado'
          }
        </div>
      )}

      {/* PAGINAÇÃO */}
      {filteredIncidents.length > recordsPerPage && (
        <div className="pagination">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            <FiChevronLeft size={16} />
          </button>

          <button
            onClick={() => goToPage(1)}
            className={`pagination-button ${currentPage === 1 ? 'active' : ''}`}
          >
            1
          </button>

          {pageGroup > 0 && (
            <button
              onClick={() => setPageGroup(pageGroup - 1)}
              className="pagination-button"
            >
              ...
            </button>
          )}

          {Array.from({ length: Math.min(pagesPerGroup, totalPages - 2) }, (_, i) => {
            const pageNumber = 2 + i + (pageGroup * pagesPerGroup);
            return pageNumber <= totalPages - 1 ? (
              <button
                key={pageNumber}
                onClick={() => goToPage(pageNumber)}
                className={`pagination-button ${currentPage === pageNumber ? 'active' : ''}`}
              >
                {pageNumber}
              </button>
            ) : null;
          })}

          {2 + (pageGroup + 1) * pagesPerGroup < totalPages && (
            <button
              onClick={() => setPageGroup(pageGroup + 1)}
              className="pagination-button"
            >
              ...
            </button>
          )}

          {totalPages > 1 && (
            <button
              onClick={() => goToPage(totalPages)}
              className={`pagination-button ${currentPage === totalPages ? 'active' : ''}`}
            >
              {totalPages}
            </button>
          )}

          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      )}

      {/* MODAL DO CRACHÁ */}
      {badgeModalVisible && badgeData && (
        <div className="modal-overlay" onClick={handleCloseBadgeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseBadgeModal}>X</button>
            <h2>Crachá de Visitante</h2>
            <p><strong>Nome:</strong> {badgeData.nome}</p>
            <p><strong>Empresa:</strong> {badgeData.empresa}</p>
            <p><strong>Setor:</strong> {badgeData.setor}</p>
            <button onClick={handlePrintBadge} className="modal-print-btn">Imprimir Crachá</button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURAÇÃO */}
      <ConfigModal
        visible={configModalVisible}
        onClose={handleCloseConfigModal}
        darkTheme={darkTheme}
        toggleTheme={toggleTheme}
        userDetails={userDetails}
        ongId={ongId}
        ongName={ongName}
      />
    </div>
  );
}