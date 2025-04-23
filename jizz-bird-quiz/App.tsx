import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import HomeScreen from './app/screens/HomeScreen';
import DrawerContent from './app/navigation/DrawerContent';
import { FontAwesome } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { AppContextProvider } from './app/context/AppContext';

const Drawer = createDrawerNavigator();

export default function App() {
  return (
    <AppContextProvider>
      <NavigationContainer>
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
          {/* Add other screens here */}
          <Drawer.Screen
            name="Start"
            component={PlaceholderScreen}
            options={{
              drawerIcon: ({ color }) => (
                <FontAwesome name="play" size={24} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="Join"
            component={PlaceholderScreen}
            options={{
              drawerIcon: ({ color }) => (
                <FontAwesome name="users" size={24} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="Scores"
            component={PlaceholderScreen}
            options={{
              drawerIcon: ({ color }) => (
                <FontAwesome name="trophy" size={24} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="Challenge"
            component={PlaceholderScreen}
            options={{
              drawerIcon: ({ color }) => (
                <FontAwesome name="star" size={24} color={color} />
              ),
            }}
          />
        </Drawer.Navigator>
      </NavigationContainer>
    </AppContextProvider>
  );
}

// Temporary placeholder for screens we haven't created yet
const PlaceholderScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Coming Soon!</Text>
  </View>
); 