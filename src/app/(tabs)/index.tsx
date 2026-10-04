import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MacroRing } from '@/components/macro-ring';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { formatNumber } from '@/domain/format';
import { useProfileAndPlan } from '@/state/use-profile';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/**
 * Vorläufiges Dashboard (Schritt 2): zeigt den gespeicherten Plan.
 * In Schritt 3 folgen Tagesprotokoll, Mahlzeiten-Gruppen und der „+"-Button.
 */
export default function DashboardScreen() {
  const { colors } = useTheme();
  const state = useProfileAndPlan();
  if (state.status !== 'ready' || !state.profile || !state.plan) return null;
  const { profile, plan } = state;

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AppText variant="caption" color="textSecondary">
            Heute
          </AppText>
          <AppText variant="display">Hallo, {profile.firstName}</AppText>
        </View>

        <Card style={styles.kcalCard}>
          <View style={styles.kcalCol}>
            <AppText variant="caption" color="textSecondary">Gegessen</AppText>
            <AppText variant="title">0</AppText>
          </View>
          <View style={styles.kcalCol}>
            <AppText variant="caption" color="textSecondary">Ziel</AppText>
            <AppText variant="title">{formatNumber(plan.kcalTarget)}</AppText>
          </View>
          <View style={styles.kcalCol}>
            <AppText variant="caption" color="textSecondary">Verbleibend</AppText>
            <AppText variant="title" color="accent">{formatNumber(plan.kcalTarget)}</AppText>
          </View>
        </Card>

        <Card style={styles.rings}>
          <MacroRing label="Kohlenhydrate" consumed={0} target={plan.carbsG} color={colors.carbs} />
          <MacroRing label="Eiweiß" consumed={0} target={plan.proteinG} color={colors.protein} />
          <MacroRing label="Fett" consumed={0} target={plan.fatG} color={colors.fat} />
        </Card>

        <AppText variant="caption" color="textTertiary" align="center">
          Lebensmittel erfassen folgt im nächsten Schritt.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  header: { gap: spacing.xxs, marginBottom: spacing.sm },
  kcalCard: { flexDirection: 'row' },
  kcalCol: { flex: 1, gap: spacing.xxs },
  rings: { flexDirection: 'row', paddingHorizontal: spacing.md },
});
