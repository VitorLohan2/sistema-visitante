/**
 * ═══════════════════════════════════════════════════════════════════════════
 * USE DATA LOADER - Hook Centralizado de Carregamento de Dados
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este hook é responsável por:
 * 1. Carregar TODOS os dados necessários no login
 * 2. Armazenar tudo no cacheService
 * 3. Configurar Socket.IO para sincronização em tempo real
 * 4. Exibir progresso de carregamento
 *
 * DADOS CARREGADOS (por etapa):
 *
 * ETAPA 1 (10%): Empresas e Setores de Visitantes
 * - empresas-visitantes: Empresas de onde vêm os visitantes
 * - setores-visitantes: Setores para onde os visitantes vão
 *
 * ETAPA 2 (20%): Dados do Usuário Logado
 * - usuarios/:id: Dados completos do usuário
 *
 * ETAPA 3 (30%): Responsáveis
 * - visitantes/responsaveis: Lista de responsáveis por liberar
 *
 * ETAPA 4 (45%): Cadastro de Visitantes
 * - cadastro-visitantes: Todos os visitantes cadastrados
 *
 * ETAPA 5 (55%): Agendamentos
 * - agendamentos: Agendamentos de visitantes
 *
 * ETAPA 6 (65%): Tickets
 * - tickets: Tickets de suporte
 *
 * ETAPA 7 (75%): Funcionários
 * - funcionarios: Lista de funcionários
 *
 * ETAPA 8 (85%): Permissões e Papéis
 * - usuarios-papeis/me/permissoes: Permissões do usuário logado
 *
 * ETAPA 9 (95%): Comunicados
 * - comunicados: Comunicados do sistema
 *
 * ETAPA 10 (100%): Socket.IO
 * - Conexão e configuração de listeners
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PADRÃO DE USO:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * const {
 *   loading,           // boolean - Se está carregando
 *   progress,          // number - Porcentagem (0-100)
 *   progressMessage,   // string - Mensagem atual
 *   error,             // string|null - Erro se houver
 *   visitantes,        // array - Lista de visitantes
 *   empresas,          // array - Empresas de visitantes
 *   setores,           // array - Setores de visitantes
 *   responsaveis,      // array - Responsáveis
 *   agendamentos,      // array - Agendamentos
 *   tickets,           // array - Tickets
 *   funcionarios,      // array - Funcionários
 *   comunicados,       // array - Comunicados
 *   userData,          // object - Dados do usuário logado
 *   loadAllData,       // function - Recarrega tudo (forceReload)
 *   reloadVisitantes,  // function - Recarrega só visitantes
 *   clearAllData,      // function - Limpa cache e desconecta
 * } = useDataLoader(userId);
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from "react";
import api from "../services/api";
import * as socketService from "../services/socketService";
import {
  setCache,
  getCache,
  isCacheLoaded,
  clearCache,
} from "../services/cacheService";

export function useDataLoader(userId) {
  // ═══════════════════════════════════════════════════════════════
  // VERIFICAÇÃO INICIAL DE CACHE
  // ═══════════════════════════════════════════════════════════════
  const hasInitialCacheRef = useRef(isCacheLoaded());

  // ═══════════════════════════════════════════════════════════════
  // REFS PARA CONTROLE DE EXECUÇÃO
  // ═══════════════════════════════════════════════════════════════
  const currentUserIdRef = useRef(null);
  const isDataLoadedRef = useRef(hasInitialCacheRef.current); // Inicia com true se tem cache
  const isLoadingRef = useRef(false);
  const socketListenersRef = useRef([]);

  // Marca como carregado se já tem cache no início
  if (hasInitialCacheRef.current && !isDataLoadedRef.current) {
    isDataLoadedRef.current = true;
  }

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════
  const [loading, setLoading] = useState(!hasInitialCacheRef.current);
  const [progress, setProgress] = useState(
    hasInitialCacheRef.current ? 100 : 0
  );
  const [progressMessage, setProgressMessage] = useState(
    hasInitialCacheRef.current ? "Pronto!" : "Iniciando..."
  );
  const [error, setError] = useState(null);

  // Dados carregados - inicializa com cache se existir
  const [visitantes, setVisitantes] = useState(
    () => getCache("cadastroVisitantes") || []
  );
  const [empresas, setEmpresas] = useState(
    () => getCache("empresasVisitantes") || []
  );
  const [setores, setSetores] = useState(
    () => getCache("setoresVisitantes") || []
  );
  const [responsaveis, setResponsaveis] = useState(
    () => getCache("responsaveis") || []
  );
  const [agendamentos, setAgendamentos] = useState(
    () => getCache("agendamentos") || []
  );
  const [tickets, setTickets] = useState(() => getCache("tickets") || []);
  const [funcionarios, setFuncionarios] = useState(
    () => getCache("funcionarios") || []
  );
  const [comunicados, setComunicados] = useState(
    () => getCache("comunicados") || []
  );
  const [patchNotes, setPatchNotes] = useState(
    () => getCache("patchNotes") || []
  );
  const [userData, setUserData] = useState(() => getCache("userData"));

  // ═══════════════════════════════════════════════════════════════
  // CONFIGURAÇÃO DE LISTENERS DO SOCKET.IO
  // ═══════════════════════════════════════════════════════════════
  const setupSocketListeners = useCallback(() => {
    // Remove listeners anteriores
    socketListenersRef.current.forEach((unsub) => unsub && unsub());
    socketListenersRef.current = [];

    // ─────────────────────────────────────────────────────────────
    // VISITANTES (CADASTRO)
    // ─────────────────────────────────────────────────────────────
    const unsubVisitanteCreated = socketService.on(
      "visitante:created",
      (visitante) => {
        console.log("📥 Socket: Novo visitante recebido", visitante.nome);
        setVisitantes((prev) => {
          if (prev.find((v) => v.id === visitante.id)) return prev;
          const novos = [...prev, visitante].sort((a, b) =>
            (a.nome || "")
              .toLowerCase()
              .localeCompare((b.nome || "").toLowerCase(), "pt-BR")
          );
          setCache("cadastroVisitantes", novos);
          return novos;
        });
      }
    );

    const unsubVisitanteUpdated = socketService.on(
      "visitante:updated",
      (dados) => {
        console.log("📝 Socket: Visitante atualizado", dados.id);
        setVisitantes((prev) => {
          const novos = prev
            .map((v) => (v.id === dados.id ? { ...v, ...dados } : v))
            .sort((a, b) =>
              (a.nome || "")
                .toLowerCase()
                .localeCompare((b.nome || "").toLowerCase(), "pt-BR")
            );
          setCache("cadastroVisitantes", novos);
          return novos;
        });
      }
    );

    const unsubVisitanteDeleted = socketService.on(
      "visitante:deleted",
      (dados) => {
        console.log("🗑️ Socket: Visitante deletado", dados.id);
        setVisitantes((prev) => {
          const novos = prev.filter((v) => v.id !== dados.id);
          setCache("cadastroVisitantes", novos);
          return novos;
        });
      }
    );

    // ─────────────────────────────────────────────────────────────
    // EMPRESAS DE VISITANTES
    // ─────────────────────────────────────────────────────────────
    const unsubEmpresaCreated = socketService.on(
      "empresa:created",
      (empresa) => {
        console.log("🏢 Socket: Nova empresa", empresa.nome);
        setEmpresas((prev) => {
          if (prev.find((e) => e.id === empresa.id)) return prev;
          const novos = [...prev, empresa].sort((a, b) =>
            (a.nome || "").localeCompare(b.nome || "", "pt-BR")
          );
          setCache("empresasVisitantes", novos);
          return novos;
        });
      }
    );

    const unsubEmpresaUpdated = socketService.on("empresa:updated", (dados) => {
      console.log("🏢 Socket: Empresa atualizada", dados.id);
      setEmpresas((prev) => {
        const novos = prev.map((e) =>
          e.id === dados.id ? { ...e, ...dados } : e
        );
        setCache("empresasVisitantes", novos);
        return novos;
      });
    });

    const unsubEmpresaDeleted = socketService.on("empresa:deleted", (dados) => {
      console.log("🏢 Socket: Empresa deletada", dados.id);
      setEmpresas((prev) => {
        const novos = prev.filter((e) => e.id !== dados.id);
        setCache("empresasVisitantes", novos);
        return novos;
      });
    });

    // ─────────────────────────────────────────────────────────────
    // SETORES DE VISITANTES
    // ─────────────────────────────────────────────────────────────
    const unsubSetorCreated = socketService.on("setor:created", (setor) => {
      console.log("📁 Socket: Novo setor", setor.nome);
      setSetores((prev) => {
        if (prev.find((s) => s.id === setor.id)) return prev;
        const novos = [...prev, setor].sort((a, b) =>
          (a.nome || "").localeCompare(b.nome || "", "pt-BR")
        );
        setCache("setoresVisitantes", novos);
        return novos;
      });
    });

    const unsubSetorUpdated = socketService.on("setor:updated", (dados) => {
      console.log("📁 Socket: Setor atualizado", dados.id);
      setSetores((prev) => {
        const novos = prev.map((s) =>
          s.id === dados.id ? { ...s, ...dados } : s
        );
        setCache("setoresVisitantes", novos);
        return novos;
      });
    });

    const unsubSetorDeleted = socketService.on("setor:deleted", (dados) => {
      console.log("📁 Socket: Setor deletado", dados.id);
      setSetores((prev) => {
        const novos = prev.filter((s) => s.id !== dados.id);
        setCache("setoresVisitantes", novos);
        return novos;
      });
    });

    // ─────────────────────────────────────────────────────────────
    // AGENDAMENTOS
    // ─────────────────────────────────────────────────────────────
    const unsubAgendamentoCreate = socketService.on(
      "agendamento:create",
      (agendamento) => {
        console.log("📅 Socket: Novo agendamento", agendamento.id);
        setAgendamentos((prev) => {
          if (prev.find((a) => a.id === agendamento.id)) return prev;
          const novos = [agendamento, ...prev].sort(
            (a, b) =>
              new Date(b.horario_agendado) - new Date(a.horario_agendado)
          );
          setCache("agendamentos", novos);
          return novos;
        });
      }
    );

    const unsubAgendamentoUpdate = socketService.on(
      "agendamento:update",
      (dados) => {
        console.log("📅 Socket: Agendamento atualizado", dados.id);
        setAgendamentos((prev) => {
          const novos = prev
            .map((a) => (a.id === dados.id ? { ...a, ...dados } : a))
            .sort(
              (a, b) =>
                new Date(b.horario_agendado) - new Date(a.horario_agendado)
            );
          setCache("agendamentos", novos);
          return novos;
        });
      }
    );

    const unsubAgendamentoDelete = socketService.on(
      "agendamento:delete",
      (dados) => {
        console.log("📅 Socket: Agendamento removido", dados.id);
        setAgendamentos((prev) => {
          const novos = prev.filter((a) => a.id !== dados.id);
          setCache("agendamentos", novos);
          return novos;
        });
      }
    );

    // ─────────────────────────────────────────────────────────────
    // TICKETS
    // ─────────────────────────────────────────────────────────────
    const unsubTicketCreate = socketService.on("ticket:create", (ticket) => {
      console.log("🎫 Socket: Novo ticket", ticket.id);
      setTickets((prev) => {
        if (prev.find((t) => t.id === ticket.id)) return prev;
        const novos = [ticket, ...prev].sort(
          (a, b) => new Date(b.data_criacao) - new Date(a.data_criacao)
        );
        setCache("tickets", novos);
        return novos;
      });
    });

    const unsubTicketUpdate = socketService.on("ticket:update", (dados) => {
      console.log("🎫 Socket: Ticket atualizado", dados.id);
      setTickets((prev) => {
        const novos = prev
          .map((t) => (t.id === dados.id ? { ...t, ...dados } : t))
          .sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));
        setCache("tickets", novos);
        return novos;
      });
    });

    const unsubTicketViewed = socketService.on("ticket:viewed", (dados) => {
      setTickets((prev) => {
        const novos = prev.map((t) =>
          t.id === dados.id ? { ...t, visto: true } : t
        );
        setCache("tickets", novos);
        return novos;
      });
    });

    const unsubTicketAllViewed = socketService.on("ticket:all_viewed", () => {
      setTickets((prev) => {
        const novos = prev.map((t) => ({ ...t, visto: true }));
        setCache("tickets", novos);
        return novos;
      });
    });

    // ─────────────────────────────────────────────────────────────
    // FUNCIONÁRIOS
    // ─────────────────────────────────────────────────────────────
    const unsubFuncionarioCreated = socketService.on(
      "funcionario:created",
      (funcionario) => {
        console.log("👤 Socket: Novo funcionário", funcionario.nome);
        setFuncionarios((prev) => {
          if (prev.find((f) => f.cracha === funcionario.cracha)) return prev;
          const novos = [...prev, funcionario].sort((a, b) =>
            (a.nome || "")
              .toLowerCase()
              .localeCompare((b.nome || "").toLowerCase(), "pt-BR")
          );
          setCache("funcionarios", novos);
          return novos;
        });
      }
    );

    const unsubFuncionarioUpdated = socketService.on(
      "funcionario:updated",
      (dados) => {
        console.log("👤 Socket: Funcionário atualizado", dados.cracha);
        setFuncionarios((prev) => {
          const novos = prev.map((f) =>
            f.cracha === dados.cracha ? { ...f, ...dados } : f
          );
          setCache("funcionarios", novos);
          return novos;
        });
      }
    );

    const unsubFuncionarioDeleted = socketService.on(
      "funcionario:deleted",
      (dados) => {
        console.log("👤 Socket: Funcionário removido", dados.cracha);
        setFuncionarios((prev) => {
          const novos = prev.filter((f) => f.cracha !== dados.cracha);
          setCache("funcionarios", novos);
          return novos;
        });
      }
    );

    // ─────────────────────────────────────────────────────────────
    // COMUNICADOS
    // ─────────────────────────────────────────────────────────────
    const unsubComunicadoCreated = socketService.on(
      "comunicado:created",
      (comunicado) => {
        console.log("📢 Socket: Novo comunicado", comunicado.id);
        setComunicados((prev) => {
          if (prev.find((c) => c.id === comunicado.id)) return prev;
          const novos = [comunicado, ...prev];
          setCache("comunicados", novos);
          return novos;
        });
      }
    );

    const unsubComunicadoUpdated = socketService.on(
      "comunicado:updated",
      (dados) => {
        console.log("📢 Socket: Comunicado atualizado", dados.id);
        setComunicados((prev) => {
          const novos = prev.map((c) =>
            c.id === dados.id ? { ...c, ...dados } : c
          );
          setCache("comunicados", novos);
          return novos;
        });
      }
    );

    const unsubComunicadoDeleted = socketService.on(
      "comunicado:deleted",
      (dados) => {
        console.log("📢 Socket: Comunicado removido", dados.id);
        setComunicados((prev) => {
          const novos = prev.filter((c) => c.id !== dados.id);
          setCache("comunicados", novos);
          return novos;
        });
      }
    );

    // ─────────────────────────────────────────────────────────────
    // PATCH NOTES
    // ─────────────────────────────────────────────────────────────
    const unsubPatchNoteCreated = socketService.on(
      "patch-note:created",
      (patchNote) => {
        console.log("🔄 Socket: Novo patch note", patchNote.id);
        setPatchNotes((prev) => {
          if (prev.find((p) => p.id === patchNote.id)) return prev;
          const novos = [patchNote, ...prev];
          setCache("patchNotes", novos);
          return novos;
        });
      }
    );

    const unsubPatchNoteUpdated = socketService.on(
      "patch-note:updated",
      (dados) => {
        console.log("🔄 Socket: Patch note atualizado", dados.id);
        setPatchNotes((prev) => {
          const novos = prev.map((p) =>
            p.id === dados.id ? { ...p, ...dados } : p
          );
          setCache("patchNotes", novos);
          return novos;
        });
      }
    );

    const unsubPatchNoteDeleted = socketService.on(
      "patch-note:deleted",
      (dados) => {
        console.log("🔄 Socket: Patch note removido", dados.id);
        setPatchNotes((prev) => {
          const novos = prev.filter((p) => p.id !== dados.id);
          setCache("patchNotes", novos);
          return novos;
        });
      }
    );

    // Guarda referências para cleanup
    socketListenersRef.current = [
      // Visitantes
      unsubVisitanteCreated,
      unsubVisitanteUpdated,
      unsubVisitanteDeleted,
      // Empresas
      unsubEmpresaCreated,
      unsubEmpresaUpdated,
      unsubEmpresaDeleted,
      // Setores
      unsubSetorCreated,
      unsubSetorUpdated,
      unsubSetorDeleted,
      // Agendamentos
      unsubAgendamentoCreate,
      unsubAgendamentoUpdate,
      unsubAgendamentoDelete,
      // Tickets
      unsubTicketCreate,
      unsubTicketUpdate,
      unsubTicketViewed,
      unsubTicketAllViewed,
      // Funcionários
      unsubFuncionarioCreated,
      unsubFuncionarioUpdated,
      unsubFuncionarioDeleted,
      // Comunicados
      unsubComunicadoCreated,
      unsubComunicadoUpdated,
      unsubComunicadoDeleted,
      // Patch Notes
      unsubPatchNoteCreated,
      unsubPatchNoteUpdated,
      unsubPatchNoteDeleted,
    ];

    console.log(
      "🔌 Socket listeners configurados para sincronização em tempo real"
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÃO PRINCIPAL: CARREGAR TODOS OS DADOS
  // ═══════════════════════════════════════════════════════════════
  const loadAllData = useCallback(
    async (forceReload = false) => {
      if (!userId) {
        setLoading(false);
        return;
      }

      // Evita carregamentos duplicados
      if (isLoadingRef.current) {
        console.log("⏳ Carregamento já em andamento...");
        return;
      }

      // Verifica se já tem cache válido e não é reload forçado
      if (!forceReload && isCacheLoaded()) {
        console.log("📦 Usando dados do cache");

        // Restaura do cache
        setVisitantes(getCache("cadastroVisitantes") || []);
        setEmpresas(getCache("empresasVisitantes") || []);
        setSetores(getCache("setoresVisitantes") || []);
        setResponsaveis(getCache("responsaveis") || []);
        setAgendamentos(getCache("agendamentos") || []);
        setTickets(getCache("tickets") || []);
        setFuncionarios(getCache("funcionarios") || []);
        setComunicados(getCache("comunicados") || []);
        setPatchNotes(getCache("patchNotes") || []);
        setUserData(getCache("userData"));

        // Conecta ao Socket para atualizações em tempo real
        const token = localStorage.getItem("token");
        if (token) {
          socketService.connect(token);
          setupSocketListeners();
        }

        setProgress(100);
        setLoading(false);
        isDataLoadedRef.current = true;
        return;
      }

      isLoadingRef.current = true;
      setLoading(true);
      setProgress(0);
      setError(null);

      try {
        // ═══════════════════════════════════════════════════════════
        // ETAPA 1: Empresas e Setores de Visitantes (10%)
        // ═══════════════════════════════════════════════════════════
        setProgressMessage("Carregando empresas e setores...");

        const [empresasRes, setoresRes] = await Promise.all([
          api.get("/empresas-visitantes"),
          api.get("/setores-visitantes"),
        ]);

        const empresasData = empresasRes.data || [];
        const setoresData = setoresRes.data || [];

        setEmpresas(empresasData);
        setSetores(setoresData);
        setCache("empresasVisitantes", empresasData);
        setCache("setoresVisitantes", setoresData);

        setProgress(10);

        // ═══════════════════════════════════════════════════════════
        // ETAPA 2: Dados do Usuário (20%)
        // ═══════════════════════════════════════════════════════════
        setProgressMessage("Carregando dados do usuário...");

        const userRes = await api.get(`usuarios/${userId}`);
        const userDataLoaded = userRes.data;

        setUserData(userDataLoaded);
        setCache("userData", userDataLoaded);

        setProgress(20);

        // ═══════════════════════════════════════════════════════════
        // ETAPA 3: Responsáveis (30%)
        // ═══════════════════════════════════════════════════════════
        setProgressMessage("Carregando responsáveis...");

        const responsaveisRes = await api.get("/visitantes/responsaveis");
        const responsaveisData = responsaveisRes.data || [];

        setResponsaveis(responsaveisData);
        setCache("responsaveis", responsaveisData);

        setProgress(30);

        // ═══════════════════════════════════════════════════════════
        // ETAPA 4: Cadastro de Visitantes (45%)
        // ═══════════════════════════════════════════════════════════
        setProgressMessage("Carregando cadastros de visitantes...");

        const visitantesRes = await api.get("cadastro-visitantes?limit=10000", {
          headers: { Authorization: userId },
        });

        // Mapeia visitantes com nomes de empresa/setor
        const visitantesProcessados = (visitantesRes.data || [])
          .map((visitante) => ({
            ...visitante,
            empresa:
              visitante.empresa_nome ||
              empresasData.find((e) => e.id === visitante.empresa_id)?.nome ||
              "Não informado",
            setor:
              visitante.setor_nome ||
              setoresData.find((s) => s.id === visitante.setor_id)?.nome ||
              "Não informado",
            // Novos campos de veículo e função já vêm do backend
            funcao: visitante.funcao_nome || visitante.funcao || null,
            tipo_veiculo: visitante.tipo_veiculo || null,
            cor_veiculo: visitante.cor_veiculo || null,
          }))
          .sort((a, b) =>
            (a.nome || "")
              .toLowerCase()
              .localeCompare((b.nome || "").toLowerCase(), "pt-BR")
          );

        setVisitantes(visitantesProcessados);
        setCache("cadastroVisitantes", visitantesProcessados);

        setProgress(45);

        // ═══════════════════════════════════════════════════════════
        // ETAPA 5: Agendamentos (55%)
        // ═══════════════════════════════════════════════════════════
        setProgressMessage("Carregando agendamentos...");

        try {
          const agendamentosRes = await api.get("/agendamentos");
          const agendamentosData = agendamentosRes.data || [];
          setAgendamentos(agendamentosData);
          setCache("agendamentos", agendamentosData);
        } catch (err) {
          console.log("⚠️ Agendamentos não disponíveis:", err.message);
          setCache("agendamentos", []);
        }

        setProgress(55);

        // ═══════════════════════════════════════════════════════════
        // ETAPA 6: Tickets (65%)
        // ═══════════════════════════════════════════════════════════
        setProgressMessage("Carregando tickets...");

        try {
          const ticketsRes = await api.get("/tickets");
          const ticketsData = ticketsRes.data || [];
          setTickets(ticketsData);
          setCache("tickets", ticketsData);
        } catch (err) {
          console.log("⚠️ Tickets não disponíveis:", err.message);
          setCache("tickets", []);
        }

        setProgress(65);

        // ═══════════════════════════════════════════════════════════
        // ETAPA 7: Funcionários (75%)
        // ═══════════════════════════════════════════════════════════
        setProgressMessage("Carregando funcionários...");

        try {
          const funcionariosRes = await api.get("/funcionarios");
          const funcionariosData = funcionariosRes.data || [];
          setFuncionarios(funcionariosData);
          setCache("funcionarios", funcionariosData);
        } catch (err) {
          console.log("⚠️ Funcionários não disponíveis:", err.message);
          setCache("funcionarios", []);
        }

        setProgress(75);

        // ═══════════════════════════════════════════════════════════
        // ETAPA 8: Permissões e Papéis (85%)
        // ═══════════════════════════════════════════════════════════
        setProgressMessage("Carregando permissões...");

        try {
          const permissoesRes = await api.get("/usuarios-papeis/me/permissoes");
          const { permissoes, papeis } = permissoesRes.data;
          setCache("permissoes", permissoes);
          setCache("papeis", papeis);
        } catch (err) {
          console.log("⚠️ Permissões não disponíveis:", err.message);
          setCache("permissoes", []);
          setCache("papeis", []);
        }

        setProgress(85);

        // ═══════════════════════════════════════════════════════════
        // ETAPA 9: Comunicados (95%)
        // ═══════════════════════════════════════════════════════════
        setProgressMessage("Carregando comunicados...");

        try {
          const comunicadosRes = await api.get("/comunicados");
          const comunicadosData = comunicadosRes.data || [];
          setComunicados(comunicadosData);
          setCache("comunicados", comunicadosData);
        } catch (err) {
          console.log("⚠️ Comunicados não disponíveis:", err.message);
          setCache("comunicados", []);
        }

        setProgress(95);

        // ═══════════════════════════════════════════════════════════
        // ETAPA 10: Patch Notes (97%)
        // ═══════════════════════════════════════════════════════════
        setProgressMessage("Carregando atualizações do sistema...");

        try {
          const patchNotesRes = await api.get("/patch-notes");
          const patchNotesData = patchNotesRes.data || [];
          setPatchNotes(patchNotesData);
          setCache("patchNotes", patchNotesData);
        } catch (err) {
          console.log("⚠️ Patch Notes não disponíveis:", err.message);
          setCache("patchNotes", []);
        }

        setProgress(97);

        // ═══════════════════════════════════════════════════════════
        // ETAPA 11: Conectar ao Socket.IO (100%)
        // ═══════════════════════════════════════════════════════════
        setProgressMessage("Conectando sincronização em tempo real...");

        const token = localStorage.getItem("token");
        if (token) {
          socketService.connect(token);
          setupSocketListeners();
        }

        setProgress(100);
        setProgressMessage("Concluído!");

        console.log(
          `✅ Dados carregados: ${visitantesProcessados.length} visitantes`
        );
        isDataLoadedRef.current = true;
      } catch (err) {
        console.error("❌ Erro ao carregar dados:", err);
        setError(err.response?.data?.error || err.message);
        setProgress(0);
      } finally {
        isLoadingRef.current = false;

        // Pequeno delay para mostrar 100% antes de esconder loading
        setTimeout(() => {
          setLoading(false);
        }, 300);
      }
    },
    [userId] // Removida dependência setupSocketListeners
  );

  // ═══════════════════════════════════════════════════════════════
  // FUNÇÕES AUXILIARES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Recarrega apenas visitantes
   */
  const reloadVisitantes = useCallback(async () => {
    if (!userId) return;

    try {
      const empresasData = getCache("empresasVisitantes") || [];
      const setoresData = getCache("setoresVisitantes") || [];

      const visitantesRes = await api.get("cadastro-visitantes?limit=10000", {
        headers: { Authorization: userId },
      });

      const visitantesProcessados = (visitantesRes.data || [])
        .map((visitante) => ({
          ...visitante,
          empresa:
            empresasData.find((e) => e.id === visitante.empresa_id)?.nome ||
            "Não informado",
          setor:
            setoresData.find((s) => s.id === visitante.setor_id)?.nome ||
            "Não informado",
        }))
        .sort((a, b) =>
          (a.nome || "")
            .toLowerCase()
            .localeCompare((b.nome || "").toLowerCase(), "pt-BR")
        );

      setVisitantes(visitantesProcessados);
      setCache("cadastroVisitantes", visitantesProcessados);

      console.log(
        `🔄 Visitantes recarregados: ${visitantesProcessados.length}`
      );
      return visitantesProcessados;
    } catch (err) {
      console.error("❌ Erro ao recarregar visitantes:", err);
      throw err;
    }
  }, [userId]);

  /**
   * Remove visitante localmente
   */
  const removeVisitante = useCallback((id) => {
    setVisitantes((prev) => {
      const novos = prev.filter((v) => v.id !== id);
      setCache("cadastroVisitantes", novos);
      return novos;
    });
  }, []);

  /**
   * Adiciona visitante localmente
   */
  const addVisitante = useCallback((visitante) => {
    const empresasData = getCache("empresasVisitantes") || [];
    const setoresData = getCache("setoresVisitantes") || [];

    const visitanteProcessado = {
      ...visitante,
      empresa:
        empresasData.find((e) => e.id === visitante.empresa_id)?.nome ||
        "Não informado",
      setor:
        setoresData.find((s) => s.id === visitante.setor_id)?.nome ||
        "Não informado",
    };

    setVisitantes((prev) => {
      const novos = [...prev, visitanteProcessado].sort((a, b) =>
        (a.nome || "")
          .toLowerCase()
          .localeCompare((b.nome || "").toLowerCase(), "pt-BR")
      );
      setCache("cadastroVisitantes", novos);
      return novos;
    });
  }, []);

  /**
   * Atualiza visitante localmente
   */
  const updateVisitante = useCallback((id, dados) => {
    const empresasData = getCache("empresasVisitantes") || [];
    const setoresData = getCache("setoresVisitantes") || [];

    const dadosProcessados = {
      ...dados,
      empresa:
        empresasData.find((e) => e.id === dados.empresa_id)?.nome ||
        dados.empresa ||
        "Não informado",
      setor:
        setoresData.find((s) => s.id === dados.setor_id)?.nome ||
        dados.setor ||
        "Não informado",
    };

    setVisitantes((prev) => {
      const novos = prev
        .map((v) => (v.id === id ? { ...v, ...dadosProcessados } : v))
        .sort((a, b) =>
          (a.nome || "")
            .toLowerCase()
            .localeCompare((b.nome || "").toLowerCase(), "pt-BR")
        );
      setCache("cadastroVisitantes", novos);
      return novos;
    });
  }, []);

  /**
   * Limpa todos os dados e desconecta
   */
  const clearAllData = useCallback(() => {
    // Desconecta socket
    socketService.disconnect();

    // Remove listeners
    socketListenersRef.current.forEach((unsub) => unsub && unsub());
    socketListenersRef.current = [];

    // Limpa cache completo
    clearCache();

    // Limpa estados
    setVisitantes([]);
    setEmpresas([]);
    setSetores([]);
    setResponsaveis([]);
    setAgendamentos([]);
    setTickets([]);
    setFuncionarios([]);
    setComunicados([]);
    setUserData(null);

    isDataLoadedRef.current = false;
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════

  // Carrega dados automaticamente quando userId muda
  useEffect(() => {
    // Evita execuções múltiplas durante navegação
    if (!userId) return;

    // Se é o mesmo usuário e dados já foram carregados, não faz nada
    if (currentUserIdRef.current === userId && isDataLoadedRef.current) {
      return;
    }

    // Se mudou de usuário, reseta o estado
    if (currentUserIdRef.current !== userId) {
      currentUserIdRef.current = userId;
      isDataLoadedRef.current = false;
    }

    // Se dados já foram carregados para este userId, não faz nada
    if (isDataLoadedRef.current) {
      return;
    }

    // Se não tem cache, carrega tudo da API
    if (!isCacheLoaded()) {
      console.log("🔄 Carregando dados...");
      // Chama loadAllData diretamente sem dependências
      loadAllData();
    } else {
      // Tem cache válido - inicializa sem re-carregar
      isDataLoadedRef.current = true;

      // Conecta socket se necessário
      if (!socketService.isConnected()) {
        const token = localStorage.getItem("token");
        if (token) {
          socketService.connect(token);
          // Chama setupSocketListeners diretamente sem dependências
          setupSocketListeners();
        }
      }
    }
  }, [userId]); // Apenas userId como dependência

  // Reconecta socket se já tem cache mas socket não está conectado
  useEffect(() => {
    if (userId && hasInitialCacheRef.current && !socketService.isConnected()) {
      console.log("🔌 Reconectando socket após navegação com cache...");

      // Pequeno delay para evitar reconexões desnecessárias durante navegação rápida
      const reconnectTimer = setTimeout(() => {
        if (!socketService.isConnected()) {
          const token = localStorage.getItem("token");
          if (token) {
            socketService.connect(token);
            setupSocketListeners();
            isDataLoadedRef.current = true;
          }
        }
      }, 100); // 100ms de delay

      return () => clearTimeout(reconnectTimer);
    }
  }, [userId, setupSocketListeners]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      socketListenersRef.current.forEach((unsub) => unsub && unsub());
      socketListenersRef.current = [];
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════
  return {
    // Estado de loading
    loading,
    progress,
    progressMessage,
    error,

    // Dados principais
    visitantes,
    empresas,
    setores,
    responsaveis,
    agendamentos,
    tickets,
    funcionarios,
    comunicados,
    patchNotes,
    userData,

    // Ações
    loadAllData,
    reloadVisitantes,
    removeVisitante,
    addVisitante,
    updateVisitante,
    clearAllData,

    // Helpers
    isDataLoaded: isDataLoadedRef.current,
    totalVisitantes: visitantes.length,
    isSocketConnected: socketService.isConnected(),
  };
}

export default useDataLoader;
