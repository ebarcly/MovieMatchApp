import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import SearchIcon from './SearchIcon';

const NavigationBar = ({ username }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{`Hey ${username}!`}</Text>
      <SearchIcon />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#19192b',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontFamily: 'WorkSans-Medium',
    color: '#fff',
  },
});

export default NavigationBar;
