import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { FontAwesome } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { AppContextProvider } from '../context/AppContext';
import DrawerContent from '../navigation/DrawerContent';
import HomeScreen from '../screens/HomeScreen';

const Drawer = createDrawerNavigator();

export default function RootLayout() {
  return (
    <AppContextProvider>
      <Drawer.Navigator
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#F6AD55',
          },
          headerTintColor: '#fff',
          drawerActiveTintColor: '#F6AD55',
        }}
      >
        <Drawer.Screen
          name="Home"
          component={HomeScreen}
          options={{
            drawerIcon: ({ color }) => (
              <FontAwesome name="home" size={24} color={color} />
            ),
          }}
        />

      </Drawer.Navigator>
    </AppContextProvider>
  );
}

const PlaceholderScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Coming Soon!</Text>
  </View>
);