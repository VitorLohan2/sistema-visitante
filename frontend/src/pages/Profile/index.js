import React, { useState, useEffect, useRef } from 'react';
import { Link, useHistory } from 'react-router-dom';
import {
  FiPower, FiTrash2, FiUserPlus, FiEdit, FiUsers, FiClock, FiSearch, FiMessageSquare,
  FiChevronLeft, FiChevronRight, FiCoffee, FiUserCheck , FiUser, FiSettings, FiGitlab,
  FiMoon, FiSun, FiX, FiInfo
} from 'react-icons/fi';

import notificacaoSom from '../../assets/notificacao.mp3';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Loading from '../../components/Loading';

import './styles.css';

import logoImgBlack from '../../assets/logo_black.png';
import logoImgWhite from '../../assets/logo_white.png';
import userIcon from '../../assets/user.png';

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
  const [showAdmMenu, setShowAdmMenu] = useState(false);
  const admMenuRef = useRef(null);
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
        const { setor, type } = ongResponse.data;
        setUserData({ setor, type });

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
      console.log('🔍 Executando busca para:', searchTerm); // Debug
      
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
        console.log('📊 Dados disponíveis para busca:', allIncidents.length); // Debug
        
        // Busca localmente primeiro (mais rápido) - BUSCA MAIS PRECISA
        const searchLower = searchTerm.toLowerCase().trim();
        const cpfNumbers = searchTerm.replace(/\D/g, ''); // Remove formatação do CPF
        
        console.log('🔍 Termo de busca processado:', { original: searchTerm, lower: searchLower, cpfNumbers }); // Debug
        
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

        console.log('📝 Resultados locais encontrados:', localResults.length); // Debug
        console.log('📝 Nomes encontrados:', localResults.map(r => r.nome)); // Debug - listar nomes

        if (localResults.length > 0) {
          setIncidents(localResults);
        } else {
          console.log('🌐 Buscando na API...'); // Debug
          // Se não encontrar localmente, busca na API
          const response = await api.get('/search', {
            params: { query: searchTerm }
            // 🔹 REMOVIDO: headers: { Authorization: ongId }
          });

          console.log('📡 Resposta da API:', response.data); // Debug

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
      console.log('🔄 Atualizando lista completa'); // Debug
      setIncidents(allIncidents);
    }
  }, [allIncidents, isSearching, searchTerm]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (admMenuRef.current && !admMenuRef.current.contains(event.target)) {
        setShowAdmMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredIncidents = incidents.sort((a, b) => a.nome.localeCompare(b.nome));

  // 🔹 DEBUG - Logs para entender o estado atual
  console.log('📊 Estado atual:', {
    searchTerm,
    isSearching,
    allIncidentsCount: allIncidents.length,
    incidentsCount: incidents.length,
    filteredCount: filteredIncidents.length,
    currentPage,
    totalPages: Math.ceil(filteredIncidents.length / recordsPerPage)
  });

  // 🔍 DEBUG ADICIONAL - Mostrar alguns nomes da lista atual
  if (incidents.length > 0) {
    console.log('📋 Primeiros 5 nomes na lista atual:', 
      incidents.slice(0, 5).map(inc => inc.nome)
    );
  }

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
      console.log(`📄 Página anterior: ${currentPage} -> ${currentPage - 1}`); // Debug
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber) => {
    console.log(`📄 Indo para página: ${currentPage} -> ${pageNumber}`); // Debug
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
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 10px;
            }
            .badge {
              width: 220px;
              height: 320px;
              border: 2px solid #000;
              border-radius: 12px;
              padding: 10px;
            }
            .badge img {
              width: 160px;
              height: 180px;
              border-radius: 25%;
              margin-bottom: 10px;
            }
            .badge p {
              margin: 10px 0;
              font-size: 16px;
            }
            .badge h1 {
              font-size: 18px;
              margin-bottom: 10px;
            }  
          </style>
        </head>
        <body>
          <div class="badge">
            <h1>Crachá de Visitante</h1>
            <img src="${badgeData.imagem || userIcon}" alt="Foto visitante"/>
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

  const logoAtual = darkTheme ? logoImgWhite : logoImgBlack;

  if (loading) return <Loading progress={progress} message="Carregando Listagem..." />;

  return (
    <div className="profile-container">
      <header>
        <img src={logoAtual} alt="DIME" />
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
          <FiPower size={18} color="#e02041" />
        </button>
      </header>

      <div className="page-header">
        <button onClick={() => history.push('/visitors')} className="visitors-link">
          <FiUsers size={20} className="icone2" />
          <span>Ver Visitantes</span>
        </button>

        <button onClick={() => history.push('/history')} className="history-link">
          <FiClock size={20} className="icone" />
          <span>Histórico</span>
        </button>

        <button onClick={() => history.push('/ticket-dashboard')} className="tickets-link">
          <FiMessageSquare size={20} className="icone" />
          <span>Tickets</span>
          {userData.setor === 'Segurança' && unseenCount > 0 && (
            <span className="notification-badge">
              {unseenCount > 9 ? '9+' : unseenCount}
            </span>
          )}
        </button>
          
        {userData.type === 'ADM' && (
          <div className="adm-menu-container" ref={admMenuRef}>
            <button onClick={() => setShowAdmMenu(prev => !prev)} className="adm-link">
              <FiGitlab size={20} className="icone" />
              <span>Administrativo</span>
            </button>

            {showAdmMenu && (
              <div className="adm-submenu">
                <button onClick={() => history.push('/chave-cadastro')}>Chave de Cadastro</button>
                <button onClick={() => history.push('/empresa-visitantes')}>Cadastrar Empresa</button>
                <button onClick={() => history.push('/funcionarios')}>Gerenciar Funcionários</button>
                <button onClick={() => history.push('/funcionarios/cadastrar')}>Cadastrar Funcionário</button>
                <button onClick={() => history.push('/ponto')}>Bipagem Entrada/Saída</button>
              </div>
            )}
          </div>
        )}

        <button onClick={() => history.push('/agendamentos')} className="agendamentos-link">
          <FiCoffee size={20} className="icone" />
          <span>Agendamentos</span>
        </button>

        <button onClick={handleOpenConfigModal} className="history-link">
          <FiSettings size={20} className="icone" />
          <span>Configuração</span>
        </button>
      </div>

      <h1>
        Cadastrados 
        {isSearching && searchTerm && (
          <span className="search-results-info">
            - Buscando por "{searchTerm}" ({filteredIncidents.length} resultados)
          </span>
        )}
      </h1>

      {/* CARDS CONTAINER */}
      <div className="cards-container">
        {currentRecords.map(incident => (
          <div key={incident.id} className={`visitor-card ${incident.bloqueado ? 'blocked' : ''}`}>
            <div className="card-left">
              <div className="card-avatar">
                {incident.avatar_imagem ? (
                  <img
                    src={incident.avatar_imagem}
                    alt={incident.bloqueado ? "Bloqueado" : "Usuário"}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <FiUser size={55} className="default-user-icon" />
                )}
              </div>
  
              <div className="card-info">
                <h3 className="card-name">
                  {incident.nome}
                  {incident.bloqueado && <span className="blocked-badge">BLOQUEADO</span>}
                </h3>
                
                <div className="card-details">
                  <div className="card-detail">
                    <span className="card-detail-label">Nascimento</span>
                    <span className="card-detail-value">{formatarData(incident.nascimento)}</span>
                  </div>
                  
                  <div className="card-detail">
                    <span className="card-detail-label">CPF</span>
                    <span className="card-detail-value">{incident.cpf}</span>
                  </div>
                  
                  <div className="card-detail">
                    <span className="card-detail-label">Empresa</span>
                    <span className="card-detail-value">{incident.empresa}</span>
                  </div>
                  
                  <div className="card-detail">
                    <span className="card-detail-label">Setor</span>
                    <span className="card-detail-value">{incident.setor}</span>
                  </div>
                  
                  <div className="card-detail">
                    <span className="card-detail-label">Telefone</span>
                    <span className="card-detail-value">{incident.telefone}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-actions">
              <button 
                onClick={() => handleRegisterVisit(incident.id)} 
                className="card-action-btn visit" 
                title="Registrar visita"
              >
                <FiUserPlus size={16} />
              </button>
              
              <button 
                onClick={() => handleViewProfile(incident.id)} 
                className="card-action-btn view" 
                title="Visualizar perfil"
              >
                <FiSearch size={16} />
              </button>
              
              <button 
                onClick={() => handleEditProfile(incident.id)} 
                className="card-action-btn edit" 
                title="Editar perfil"
              >
                <FiEdit size={16} />
              </button>

              <button 
                onClick={() => handleOpenBadgeModal(incident.id)} 
                className="card-action-btn cracha" 
                title="Crachá"
              >
                <FiUserCheck size={16} />
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteIncident(incident.id); }} 
                className="card-action-btn delete" 
                title="Deletar cadastro"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          </div>
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
            <img src={badgeData.imagem || userIcon} alt="Foto visitante" className="modal-avatar" />
            <p><strong>Nome:</strong> {badgeData.nome}</p>
            <p><strong>Empresa:</strong> {badgeData.empresa}</p>
            <p><strong>Setor:</strong> {badgeData.setor}</p>
            <button onClick={handlePrintBadge} className="modal-print-btn">Imprimir Crachá</button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURAÇÃO */}
      {configModalVisible && (
        <div className="config-modal-overlay" onClick={handleCloseConfigModal}>
          <div className="config-modal-content" onClick={e => e.stopPropagation()}>
            <div className="config-modal-header">
              <h2>
                <FiSettings size={24} />
                Configurações
              </h2>
              <button className="config-modal-close" onClick={handleCloseConfigModal}>
                <FiX size={20} />
              </button>
            </div>

            <div className="config-modal-body">
              <div className="config-section">
                <h3>Aparência</h3>
                <div className="theme-toggle-container">
                  <label className="theme-toggle">
                    <input
                      type="checkbox"
                      checked={darkTheme}
                      onChange={toggleTheme}
                    />
                    <div className="theme-slider">
                      <div className="theme-icon sun">
                        <FiSun size={18} />
                      </div>
                      <div className="theme-icon moon">
                        <FiMoon size={18} />
                      </div>
                    </div>
                  </label>
                  <span className="theme-label">
                    {darkTheme ? 'Tema Escuro' : 'Tema Claro'}
                  </span>
                </div>
              </div>

              <div className="config-section">
                <h3>
                  <FiInfo size={18} />
                  Informações da Conta
                </h3>
                
                <div className="user-info-container">
                  <div className="user-info-item">
                    <label>ID do Usuário:</label>
                    <span className="user-info-value">{ongId}</span>
                  </div>
                  
                  <div className="user-info-item">
                    <label>Nome:</label>
                    <span className="user-info-value">
                      {userDetails?.name || ongName || 'Carregando...'}
                    </span>
                  </div>
                  
                  <div className="user-info-item">
                    <label>Email:</label>
                    <span className="user-info-value">
                      {userDetails?.email || 'Carregando...'}
                    </span>
                  </div>

                  {userDetails?.setor && (
                    <div className="user-info-item">
                      <label>Setor:</label>
                      <span className="user-info-value">{userDetails.setor}</span>
                    </div>
                  )}

                  {userDetails?.type && (
                    <div className="user-info-item">
                      <label>Tipo de Conta:</label>
                      <span className="user-info-value badge-type">
                        {userDetails.type}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="config-modal-footer">
              <button 
                className="config-close-btn"
                onClick={handleCloseConfigModal}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}