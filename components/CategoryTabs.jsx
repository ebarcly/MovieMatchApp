import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import CategoryButton from './CategoryButton';

const categories = ['Movies', 'TV Shows']; // add Categories later

const CategoryTabs = ({ onCategorySelect }) => {
  const [activeTab, setActiveTab] = useState(categories[0]);

  const handleCategorySelect = (category) => {
    setActiveTab(category);
    onCategorySelect(category);
  }

  return (
    <View style={styles.container}>
      {categories.map((category) => (
        <CategoryButton
          key={category}
          label={category}
          isActive={activeTab === category}
          onPress={() => handleCategorySelect(category)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'left',
    alignItems: 'left',
  },
});

export default CategoryTabs;
