import { StyleSheet, View, type ViewProps } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { softShadow, useTheme } from '@/theme/use-theme';

export function Card({ style, elevated = false, ...rest }: ViewProps & { elevated?: boolean }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? colors.cardElevated : colors.card,
          borderColor: colors.border,
        },
        softShadow(colors, isDark, elevated ? 2 : 1),
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
