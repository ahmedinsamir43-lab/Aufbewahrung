import { useColorScheme } from 'react-native';

import { palette, type ThemeColors } from './tokens';

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const isDark = useColorScheme() === 'dark';
  return { colors: isDark ? palette.dark : palette.light, isDark };
}
