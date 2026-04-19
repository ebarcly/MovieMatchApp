import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '../theme';

interface CategoryButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    minHeight: 44,
    minWidth: 44,
  },
  text: {
    ...typography.label,
    color: colors.textSecondary,
  },
  activeButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  activeText: {
    color: colors.accentForeground,
  },
});

const CategoryButton = ({
  label,
  isActive,
  onPress,
}: CategoryButtonProps): React.ReactElement => {
  return (
    <TouchableOpacity
      style={[styles.button, isActive && styles.activeButton]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} category`}
      accessibilityState={{ selected: isActive }}
    >
      <Text style={[styles.text, isActive && styles.activeText]}>{label}</Text>
    </TouchableOpacity>
  );
};

export default CategoryButton;
