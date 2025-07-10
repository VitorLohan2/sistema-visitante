import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

import Routes from './routes';
import NotificationListener from './components/NotificationListener';

export default function App() {
  return (
    <>
      <NotificationListener />
      <NavigationContainer>
        <Routes />
      </NavigationContainer>
    </>
  );
}