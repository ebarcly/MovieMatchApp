import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import SearchIcon from './SearchIcon';


const NavigationBar = ({ username }) => {
  return (
    <View style={styles.container}>
      <Text>{`Hey ${username}!`}</Text>
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
    marginTop: 40,
    padding: 16,
    backgroundColor: '#19192b', // Adjust the color to match the theme
  },
  title: {
    fontSize: 20,
    fontFamily: 'WorkSans-Medium',
    color: '#fff',
  },

});

export default NavigationBar;
