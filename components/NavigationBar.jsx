import React from 'react';
import { View, StyleSheet } from 'react-native';
import SearchIcon from './SearchIcon';

const NavigationBar = ({ username }) => {
  return (
    <View style={styles.container}>
      <Text text={`Hey ${username}!`} />
      <SearchIcon />
      {/* Add other icons or elements here as needed */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#19192b', // Adjust the color to match the theme
  },
  // Add other styles here as needed
});

export default NavigationBar;
