import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import CategoryButton from './CategoryButton';

const categories = ['TV Shows', 'Movies', 'All']; // Updated categories list

const CategoryTabs = ({ onCategorySelect }) => {
  const [activeTab, setActiveTab] = useState(categories[0]);

  const handleCategorySelect = (category) => {
    setActiveTab(category);
    onCategorySelect(category);
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((category) => (
        <CategoryButton
          key={category}
          label={category}
          isActive={activeTab === category}
          onPress={() => handleCategorySelect(category)}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f0f0f0',
  },
});

export default CategoryTabs;