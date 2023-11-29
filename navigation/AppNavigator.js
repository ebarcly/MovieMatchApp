import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import DetailScreen from '../screens/DetailScreen';
import MyCaveScreen from '../screens/MyCaveScreen';
import MatchesScreen from '../screens/MatchesScreen';

const HomeStack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Create a home stack navigator to include both HomeScreen and DetailScreen
function HomeStackScreen() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="HomeStack" component={HomeScreen} options={{ headerShown: false }}/>
      <HomeStack.Screen name="Detail" component={DetailScreen} options={{ headerShown: false }} />
    </HomeStack.Navigator>
  );
}

const AppNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeStackScreen} options={{ headerShown: false }} />
      {/* The DetailScreen is no longer directly in the Tab.Navigator */}
      <Tab.Screen name="Profile" component={MyCaveScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Matches" component={MatchesScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
};

export default AppNavigator;
