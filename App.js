import React from 'react';
import { MoviesProvider } from './context/MoviesContext';
import HomeScreen from './screens/HomeScreen';

const App = () => {
  return (
    <MoviesProvider>
      <HomeScreen />
    </MoviesProvider>
  );
};

export default App;
