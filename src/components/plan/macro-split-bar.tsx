import { StyleSheet, View } from 'react-native';

import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Horizontale, segmentierte Leiste der Energieanteile (Kohlenhydrate / Eiweiß / Fett). */
export function MacroSplitBar({ carbsPct, proteinPct, fatPct }: { carbsPct: number; proteinPct: number; fatPct: number }) {
  const { colors } = useTheme();
  const segments = [
    { pct: carbsPct, color: colors.carbs },
    { pct: proteinPct, color: colors.protein },
    { pct: fatPct, color: colors.fat },
  ].filter((s) => s.pct > 0);

  return (
    <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {segments.map((s, i) => (
        <View key={i} style={{ flex: s.pct, backgroundColor: s.color }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: 8, borderRadius: radius.pill, overflow: 'hidden', gap: 3 },
});
