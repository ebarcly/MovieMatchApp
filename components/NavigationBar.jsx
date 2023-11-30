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
    marginTop: 48,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  title: {
    fontSize: 20,
    fontFamily: 'WorkSans-Medium',
    color: '#000',
  },
});

export default NavigationBar;
