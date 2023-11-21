import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#6063b4',
    borderRadius: 26,
    backgroundColor: '#19192b',
  },
  text: {
    color: '#d1d2d5',
    fontSize: 14,
    fontFamily: 'WorkSans-Medium',
  },
  activeButton: {
    backgroundColor: '#6063b4',
  },
  activeText: {
    color: '#ffffff',
  },
});

const CategoryButton = ({ label, isActive, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.button, isActive && styles.activeButton]}
      onPress={onPress}
    >
      <Text style={[styles.text, isActive && styles.activeText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default CategoryButton;
