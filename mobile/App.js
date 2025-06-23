import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logon from './src/pages/Logon';
import Profile from './src/pages/Profile'; 
import Register from './src/pages/Register'; // 
import Visitors from './src/pages/Visitors';
import History from './src/pages/History';
import TicketDashboard from './src/pages/TicketDashboard';
import ViewVisitor from './src/pages/ViewVisitor'; //Perfil do Visitante
import EditIncident from './src/pages/EditIncident'; //Editar do Perfil Visitante
import NewIncident from './src/pages/NewIncident';
import RecuperarId from './src/pages/RecuperarId';
import BiparCracha from './src/pages/BiparCracha';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Logon">
        <Stack.Screen 
          name="Logon" 
          component={Logon} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen name="Profile" component={Profile} options={{ headerShown: false }}/>
        <Stack.Screen name="Register" component={Register} options={{ headerShown: false }}/>
        <Stack.Screen name="Visitors" component={Visitors} options={{ headerShown: false }}/>
        <Stack.Screen name="History" component={History} options={{ headerShown: false }}/>
        <Stack.Screen name="TicketDashboard" component={TicketDashboard} options={{ headerShown: false }}/>
        <Stack.Screen name="ViewVisitor" component={ViewVisitor} options={{ headerShown: false }}/>
        <Stack.Screen name="EditIncident" component={EditIncident} options={{ headerShown: false }}/>
        <Stack.Screen name="NewIncident" component={NewIncident} options={{ headerShown: false }}/>
        <Stack.Screen name="RecuperarId" component={RecuperarId} options={{ headerShown: false }}/>
        <Stack.Screen name="BiparCracha" component={BiparCracha} options={{ headerShown: false }}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}