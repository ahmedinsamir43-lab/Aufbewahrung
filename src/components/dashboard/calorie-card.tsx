import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { formatNumber } from '@/domain/format';
import { kcalBalance } from '@/domain/portion';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Kalorien: gegessen / Ziel / verbleibend, mit Fortschrittsleiste. */
export function CalorieCard({ eaten, target }: { eaten: number; target: number }) {
  const { colors } = useTheme();
  const balance = kcalBalance(eaten, target);
  const isOver = balance.over > 0;

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View>
          <AppText variant="caption" color="textSecondary">
            {isOver ? 'Über dem Ziel' : 'Verbleibend'}
          </AppText>
          <View style={styles.big}>
            <AppText
              variant="hero"
              style={{ fontSize: 44, lineHeight: 50, color: isOver ? colors.over : colors.text }}
              accessibilityLabel={`${isOver ? balance.over : balance.remaining} Kilokalorien ${isOver ? 'über dem Ziel' : 'verbleibend'}`}>
              {formatNumber(isOver ? balance.over : balance.remaining)}
            </AppText>
            <AppText variant="headline" color="textTertiary">
              kcal
            </AppText>
          </View>
        </View>
      </View>
      <ProgressBar progress={balance.fraction} height={10} color={isOver ? colors.over : colors.accent} />
      <View style={styles.row}>
        <View style={styles.col}>
          <AppText variant="caption" color="textSecondary">
            Gegessen
          </AppText>
          <AppText variant="number">{formatNumber(eaten)}</AppText>
        </View>
        <View style={[styles.col, styles.right]}>
          <AppText variant="caption" color="textSecondary">
            Ziel
          </AppText>
          <AppText variant="number">{formatNumber(target)}</AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  big: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  row: { flexDirection: 'row' },
  col: { flex: 1, gap: spacing.xxs },
  right: { alignItems: 'flex-end' },
});
