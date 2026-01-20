/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROTAS DA APLICAÇÃO - Sistema de Visitantes
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Organização:
 * - Rotas Públicas: Login, Recuperar Senha, Solicitar Descarga
 * - Rotas Protegidas: Todas as demais (requerem autenticação)
 * - Permissões: Verificadas via ProtectedRoute
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";

// Páginas públicas
import Login from "../pages/Login";
import RecuperarSenha from "../pages/RecuperarSenha";
import RedefinirSenha from "../pages/RedefinirSenha";
import CriarSenha from "../pages/CriarSenha";
import SolicitacaoDescarga from "../pages/SolicitacaoDescarga";

// Páginas protegidas - Navegação principal
import Home from "../pages/Home";
import Dashboard from "../pages/Dashboard";

// Páginas protegidas - Visitantes
import ListagemVisitante from "../pages/ListagemVisitante";
import CadastrarVisitante from "../pages/CadastrarVisitante";
import Visitante from "../pages/Visitante";
import HistoricoVisitante from "../pages/HistoricoVisitante";
import EditarCadastroVisitante from "../pages/EditarCadastroVisitante";
import VisualizarVisitante from "../pages/VisualizarVisitante";

// Páginas protegidas - Tickets e Suporte
import TicketDashboard from "../pages/TicketDashboard";
import PainelAtendente from "../pages/PainelAtendente";

// Páginas protegidas - Empresas
import ListaEmpresasVisitantes from "../pages/ListaEmpresasVisitantes";

// Páginas protegidas - Funcionários e Agendamentos
import ListaFuncionarios from "../pages/ListaFuncionarios";
import ListaAgendamentos from "../pages/ListaAgendamentos";

// Páginas protegidas - Ponto e Descargas
import BiparCracha from "../pages/BiparCracha";
import GerenciamentoDescargas from "../pages/GerenciamentoDescargas";

// Páginas protegidas - Administração
import GerenciamentoPermissoes from "../pages/GerenciamentoPermissoes";

// Páginas protegidas - Ronda de Vigilante
import Ronda from "../pages/Ronda";
import HistoricoRondas from "../pages/Ronda/HistoricoRondas";
import PainelRondas from "../pages/PainelRondas";

// Componente de rota protegida
import ProtectedRoute from "./protectedRoutes";

