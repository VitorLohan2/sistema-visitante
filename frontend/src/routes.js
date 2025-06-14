import React from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'

import Logon from './pages/Logon'
import Register from './pages/Register'
import Profile from './pages/Profile'
import NewIncident from './pages/NewIncident'
import Visitors from './pages/Visitors'
import History from './pages/History'
import EditIncident from './pages/EditIncident'
import ViewVisitor from './pages/ViewVisitor'
import Ticket from './pages/Ticket'
import TicketDashboard from './pages/TicketDashboard'
import GeradorCodigo from './pages/GeradorCodigo'



export default function Routes() {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/" exact component={Logon} />
        <Route path="/register" component={Register} />
        <Route path="/profile" component={Profile} />
        <Route path="/incidents/new" component={NewIncident} />
        <Route path="/visitors" component={Visitors} /> 
        <Route path="/history" component={History} />
        <Route path="/incidents/edit/:id" component={EditIncident} />
        <Route path="/incidents/view/:id" component={ViewVisitor} />
        <Route path="/tickets" exact component={Ticket} />
        <Route path="/ticket-dashboard" component={TicketDashboard} />
        <Route path="/chave-cadastro" component={GeradorCodigo} />
      </Switch>
    </BrowserRouter>
  )
}