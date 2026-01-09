// src/routes/index.js
import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";

import Login from "../pages/Login";
import CadastrarUsuario from "../pages/CadastrarUsuario";
import Dashboard from "../pages/Dashboard";
import ListagemVisitante from "../pages/ListagemVisitante";
import NovoCadastroVisitante from "../pages/NovoCadastroVisitante";
import Visitante from "../pages/Visitante";
import HistoricoVisitante from "../pages/HistoricoVisitante";
import EditarCadastroVisitante from "../pages/EditarCadastroVisitante";
import VisualizarVisitante from "../pages/VisualizarVisitante";
import Ticket from "../pages/Ticket";
import TicketDashboard from "../pages/TicketDashboard";
import GeradorCodigo from "../pages/GeradorCodigo";
import ListaFuncionarios from "../pages/ListaFuncionarios";
import CadastrarFuncionario from "../pages/CadastrarFuncionario";
import EditarFuncionario from "../pages/EditarFuncionario";
import BiparCracha from "../pages/BiparCracha";
import HistoricoFuncionarios from "../pages/HistoricoFuncionarios";
import RecuperarId from "../pages/RecuperarId";
import HelpDesk from "../pages/HelpDesk";
import CadastrarEmpresaVisitante from "../pages/CadastrarEmpresaVisitante";
import ProtectedRoute from "./protectedRoutes";
import ListaAgendamentos from "../pages/ListaAgendamentos";
import CadastrarAgendamentos from "../pages/CadastrarAgendamentos";
import GerenciamentoPermissoes from "../pages/GerenciamentoPermissoes";

export default function Routes() {
  return (
    <BrowserRouter>
      <Switch>
        {/* Rotas públicas */}
        <Route path="/" exact component={Login} />
        <Route path="/register" component={CadastrarUsuario} />
        <Route path="/recuperar-id" exact component={RecuperarId} />
        <Route path="/helpdesk" exact component={HelpDesk} />

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ROTAS PROTEGIDAS COM PERMISSÕES */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {/* Dashboard - apenas admin ou quem tem permissão */}
        <ProtectedRoute path="/dashboard" permissao="dashboard_visualizar">
          <Dashboard />
        </ProtectedRoute>

        {/* Listagem de Visitantes (Página Inicial) - visitante_visualizar */}
        <ProtectedRoute
          path="/listagem-visitante"
          permissao="visitante_visualizar"
        >
          <ListagemVisitante />
        </ProtectedRoute>

        {/* Cadastrar Visitante - cadastro_criar */}
        <ProtectedRoute
          path="/cadastro-visitantes/novo"
          permissao="cadastro_criar"
        >
          <NovoCadastroVisitante />
        </ProtectedRoute>

        {/* Lista de Visitantes Cadastrados - cadastro_visualizar */}
        <ProtectedRoute path="/visitantes" permissao="cadastro_visualizar">
          <Visitante />
        </ProtectedRoute>

        {/* Histórico de Visitantes - visitante_historico */}
        <ProtectedRoute
          path="/historico-visitante"
          permissao="visitante_historico"
        >
          <HistoricoVisitante />
        </ProtectedRoute>

        {/* Editar Cadastro de Visitante - cadastro_editar */}
        <ProtectedRoute
          path="/cadastro-visitantes/edit/:id"
          permissao="cadastro_editar"
        >
          <EditarCadastroVisitante />
        </ProtectedRoute>

        {/* Visualizar Visitante - cadastro_visualizar */}
        <ProtectedRoute
          path="/cadastro-visitantes/view/:id"
          permissao="cadastro_visualizar"
        >
          <VisualizarVisitante />
        </ProtectedRoute>

        {/* Ticket Individual - ticket_visualizar */}
        <ProtectedRoute path="/ticket" exact permissao="ticket_visualizar">
          <Ticket />
        </ProtectedRoute>

        {/* Dashboard de Tickets - ticket_visualizar */}
        <ProtectedRoute path="/ticket-dashboard" permissao="ticket_visualizar">
          <TicketDashboard />
        </ProtectedRoute>

        {/* Chave de Cadastro (Códigos) - codigo_visualizar */}
        <ProtectedRoute path="/chave-cadastro" permissao="codigo_visualizar">
          <GeradorCodigo />
        </ProtectedRoute>

        {/* Cadastrar Empresa - empresa_criar */}
        <ProtectedRoute
          path="/cadastrar-empresa-visitante"
          permissao="empresa_criar"
        >
          <CadastrarEmpresaVisitante />
        </ProtectedRoute>

        {/* Lista de Funcionários - funcionario_visualizar */}
        <ProtectedRoute
          path="/funcionarios"
          exact
          permissao="funcionario_visualizar"
        >
          <ListaFuncionarios />
        </ProtectedRoute>

        {/* Cadastrar Funcionário - funcionario_criar */}
        <ProtectedRoute
          path="/funcionarios/cadastrar"
          permissao="funcionario_criar"
        >
          <CadastrarFuncionario />
        </ProtectedRoute>

        {/* Editar Funcionário - funcionario_editar */}
        <ProtectedRoute
          path="/funcionarios/editar/:cracha"
          permissao="funcionario_editar"
        >
          <EditarFuncionario />
        </ProtectedRoute>

        {/* Histórico de Funcionário - funcionario_historico */}
        <ProtectedRoute
          path="/funcionarios/historico/:cracha"
          permissao="funcionario_historico"
        >
          <HistoricoFuncionarios />
        </ProtectedRoute>

        {/* Cadastrar Agendamento - agendamento_criar */}
        <ProtectedRoute path="/agendamentos/novo" permissao="agendamento_criar">
          <CadastrarAgendamentos />
        </ProtectedRoute>

        {/* Lista de Agendamentos - agendamento_visualizar */}
        <ProtectedRoute path="/agendamentos" permissao="agendamento_visualizar">
          <ListaAgendamentos />
        </ProtectedRoute>

        {/* Ponto (Bipagem) - ponto_visualizar */}
        <ProtectedRoute path="/ponto" permissao="ponto_visualizar">
          <BiparCracha />
        </ProtectedRoute>

        {/* Gerenciamento de Permissões - SOMENTE ADMIN */}
        <ProtectedRoute path="/gerenciamento-permissoes" adminOnly>
          <GerenciamentoPermissoes />
        </ProtectedRoute>
      </Switch>
    </BrowserRouter>
  );
}
