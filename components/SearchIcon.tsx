import React from 'react';
import { MagnifyingGlass } from 'phosphor-react-native';
import { colors } from '../theme';

const SearchIcon = (): React.ReactElement => (
  <MagnifyingGlass size={24} color={colors.textHigh} weight="regular" />
);

export default SearchIcon;
