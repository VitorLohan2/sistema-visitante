// src/routes.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import Logon from './pages/Logon';
import Profile from './pages/Profile';
import Register from './pages/Register';
import Visitors from './pages/Visitors';
import History from './pages/History';
import TicketDashboard from './pages/TicketDashboard';
import Tickets from './pages/Tickets';
import ViewVisitor from './pages/ViewVisitor';
import EditIncident from './pages/EditIncident';
import NewIncident from './pages/NewIncident';
import RecuperarId from './pages/RecuperarId';
import BiparCracha from './pages/BiparCracha';

const Stack = createStackNavigator();

export default function Routes() {
  return (
    <Stack.Navigator initialRouteName="Logon">
      <Stack.Screen name="Logon" component={Logon} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={Profile} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
      <Stack.Screen name="Visitors" component={Visitors} options={{ headerShown: false }} />
      <Stack.Screen name="History" component={History} options={{ headerShown: false }} />
      <Stack.Screen name="TicketDashboard" component={TicketDashboard} options={{ headerShown: false }} />
      <Stack.Screen name="Tickets" component={Tickets} options={{ headerShown: false }} />
      <Stack.Screen name="ViewVisitor" component={ViewVisitor} options={{ headerShown: false }} />
      <Stack.Screen name="EditIncident" component={EditIncident} options={{ headerShown: false }} />
      <Stack.Screen name="NewIncident" component={NewIncident} options={{ headerShown: false }} />
      <Stack.Screen name="RecuperarId" component={RecuperarId} options={{ headerShown: false }} />
      <Stack.Screen name="BiparCracha" component={BiparCracha} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
