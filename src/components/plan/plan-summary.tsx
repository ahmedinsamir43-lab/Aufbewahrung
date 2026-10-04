import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { MacroRing } from '@/components/macro-ring';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/notice';
import { approxMonths, formatNumber, formatSigned, formatWeeks } from '@/domain/format';
import { MIN_KCAL, type PlanResult } from '@/domain/nutrition-plan';
import type { Profile } from '@/domain/types';
import { radius, spacing } from '@/theme/tokens';
import { softShadow, useTheme } from '@/theme/use-theme';

import { MacroSplitBar } from './macro-split-bar';

const enter = (i: number) => FadeInDown.delay(80 + i * 90).duration(420);

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" style={styles.onAccentMuted}>
        {label}
      </AppText>
      <AppText variant="headline" style={styles.onAccent}>
        {value} <AppText variant="caption" style={styles.onAccentMuted}>{unit}</AppText>
      </AppText>
    </View>
  );
}

/** Darstellung eines berechneten Plans (Ergebnis-Screen, später auch Einstellungen). */
export function PlanSummary({ plan, profile }: { plan: PlanResult; profile: Omit<Profile, 'updatedAt'> }) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.stack}>
      {/* Kalorienziel */}
      <Animated.View entering={enter(0)}>
        <View style={[styles.hero, { backgroundColor: colors.hero }, softShadow(colors, isDark, 2)]}>
          <View style={styles.heroTop}>
            <Icon name="local_fire_department" size={20} color="rgba(255,255,255,0.85)" />
            <AppText variant="bodyStrong" style={[styles.onAccentMuted, styles.flex]}>
              Tägliches Kalorienziel
            </AppText>
            {plan.dailyKcalDelta !== 0 ? (
              <View style={styles.deltaPill}>
                <AppText variant="caption" style={styles.onAccent}>
                  {formatSigned(plan.dailyKcalDelta)} kcal/Tag
                </AppText>
              </View>
            ) : null}
          </View>
          <View style={styles.heroValue}>
            <AppText variant="hero" style={styles.onAccent} accessibilityLabel={`${plan.kcalTarget} Kilokalorien pro Tag`}>
              {formatNumber(plan.kcalTarget)}
            </AppText>
            <AppText variant="title" style={styles.onAccentMuted}>
              kcal
            </AppText>
          </View>
          <View style={[styles.statsRow, { borderTopColor: 'rgba(255,255,255,0.2)' }]}>
            <Stat label="Grundumsatz" value={formatNumber(plan.bmr)} unit="kcal" />
            <Stat label="Gesamtumsatz" value={formatNumber(plan.tdee)} unit="kcal" />
          </View>
        </View>
      </Animated.View>

      {plan.floorApplied ? (
        <Animated.View entering={enter(1)}>
          <Notice tone="warning" title="Untergrenze angewendet">
            {`Rechnerisch ergäben sich ${formatNumber(plan.kcalBeforeFloor)} kcal. Dein Ziel liegt nie unter ${
              plan.floorReason === 'bmr'
                ? `deinem Grundumsatz (${formatNumber(plan.bmr)} kcal)`
                : `${formatNumber(MIN_KCAL[profile.sex])} kcal`
            }, deshalb wurde es auf ${formatNumber(plan.kcalTarget)} kcal angehoben.`}
          </Notice>
        </Animated.View>
      ) : null}

      {/* Makros */}
      <Animated.View entering={enter(2)}>
        <Card style={[styles.cardGap, styles.ringCard]}>
          <AppText variant="title" style={styles.ringCardTitle}>
            Deine Makros
          </AppText>
          <View style={styles.rings}>
            <MacroRing
              label="Kohlenhydrate"
              consumed={plan.carbsG}
              target={plan.carbsG}
              color={colors.carbs}
              centerValue={`${plan.carbsG}`}
              centerCaption="g"
              footer={`${plan.carbsPct} %`}
              delayMs={250}
            />
            <MacroRing
              label="Eiweiß"
              consumed={plan.proteinG}
              target={plan.proteinG}
              color={colors.protein}
              centerValue={`${plan.proteinG}`}
              centerCaption="g"
              footer={`${plan.proteinPct} %`}
              delayMs={400}
            />
            <MacroRing
              label="Fett"
              consumed={plan.fatG}
              target={plan.fatG}
              color={colors.fat}
              centerValue={`${plan.fatG}`}
              centerCaption="g"
              footer={`${plan.fatPct} %`}
              delayMs={550}
            />
          </View>
          <View style={styles.ringCardTitle}>
            <MacroSplitBar carbsPct={plan.carbsPct} proteinPct={plan.proteinPct} fatPct={plan.fatPct} />
          </View>
          {plan.proteinReferenceKg !== profile.weightKg ? (
            <AppText variant="caption" color="textSecondary" style={styles.ringCardTitle}>
              Eiweiß bezogen auf {formatNumber(plan.proteinReferenceKg, 1)} kg Referenzgewicht (BMI über 30).
            </AppText>
          ) : null}
        </Card>
      </Animated.View>

      {plan.macroConflict ? (
        <Notice tone="warning" title="Makros angepasst">
          Eiweiß und der feste Makroanteil übersteigen zusammen dein Kalorienziel. Der verbleibende
          Makronährstoff wurde auf 0 g begrenzt.
        </Notice>
      ) : null}

      {/* Weg zum Ziel */}
      {profile.goal !== 'maintain' && profile.targetWeightKg != null ? (
        <Animated.View entering={enter(3)}>
          <Card style={styles.goalCard}>
            <View style={[styles.goalIcon, { backgroundColor: colors.accentSoft }]}>
              <Icon name="flag" size={24} color={colors.accent} />
            </View>
            <View style={styles.flex}>
              <AppText variant="caption" color="textSecondary">
                Geschätzte Dauer bis {formatNumber(profile.targetWeightKg, 1)} kg
              </AppText>
              <AppText variant="title">
                {plan.estimatedWeeksToTarget != null
                  ? `≈ ${formatWeeks(plan.estimatedWeeksToTarget)}`
                  : 'nicht schätzbar'}
              </AppText>
              {plan.estimatedWeeksToTarget != null && approxMonths(plan.estimatedWeeksToTarget) ? (
                <AppText variant="bodyStrong" color="textSecondary">
                  {approxMonths(plan.estimatedWeeksToTarget)}
                </AppText>
              ) : null}
              <AppText variant="caption" color="textTertiary" style={styles.goalNote}>
                Faustregel: 7.700 kcal ≈ 1 kg Körpergewicht. Die tatsächliche Dauer ist meist länger,
                weil sich der Energiebedarf anpasst.
              </AppText>
            </View>
          </Card>
        </Animated.View>
      ) : null}

      {/* Notizen */}
      {profile.avoidFoods.length > 0 ? (
        <Animated.View entering={enter(4)}>
          <Card style={styles.cardGap}>
            <View style={styles.inline}>
              <Icon name="block" size={20} color={colors.warning} />
              <AppText variant="headline">Gemiedene Lebensmittel</AppText>
            </View>
            <View style={styles.chips}>
              {profile.avoidFoods.map((t) => (
                <View key={t} style={[styles.chip, { backgroundColor: colors.warningSoft }]}>
                  <AppText variant="caption" style={{ color: colors.warning }}>
                    {t}
                  </AppText>
                </View>
              ))}
            </View>
            <AppText variant="caption" color="textSecondary">
              Werden beim Erfassen mit einem Warnhinweis markiert.
            </AppText>
          </Card>
        </Animated.View>
      ) : null}

      {profile.healthNote ? (
        <Animated.View entering={enter(5)} style={styles.cardGap}>
          <Notice tone="danger" title="Bitte ärztlich abklären">
            {`Du hast eine gesundheitliche Notiz angegeben: „${profile.healthNote}“. Bitte besprich deinen Plan mit einer Ärztin oder einem Arzt, bevor du ihn umsetzt.`}
          </Notice>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  flex: { flex: 1 },
  hero: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  heroValue: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, gap: spacing.xxs },
  deltaPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + spacing.xxs,
    paddingVertical: spacing.xxs + 1,
  },
  onAccent: { color: '#FFFFFF' },
  onAccentMuted: { color: 'rgba(255,255,255,0.78)' },
  cardGap: { gap: spacing.md },
  ringCard: { paddingHorizontal: spacing.md },
  ringCardTitle: { paddingHorizontal: spacing.sm },
  rings: { flexDirection: 'row' },
  goalCard: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  goalIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  goalNote: { marginTop: spacing.xs },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.sm + spacing.xs, paddingVertical: spacing.xs, borderRadius: radius.pill },
});
