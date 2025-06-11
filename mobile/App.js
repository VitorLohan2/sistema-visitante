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
      </Stack.Navigator>
    </NavigationContainer>
  );
}