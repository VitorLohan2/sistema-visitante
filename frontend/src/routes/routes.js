// src/routes/index.js
import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";

import Logon from "../pages/Logon";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Profile from "../pages/Profile";
import NewIncident from "../pages/NewIncident";
import Visitors from "../pages/Visitors";
import History from "../pages/History";
import EditIncident from "../pages/EditIncident";
import ViewVisitor from "../pages/ViewVisitor";
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
import CadastrarEmpresaVisitantes from "../pages/CadastrarEmpresaVisitantes";
import ProtectedRoute from "./protectedRoutes";
import ListaAgendamentos from "../pages/ListaAgendamentos";
import CadastrarAgendamentos from "../pages/CadastrarAgendamentos";

export default function Routes() {
  return (
    <BrowserRouter>
      <Switch>
        {/* Rotas públicas */}
        <Route path="/" exact component={Logon} />
        <Route path="/register" component={Register} />
        <Route path="/recuperar-id" exact component={RecuperarId} />
        <Route path="/helpdesk" exact component={HelpDesk} />

        {/* Rotas protegidas */}
        <ProtectedRoute path="/dashboard">
          <Dashboard />
        </ProtectedRoute>

        <ProtectedRoute path="/profile">
          <Profile />
        </ProtectedRoute>

        <ProtectedRoute path="/cadastro-visitantes/new">
          <NewIncident />
        </ProtectedRoute>

        <ProtectedRoute path="/visitors">
          <Visitors />
        </ProtectedRoute>

        <ProtectedRoute path="/history">
          <History />
        </ProtectedRoute>

        <ProtectedRoute path="/cadastro-visitantes/edit/:id">
          <EditIncident />
        </ProtectedRoute>

        <ProtectedRoute path="/cadastro-visitantes/view/:id">
          <ViewVisitor />
        </ProtectedRoute>

        <ProtectedRoute path="/tickets" exact>
          <Ticket />
        </ProtectedRoute>

        <ProtectedRoute path="/ticket-dashboard">
          <TicketDashboard />
        </ProtectedRoute>

        <ProtectedRoute path="/chave-cadastro">
          <GeradorCodigo />
        </ProtectedRoute>

        <ProtectedRoute path="/empresa-visitantes">
          <CadastrarEmpresaVisitantes />
        </ProtectedRoute>

        <ProtectedRoute path="/funcionarios" exact>
          <ListaFuncionarios />
        </ProtectedRoute>

        <ProtectedRoute path="/funcionarios/cadastrar">
          <CadastrarFuncionario />
        </ProtectedRoute>

        <ProtectedRoute path="/funcionarios/editar/:cracha">
          <EditarFuncionario />
        </ProtectedRoute>

        <ProtectedRoute path="/funcionarios/historico/:cracha">
          <HistoricoFuncionarios />
        </ProtectedRoute>

        <ProtectedRoute path="/agendamentos/novo">
          <CadastrarAgendamentos />
        </ProtectedRoute>

        <ProtectedRoute path="/agendamentos">
          <ListaAgendamentos />
        </ProtectedRoute>

        <ProtectedRoute path="/ponto">
          <BiparCracha />
        </ProtectedRoute>
      </Switch>
    </BrowserRouter>
  );
}
