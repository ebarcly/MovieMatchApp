import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import CategoryButton from './CategoryButton';

const categories = ['Movies', 'TV Shows', 'Categories'];

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
    padding: 10,
  },
});

export default CategoryTabs;
