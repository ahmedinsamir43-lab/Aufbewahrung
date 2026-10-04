import { useColorScheme } from 'react-native';

import { palette, type ThemeColors } from './tokens';

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const isDark = useColorScheme() === 'dark';
  return { colors: isDark ? palette.dark : palette.light, isDark };
}

/** Weicher, warm getönter Schatten (iOS: shadow*, Android: elevation + shadowColor). */
export function softShadow(colors: ThemeColors, isDark: boolean, level: 1 | 2 = 1) {
  return {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: level === 1 ? 6 : 12 },
    shadowOpacity: isDark ? 0.5 : level === 1 ? 0.07 : 0.1,
    shadowRadius: level === 1 ? 16 : 28,
    elevation: isDark ? 0 : level === 1 ? 3 : 8,
  };
}
