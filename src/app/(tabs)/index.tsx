import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddFab, type AddMethod } from '@/components/dashboard/add-fab';
import { CalorieCard } from '@/components/dashboard/calorie-card';
import { DaySwitcher } from '@/components/dashboard/day-switcher';
import { MealSection } from '@/components/dashboard/meal-section';
import { PendingScansCard } from '@/components/dashboard/pending-scans-card';
import { MacroRing } from '@/components/macro-ring';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { toLocalDate } from '@/domain/dates';
import { MEALS, mealForTime } from '@/domain/meals';
import type { Meal } from '@/domain/types';
import { useDayLog } from '@/state/use-day-log';
import { usePendingScans } from '@/state/use-pending-scans';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

function greeting(date: Date): string {
  const h = date.getHours();
  if (h < 11) return 'Guten Morgen';
  if (h < 18) return 'Hallo';
  return 'Guten Abend';
}

const enter = (i: number) => FadeInDown.delay(i * 60).duration(380);

export default function DashboardScreen() {
  const { colors } = useTheme();
  const [date, setDate] = useState(toLocalDate);
  const data = useDayLog(date);
  const pending = usePendingScans();

  const openAdd = (method: AddMethod, meal?: Meal) => {
    const params = { date, meal: meal ?? (date === toLocalDate() ? mealForTime(new Date()) : 'snack') };
    router.push({ pathname: `/add/${method}`, params });
  };

  if (!data) return <View style={[styles.screen, { backgroundColor: colors.background }]} />;
  const { plan, profile, totals, entries } = data;
  const t = totals.total;

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enter(0)} style={styles.header}>
          <AppText variant="caption" color="textSecondary">
            {greeting(new Date())}
          </AppText>
          <AppText variant="display">{profile?.firstName ?? 'Willkommen'}</AppText>
        </Animated.View>

        <DaySwitcher date={date} onChange={setDate} />

        <PendingScansCard
          scans={pending.scans}
          onDiscard={(scan) => pending.discard(scan.id)}
          onOpen={(scan) =>
            scan.status === 'resolved' && scan.foodId != null
              ? router.push({
                  pathname: '/add/portion',
                  params: { foodId: String(scan.foodId), scanId: String(scan.id), date: scan.date, meal: scan.meal },
                })
              : router.push({
                  pathname: '/add/manual',
                  params: { barcode: scan.barcode, scanId: String(scan.id), date: scan.date, meal: scan.meal },
                })
          }
        />

        {plan ? (
          <>
            <Animated.View entering={enter(1)}>
              <CalorieCard eaten={t.kcal} target={plan.kcalTarget} />
            </Animated.View>
            <Animated.View entering={enter(2)}>
              <Card style={styles.rings}>
                <MacroRing label="Kohlenhydrate" consumed={t.carbsG} target={plan.carbsG} color={colors.carbs} />
                <MacroRing label="Eiweiß" consumed={t.proteinG} target={plan.proteinG} color={colors.protein} delayMs={100} />
                <MacroRing label="Fett" consumed={t.fatG} target={plan.fatG} color={colors.fat} delayMs={200} />
              </Card>
            </Animated.View>
          </>
        ) : (
          <Card>
            <AppText variant="body" color="textSecondary">
              Für diesen Tag gibt es noch keinen Plan.
            </AppText>
          </Card>
        )}

        {MEALS.map((meal, i) => (
          <Animated.View key={meal} entering={enter(3 + i)}>
            <MealSection
              meal={meal}
              entries={entries.filter((e) => e.meal === meal)}
              totals={totals.byMeal[meal]}
              avoidTerms={profile?.avoidFoods ?? []}
              onAdd={() => openAdd('search', meal)}
              onEdit={(entry) =>
                router.push({ pathname: '/add/portion', params: { entryId: String(entry.id), date } })
              }
            />
          </Animated.View>
        ))}
      </ScrollView>

      <AddFab onSelect={(m) => openAdd(m)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  header: { gap: spacing.xxs },
  rings: { flexDirection: 'row', paddingHorizontal: spacing.md },
});
