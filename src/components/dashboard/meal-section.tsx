import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { findAvoidMatches } from '@/domain/avoid-match';
import { formatNumber } from '@/domain/format';
import { MEAL_LABELS } from '@/domain/meals';
import type { Nutrients } from '@/domain/portion';
import type { LogEntry, Meal } from '@/domain/types';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export const MEAL_ICONS: Record<Meal, IconName> = {
  breakfast: 'free_breakfast',
  lunch: 'lunch_dining',
  dinner: 'dinner_dining',
  snack: 'cookie',
};

function EntryRow({ entry, avoidTerms, onPress }: { entry: LogEntry; avoidTerms: string[]; onPress: () => void }) {
  const { colors } = useTheme();
  const avoided = findAvoidMatches(avoidTerms, entry.name).length > 0;
  const g = (v: number) => formatNumber(v, v < 10 ? 1 : 0);

  return (
    <PressableScale
      scaleTo={0.985}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, ${formatNumber(entry.amountG)} Gramm, ${formatNumber(entry.kcal)} Kilokalorien. Bearbeiten`}
      style={styles.entry}>
      <View style={styles.entryText}>
        <View style={styles.inline}>
          {avoided ? <Icon name="warning" size={16} color={colors.warning} /> : null}
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {entry.name}
          </AppText>
        </View>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {formatNumber(entry.amountG)} g · {g(entry.carbsG)} KH · {g(entry.proteinG)} E · {g(entry.fatG)} F
        </AppText>
        {entry.isEstimate ? (
          <View style={[styles.badge, { backgroundColor: colors.warningSoft }]}>
            <AppText variant="caption" style={{ color: colors.warning, fontSize: 11 }}>
              Schätzung
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="bodyStrong">{formatNumber(entry.kcal)}</AppText>
    </PressableScale>
  );
}

/** Karte einer Mahlzeit mit Einträgen, Summe und „Hinzufügen". */
export function MealSection({
  meal,
  entries,
  totals,
  avoidTerms,
  onAdd,
  onEdit,
}: {
  meal: Meal;
  entries: LogEntry[];
  totals: Nutrients;
  avoidTerms: string[];
  onAdd: () => void;
  onEdit: (entry: LogEntry) => void;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
          <Icon name={MEAL_ICONS[meal]} size={20} color={colors.accent} />
        </View>
        <AppText variant="headline" style={styles.flex}>
          {MEAL_LABELS[meal]}
        </AppText>
        <AppText variant="bodyStrong" color={entries.length ? 'text' : 'textTertiary'}>
          {formatNumber(totals.kcal)} kcal
        </AppText>
      </View>

      {entries.length > 0 ? (
        <View style={[styles.list, { borderTopColor: colors.border }]}>
          {entries.map((e) => (
            <EntryRow key={e.id} entry={e} avoidTerms={avoidTerms} onPress={() => onEdit(e)} />
          ))}
        </View>
      ) : null}

      <PressableScale
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel={`${MEAL_LABELS[meal]}: Lebensmittel hinzufügen`}
        style={[styles.add, { borderColor: colors.border }]}>
        <Icon name="add" size={18} color={colors.accent} />
        <AppText variant="bodyStrong" color="accent">
          Hinzufügen
        </AppText>
      </PressableScale>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs },
  iconWrap: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  list: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.xs },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
  },
  entryText: { flex: 1, gap: spacing.xxs },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
