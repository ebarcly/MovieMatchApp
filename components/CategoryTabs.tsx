import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import CategoryButton from './CategoryButton';
import { spacing } from '../theme';

const categories = ['TV Shows', 'Movies', 'All'] as const;
export type Category = (typeof categories)[number];

interface CategoryTabsProps {
  selected: Category;
  onCategorySelect: (category: Category) => void;
}

// reason: controlled component — parent owns selected category so the
// active highlight and the content stay in sync on the first tap.
const CategoryTabs = ({
  selected,
  onCategorySelect,
}: CategoryTabsProps): React.ReactElement => {
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
          isActive={selected === category}
          onPress={() => onCategorySelect(category)}
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
