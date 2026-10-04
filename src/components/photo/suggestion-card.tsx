import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { haptics } from '@/components/ui/haptics';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { TextField } from '@/components/ui/text-field';
import { formatInput, formatNumber } from '@/domain/format';
import { parsePortion, scaleNutrients } from '@/domain/portion';
import { confidenceLabel, isLowConfidence, itemPer100g, type RecognitionItem } from '@/domain/recognition';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export interface Suggestion {
  key: string;
  item: RecognitionItem;
  name: string;
  gramsText: string;
  selected: boolean;
}

/** Bearbeitbarer Vorschlag der Foto-Erkennung: Name, Menge (live umgerechnet), Konfidenz. */
export function SuggestionCard({
  suggestion,
  avoided,
  onChange,
}: {
  suggestion: Suggestion;
  avoided: string[];
  onChange: (s: Suggestion) => void;
}) {
  const { colors } = useTheme();
  const { item, selected } = suggestion;
  const grams = parsePortion(suggestion.gramsText);
  const n = scaleNutrients(itemPer100g(item), grams ?? 0);
  const low = isLowConfidence(item);
  const level = confidenceLabel(item.konfidenz);
  const badge = {
    hoch: { bg: colors.successSoft, fg: colors.success, text: 'Sicher' },
    mittel: { bg: colors.accentSoft, fg: colors.accent, text: 'Wahrscheinlich' },
    niedrig: { bg: colors.warningSoft, fg: colors.warning, text: 'Schätzung · unsicher' },
  }[level];

  const step = (delta: number) => {
    haptics.select();
    const next = Math.min(3000, Math.max(1, (grams ?? 0) + delta));
    onChange({ ...suggestion, gramsText: formatInput(next) });
  };

  return (
    <Card style={[styles.card, !selected && styles.deselected, low && selected && { borderColor: colors.warning, borderWidth: 1.5 }]}>
      <View style={styles.head}>
        <PressableScale
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected }}
          accessibilityLabel={`${suggestion.name} übernehmen`}
          onPress={() => {
            haptics.select();
            onChange({ ...suggestion, selected: !selected });
          }}
          style={[
            styles.check,
            { borderColor: selected ? colors.accent : colors.borderStrong, backgroundColor: selected ? colors.accent : 'transparent' },
          ]}>
          {selected ? <Icon name="check" size={16} color={colors.onAccent} /> : null}
        </PressableScale>
        <View style={styles.flex}>
          <TextField
            value={suggestion.name}
            onChangeText={(name) => onChange({ ...suggestion, name })}
            maxLength={80}
            editable={selected}
            accessibilityLabel="Bezeichnung"
            style={styles.nameInput}
          />
        </View>
      </View>

      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <AppText variant="caption" style={{ color: badge.fg }}>
            {badge.text} · {Math.round(item.konfidenz * 100)} %
          </AppText>
        </View>
        {avoided.length > 0 ? (
          <View style={[styles.badge, styles.inline, { backgroundColor: colors.warningSoft }]}>
            <Icon name="warning" size={14} color={colors.warning} />
            <AppText variant="caption" style={{ color: colors.warning }}>
              {avoided.join(', ')}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.amountRow}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="10 Gramm weniger"
          disabled={!selected}
          onPress={() => step(-10)}
          style={[styles.stepper, { backgroundColor: colors.background }]}>
          <Icon name="remove" size={20} color={colors.text} />
        </PressableScale>
        <View style={styles.flex}>
          <TextField
            value={suggestion.gramsText}
            onChangeText={(t) => onChange({ ...suggestion, gramsText: t.replace(/[^\d.,]/g, '') })}
            keyboardType="decimal-pad"
            suffix="g"
            maxLength={5}
            invalid={selected && grams == null}
            editable={selected}
            selectTextOnFocus
            style={styles.amount}
            accessibilityLabel={`Menge ${suggestion.name} in Gramm`}
          />
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="10 Gramm mehr"
          disabled={!selected}
          onPress={() => step(10)}
          style={[styles.stepper, { backgroundColor: colors.background }]}>
          <Icon name="add" size={20} color={colors.text} />
        </PressableScale>
      </View>

      <View style={[styles.nutrients, { borderTopColor: colors.border }]}>
        <AppText variant="bodyStrong">{formatNumber(n.kcal)} kcal</AppText>
        <AppText variant="caption" color="textSecondary">
          {formatNumber(n.carbsG)} g KH · {formatNumber(n.proteinG)} g E · {formatNumber(n.fatG)} g F
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm + spacing.xs },
  deselected: { opacity: 0.5 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs },
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  nameInput: { fontFamily: fonts.semibold },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepper: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  amount: { textAlign: 'center' },
  nutrients: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, gap: 2 },
});
