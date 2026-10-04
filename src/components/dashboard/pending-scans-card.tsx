import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import type { PendingScan } from '@/domain/types';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const STATUS: Record<PendingScan['status'], { icon: IconName; text: (s: PendingScan) => string; action: string }> = {
  pending: { icon: 'cloud_off', text: () => 'Wird abgerufen, sobald du online bist', action: '' },
  resolved: { icon: 'check_circle', text: (s) => s.foodName ?? 'Produkt gefunden', action: 'Portion wählen' },
  not_found: { icon: 'help', text: () => 'Nicht gefunden – bitte selbst anlegen', action: 'Anlegen' },
};

/** Offline zwischengespeicherte Scans, die noch erfasst werden müssen. */
export function PendingScansCard({
  scans,
  onOpen,
  onDiscard,
}: {
  scans: PendingScan[];
  onOpen: (scan: PendingScan) => void;
  onDiscard: (scan: PendingScan) => void;
}) {
  const { colors } = useTheme();
  if (scans.length === 0) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Icon name="barcode_scanner" size={20} color={colors.accent} />
        <AppText variant="headline" style={styles.flex}>
          Gespeicherte Scans
        </AppText>
        <View style={[styles.count, { backgroundColor: colors.accentSoft }]}>
          <AppText variant="caption" color="accent">
            {scans.length}
          </AppText>
        </View>
      </View>
      {scans.map((s) => {
        const st = STATUS[s.status];
        const tone = s.status === 'resolved' ? colors.success : s.status === 'not_found' ? colors.warning : colors.textTertiary;
        return (
          <View key={s.id} style={[styles.row, { borderTopColor: colors.border }]}>
            <PressableScale
              scaleTo={0.985}
              disabled={s.status === 'pending'}
              onPress={() => onOpen(s)}
              accessibilityRole="button"
              accessibilityLabel={`Barcode ${s.barcode}: ${st.text(s)}${st.action ? `. ${st.action}` : ''}`}
              style={styles.main}>
              <Icon name={st.icon} size={20} color={tone} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {st.text(s)}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {s.barcode}
                </AppText>
              </View>
              {st.action ? <Icon name="chevron_right" size={22} color={colors.accent} /> : null}
            </PressableScale>
            <PressableScale
              onPress={() => onDiscard(s)}
              accessibilityRole="button"
              accessibilityLabel={`Scan ${s.barcode} verwerfen`}
              style={styles.discard}>
              <Icon name="close" size={18} color={colors.textTertiary} />
            </PressableScale>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  flex: { flex: 1 },
  count: { minWidth: 24, height: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs, paddingVertical: spacing.sm + spacing.xs },
  discard: { padding: spacing.sm },
});
