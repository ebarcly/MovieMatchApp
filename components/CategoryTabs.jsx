import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import CategoryButton from './CategoryButton';

const categories = ['TV Shows', 'Movies', 'Categories'];

const CategoryTabs = () => {
  const [activeTab, setActiveTab] = useState(categories[0]);

  return (
    <View style={styles.container}>
      {categories.map((category) => (
        <CategoryButton
          key={category}
          label={category}
          isActive={activeTab === category}
          onPress={() => setActiveTab(category)}
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
