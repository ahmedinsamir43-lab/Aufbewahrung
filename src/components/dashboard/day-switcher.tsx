import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { haptics } from '@/components/ui/haptics';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { addDays, formatDayLabel, toLocalDate } from '@/domain/dates';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

function DayArrow({ dir, disabled = false, onPress }: { dir: -1 | 1; disabled?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={dir === -1 ? 'Vorheriger Tag' : 'Nächster Tag'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.arrow, { backgroundColor: colors.card, borderColor: colors.border, opacity: disabled ? 0.35 : 1 }]}>
      <Icon name={dir === -1 ? 'chevron_left' : 'chevron_right'} size={22} color={colors.text} />
    </PressableScale>
  );
}

/** Wechsel zwischen Tagen; in die Zukunft kann nicht geblättert werden. */
export function DaySwitcher({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const today = toLocalDate();
  const canForward = date < today;

  const go = (days: number) => {
    haptics.select();
    onChange(addDays(date, days));
  };

  return (
    <View style={styles.row}>
      <DayArrow dir={-1} onPress={() => go(-1)} />
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${formatDayLabel(date, today)}. Zu heute springen`}
        onPress={() => date !== today && onChange(today)}
        style={styles.label}>
        <AppText variant="headline" align="center">
          {formatDayLabel(date, today)}
        </AppText>
      </PressableScale>
      <DayArrow dir={1} disabled={!canForward} onPress={() => go(1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, paddingVertical: spacing.sm },
});
