import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { formatNumber } from '@/domain/format';
import type { Food } from '@/domain/types';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Listeneintrag eines Lebensmittels mit Kalorien pro 100 g und Warnhinweis. */
export function FoodRow({ food, avoided, onPress }: { food: Food; avoided: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.985}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${food.name}${food.brand ? `, ${food.brand}` : ''}, ${formatNumber(food.per100g.kcal)} Kilokalorien pro 100 Gramm${avoided ? ', enthält gemiedenes Lebensmittel' : ''}`}
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.text}>
        <View style={styles.inline}>
          {food.isFavorite ? <Icon name="favorite" size={14} color={colors.fat} /> : null}
          {avoided ? <Icon name="warning" size={16} color={colors.warning} /> : null}
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {food.name}
          </AppText>
        </View>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {[food.brand, `${formatNumber(food.per100g.proteinG, 1)} g Eiweiß`].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <View style={styles.kcal}>
        <AppText variant="bodyStrong">{formatNumber(food.per100g.kcal)}</AppText>
        <AppText variant="caption" color="textTertiary">
          kcal/100 g
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, gap: spacing.xxs },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  kcal: { alignItems: 'flex-end' },
});