export default function Routes() {
  return (
    <BrowserRouter>
      <Switch>
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ROTAS PÚBLICAS (sem autenticação) */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <Route path="/" exact component={Login} />
        <Route path="/recuperar-senha" exact component={RecuperarSenha} />
        <Route path="/redefinir-senha" exact component={RedefinirSenha} />
        <Route path="/criar-senha" exact component={CriarSenha} />
        <Route
          path="/solicitar-descarga"
          exact
          component={SolicitacaoDescarga}
        />

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ROTAS PROTEGIDAS COM PERMISSÕES */}
        {/* ══════════════════════════════════════════════════════════════ */}

        {/* Home - Página inicial universal (carrega dados do sistema) */}
        <ProtectedRoute path="/home">
          <Home />
        </ProtectedRoute>

        {/* Dashboard - Estatísticas e gráficos */}
        <ProtectedRoute path="/dashboard" permissao="dashboard_visualizar">
          <Dashboard />
        </ProtectedRoute>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* MÓDULO: VISITANTES */}
        {/* ════════════════════════════════════════════════════════════ */}

        {/* Listagem de Visitantes (Página Inicial do módulo) */}
        <ProtectedRoute
          path="/listagem-visitante"
          permissao="visitante_visualizar"
        >
          <ListagemVisitante />
        </ProtectedRoute>

        {/* Cadastrar novo visitante */}
        <ProtectedRoute
          path="/cadastro-visitantes/novo"
          permissao="cadastro_criar"
        >
          <CadastrarVisitante />
        </ProtectedRoute>

        {/* Lista de visitantes cadastrados */}
        <ProtectedRoute path="/visitantes" permissao="cadastro_visualizar">
          <Visitante />
        </ProtectedRoute>

        {/* Histórico de visitas */}
        <ProtectedRoute
          path="/historico-visitante"
          permissao="visitante_historico"
        >
          <HistoricoVisitante />
        </ProtectedRoute>

        {/* Editar cadastro de visitante */}
        <ProtectedRoute
          path="/cadastro-visitantes/edit/:id"
          permissao="cadastro_editar"
        >
          <EditarCadastroVisitante />
        </ProtectedRoute>

        {/* Visualizar visitante */}
        <ProtectedRoute
          path="/cadastro-visitantes/view/:id"
          permissao="cadastro_visualizar"
        >
          <VisualizarVisitante />
        </ProtectedRoute>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* MÓDULO: TICKETS DE SUPORTE */}
        {/* ════════════════════════════════════════════════════════════ */}

        {/* Dashboard de Tickets */}
        <ProtectedRoute path="/ticket-dashboard" permissao="ticket_visualizar">
          <TicketDashboard />
        </ProtectedRoute>

        {/* Rota legada - redireciona para ticket-dashboard */}
        <ProtectedRoute path="/tickets" permissao="ticket_visualizar">
          <TicketDashboard />
        </ProtectedRoute>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* MÓDULO: CHAT DE SUPORTE */}
        {/* ════════════════════════════════════════════════════════════ */}

        {/* Painel do Atendente - Chat de Suporte ao Vivo */}
        <ProtectedRoute
          path="/chat-suporte/atendente"
          permissao="chat_atendente_acessar_painel"
        >
          <PainelAtendente />
        </ProtectedRoute>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* MÓDULO: EMPRESAS */}
        {/* ════════════════════════════════════════════════════════════ */}

        {/* Lista de Empresas (inclui funcionalidade de criar) */}
        <ProtectedRoute
          path="/empresas-visitantes"
          permissao="empresa_visualizar"
        >
          <ListaEmpresasVisitantes />
        </ProtectedRoute>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* MÓDULO: FUNCIONÁRIOS E AGENDAMENTOS */}
        {/* ════════════════════════════════════════════════════════════ */}

        {/* Lista de Funcionários */}
        <ProtectedRoute
          path="/funcionarios"
          exact
          permissao="funcionario_visualizar"
        >
          <ListaFuncionarios />
        </ProtectedRoute>

        {/* Lista de Agendamentos */}
        <ProtectedRoute path="/agendamentos" permissao="agendamento_visualizar">
          <ListaAgendamentos />
        </ProtectedRoute>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* MÓDULO: PONTO E DESCARGAS */}
        {/* ════════════════════════════════════════════════════════════ */}

        {/* Bipagem de Crachá (Ponto) */}
        <ProtectedRoute path="/ponto" permissao="ponto_visualizar">
          <BiparCracha />
        </ProtectedRoute>

        {/* Gerenciamento de Descargas */}
        <ProtectedRoute
          path="/gerenciamento-descargas"
          permissao="descarga_visualizar"
        >
          <GerenciamentoDescargas />
        </ProtectedRoute>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* MÓDULO: ADMINISTRAÇÃO */}
        {/* ════════════════════════════════════════════════════════════ */}

        {/* Gerenciamento de Permissões - permissao_gerenciar */}
        <ProtectedRoute
          path="/gerenciamento-permissoes"
          permissao="permissao_gerenciar"
        >
          <GerenciamentoPermissoes />
        </ProtectedRoute>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* MÓDULO: RONDA DE VIGILANTE */}
        {/* ════════════════════════════════════════════════════════════ */}

        {/* Página principal - Iniciar/Gerenciar Ronda */}
        <ProtectedRoute path="/ronda" exact permissao="ronda_iniciar">
          <Ronda />
        </ProtectedRoute>

        {/* Histórico de Rondas do Vigilante */}
        <ProtectedRoute
          path="/ronda/historico"
          permissao="ronda_visualizar_historico"
        >
          <HistoricoRondas />
        </ProtectedRoute>

        {/* Painel Administrativo de Rondas */}
        <ProtectedRoute path="/painel-rondas" permissao="ronda_gerenciar">
          <PainelRondas />
        </ProtectedRoute>
      </Switch>
    </BrowserRouter>
  );
}
