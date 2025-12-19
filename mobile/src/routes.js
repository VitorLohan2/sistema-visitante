// src/routes.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// 📌 Telas
import Logon from "./pages/Logon";
import Register from "./pages/Register";
import RecuperarId from "./pages/RecuperarId";

import Profile from "./pages/Profile";
import Visitors from "./pages/Visitors";
import History from "./pages/History";

import NewIncident from "./pages/NewIncident";
import EditIncident from "./pages/EditIncident";
import ViewVisitor from "./pages/ViewVisitor";

import TicketDashboard from "./pages/TicketDashboard";
import Tickets from "./pages/Tickets";

import BiparCracha from "./pages/BiparCracha";

import Agendamentos from "./pages/Agendamentos";
import ListaAgendamentos from "./pages/ListaAgendamentos";
import CadastrarAgendamentos from "./pages/CadastrarAgendamentos";

const Stack = createNativeStackNavigator();

export default function Routes() {
  return (
    <Stack.Navigator
      initialRouteName="Logon"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      {/* ----------- ROTAS PÚBLICAS ------------ */}
      <Stack.Screen name="Logon" component={Logon} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="RecuperarId" component={RecuperarId} />

      {/* ----------- ROTAS INTERNAS / APÓS LOGIN ------------ */}
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="Visitors" component={Visitors} />
      <Stack.Screen name="History" component={History} />

      {/* ----------- INCIDENTES ------------ */}
      <Stack.Screen name="NewIncident" component={NewIncident} />
      <Stack.Screen name="EditIncident" component={EditIncident} />
      <Stack.Screen name="ViewVisitor" component={ViewVisitor} />

      {/* ----------- CHAMADOS / TICKETS ------------ */}
      <Stack.Screen name="Tickets" component={Tickets} />
      <Stack.Screen name="TicketDashboard" component={TicketDashboard} />

      {/* ----------- BIPAGEM / CRACHÁ ------------ */}
      <Stack.Screen name="BiparCracha" component={BiparCracha} />

      <Stack.Screen name="Agendamentos" component={Agendamentos} />
      <Stack.Screen name="ListaAgendamentos" component={ListaAgendamentos} />
      <Stack.Screen
        name="CadastrarAgendamentos"
        component={CadastrarAgendamentos}
      />
    </Stack.Navigator>
  );
}
