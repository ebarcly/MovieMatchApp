import React, { useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import CategoryButton from './CategoryButton';
import { spacing } from '../theme';

const categories = ['TV Shows', 'Movies', 'All'] as const;
export type Category = (typeof categories)[number];

interface CategoryTabsProps {
  onCategorySelect: (category: Category) => void;
}

const CategoryTabs = ({
  onCategorySelect,
}: CategoryTabsProps): React.ReactElement => {
  const [activeTab, setActiveTab] = useState<Category>(categories[0]);

  const handleCategorySelect = (category: Category): void => {
    setActiveTab(category);
    onCategorySelect(category);
  };

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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
  },
});

export default CategoryTabs;
