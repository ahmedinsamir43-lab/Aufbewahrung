import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { haptics } from './haptics';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

type Variant = 'primary' | 'secondary' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconPosition = 'right',
  disabled = false,
  loading = false,
  style,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.accent, fg: colors.onAccent, border: colors.accent },
    secondary: { bg: colors.card, fg: colors.text, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: colors.accent, border: 'transparent' },
  }[variant];

  const iconNode = icon ? <Icon name={icon} size={20} color={palette.fg} /> : null;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {iconPosition === 'left' && iconNode}
          <AppText variant="bodyStrong" style={{ color: palette.fg }}>
            {title}
          </AppText>
          {iconPosition === 'right' && iconNode}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
