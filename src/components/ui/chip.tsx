import { StyleSheet } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { haptics } from './haptics';
import { PressableScale } from './pressable-scale';

/** Kleine, auswählbare Pille (Schnellauswahl, Segmente). */
export function Chip({
  label,
  selected = false,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      scaleTo={0.94}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.card,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}>
      <AppText variant="caption" style={{ color: selected ? colors.onAccent : colors.text, fontSize: 14 }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
