import { Text, type TextProps } from 'react-native';

import { typography, type ThemeColors, type TypographyVariant } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: keyof ThemeColors;
  align?: 'left' | 'center' | 'right';
};

export function AppText({ variant = 'body', color = 'text', align, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[typography[variant], { color: colors[color] }, align && { textAlign: align }, style]}
      {...rest}
    />
  );
}
