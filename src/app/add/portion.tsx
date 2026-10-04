import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { haptics } from '@/components/ui/haptics';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/notice';
import { PressableScale } from '@/components/ui/pressable-scale';
import { TextField } from '@/components/ui/text-field';
import { getFood, setFavorite } from '@/db/repositories/food';
import { deleteLogEntry, getLogEntry } from '@/db/repositories/log';
import { deleteScan } from '@/db/repositories/pending-scan';
import { getPlanForDate } from '@/db/repositories/plan';
import { getProfile } from '@/db/repositories/profile';
import { findAvoidMatches } from '@/domain/avoid-match';
import { formatInput, formatNumber } from '@/domain/format';
import { MEAL_LABELS, MEALS } from '@/domain/meals';
import { parsePortion, PORTION_LIMITS, scaleNutrients } from '@/domain/portion';
import type { LogEntry, Meal, NutritionPlan, Per100g } from '@/domain/types';
import { changeEntryPortion, logFood } from '@/services/log-service';
import { useAddParams } from '@/state/use-add-params';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface Subject {
  name: string;
  brand: string | null;
  per100g: Per100g;
  defaultPortionG: number | null;
  avoidText: (string | null)[];
  foodId: number | null;
  isFavorite: boolean;
  entry: LogEntry | null;
}

const QUICK_AMOUNTS = [50, 100, 150, 200, 250];
const STEP_G = 10;

/** Portionsgröße wählen; Nährwerte werden live umgerechnet. Auch zum Bearbeiten eines Eintrags. */
export default function PortionScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useAddParams();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [missing, setMissing] = useState(false);
  const [amountText, setAmountText] = useState('100');
  const [meal, setMeal] = useState<Meal>(params.meal);
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [avoidTerms, setAvoidTerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [profile, dayPlan] = await Promise.all([getProfile(db), getPlanForDate(db, params.date)]);
      let s: Subject | null = null;
      if (params.entryId != null) {
        const entry = await getLogEntry(db, params.entryId);
        if (entry && entry.amountG > 0) {
          const f = 100 / entry.amountG;
          s = {
            name: entry.name,
            brand: null,
            per100g: { kcal: entry.kcal * f, carbsG: entry.carbsG * f, proteinG: entry.proteinG * f, fatG: entry.fatG * f },
            defaultPortionG: null,
            avoidText: [entry.name],
            foodId: entry.foodId,
            isFavorite: false,
            entry,
          };
          if (active) {
            setAmountText(formatInput(entry.amountG));
            setMeal(entry.meal);
          }
        }
      } else if (params.foodId != null) {
        const food = await getFood(db, params.foodId);
        if (food) {
          s = {
            name: food.name,
            brand: food.brand,
            per100g: food.per100g,
            defaultPortionG: food.defaultPortionG,
            avoidText: [food.name, food.brand, food.ingredientsText],
            foodId: food.id,
            isFavorite: food.isFavorite,
            entry: null,
          };
          if (active && food.defaultPortionG) setAmountText(formatInput(food.defaultPortionG));
        }
      }
      if (!active) return;
      setAvoidTerms(profile?.avoidFoods ?? []);
      setPlan(dayPlan);
      setSubject(s);
      setMissing(s == null);
    })();
    return () => {
      active = false;
    };
  }, [db, params.date, params.entryId, params.foodId]);

  const amount = parsePortion(amountText);
  const nutrients = useMemo(
    () => (subject ? scaleNutrients(subject.per100g, amount ?? 0) : null),
    [subject, amount],
  );

  if (missing) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Notice tone="danger">Dieser Eintrag existiert nicht mehr.</Notice>
      </View>
    );
  }
  if (!subject || !nutrients) return <View style={[styles.screen, { backgroundColor: colors.background }]} />;

  const isEdit = subject.entry != null;
  const avoided = findAvoidMatches(avoidTerms, ...subject.avoidText);
  const shareOfDay = plan && plan.kcalTarget > 0 ? Math.round((nutrients.kcal / plan.kcalTarget) * 100) : null;

  const setAmount = (g: number) =>
    setAmountText(formatInput(Math.min(PORTION_LIMITS.max, Math.max(PORTION_LIMITS.min, g))));

  const toggleFavorite = async () => {
    if (subject.foodId == null) return;
    const next = !subject.isFavorite;
    haptics.select();
    setSubject({ ...subject, isFavorite: next });
    await setFavorite(db, subject.foodId, next, new Date().toISOString());
  };

  const save = async () => {
    if (amount == null) {
      haptics.error();
      return;
    }
    setSaving(true);
    try {
      if (subject.entry) {
        await changeEntryPortion(db, subject.entry, amount, meal);
      } else if (subject.foodId != null) {
        await logFood(db, { foodId: subject.foodId, amountG: amount, meal, date: params.date });
        if (params.scanId != null) await deleteScan(db, params.scanId);
      }
      haptics.success();
      router.dismissTo('/');
    } catch {
      haptics.error();
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!subject.entry) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      haptics.error();
      return;
    }
    await deleteLogEntry(db, subject.entry.id);
    haptics.success();
    router.dismissTo('/');
  };

  const macro = (label: string, value: number, color: string) => (
    <View style={styles.macro}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="number">{formatNumber(value, value < 10 ? 1 : 0)} g</AppText>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: isEdit ? 'Eintrag bearbeiten' : 'Portion wählen' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <AppText variant="title">{subject.name}</AppText>
            <AppText variant="caption" color="textSecondary">
              {[subject.brand, `${formatNumber(subject.per100g.kcal)} kcal pro 100 g`].filter(Boolean).join(' · ')}
            </AppText>
          </View>
          {!isEdit && subject.foodId != null ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={subject.isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              accessibilityState={{ selected: subject.isFavorite }}
              onPress={toggleFavorite}
              style={[styles.fav, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Icon
                name={subject.isFavorite ? 'favorite' : 'favorite_border'}
                size={22}
                color={subject.isFavorite ? colors.fat : colors.textSecondary}
              />
            </PressableScale>
          ) : null}
        </View>

        {avoided.length > 0 ? (
          <Notice tone="warning" title="Gemiedenes Lebensmittel">
            {`Enthält möglicherweise: ${avoided.join(', ')}. Bitte prüfe die Zutatenliste.`}
          </Notice>
        ) : null}
        {subject.entry?.isEstimate ? (
          <Notice tone="warning" title="Schätzung">
            Dieser Eintrag stammt aus der Foto-Erkennung mit niedriger Sicherheit.
          </Notice>
        ) : null}

        {/* Menge */}
        <Card style={styles.card}>
          <AppText variant="headline">Menge</AppText>
          <View style={styles.amountRow}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`${STEP_G} Gramm weniger`}
              onPress={() => {
                haptics.select();
                setAmount((amount ?? 0) - STEP_G);
              }}
              style={[styles.stepper, { backgroundColor: colors.background }]}>
              <Icon name="remove" size={24} color={colors.text} />
            </PressableScale>
            <View style={styles.flex}>
              <TextField
                large
                value={amountText}
                onChangeText={(t) => setAmountText(t.replace(/[^\d.,]/g, ''))}
                keyboardType="decimal-pad"
                suffix="g"
                maxLength={6}
                invalid={amount == null}
                selectTextOnFocus
                style={styles.amountInput}
                accessibilityLabel="Menge in Gramm"
              />
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`${STEP_G} Gramm mehr`}
              onPress={() => {
                haptics.select();
                setAmount((amount ?? 0) + STEP_G);
              }}
              style={[styles.stepper, { backgroundColor: colors.background }]}>
              <Icon name="add" size={24} color={colors.text} />
            </PressableScale>
          </View>
          {amount == null ? (
            <AppText variant="caption" color="danger">
              Bitte eine Menge zwischen {PORTION_LIMITS.min} und {formatNumber(PORTION_LIMITS.max)} g eingeben.
            </AppText>
          ) : null}
          <View style={styles.chips}>
            {subject.defaultPortionG ? (
              <Chip
                label={`1 Portion · ${formatNumber(subject.defaultPortionG)} g`}
                selected={amount === subject.defaultPortionG}
                onPress={() => setAmount(subject.defaultPortionG!)}
              />
            ) : null}
            {QUICK_AMOUNTS.map((g) => (
              <Chip key={g} label={`${g} g`} selected={amount === g} onPress={() => setAmount(g)} />
            ))}
          </View>
        </Card>

        {/* Mahlzeit */}
        <Card style={styles.card}>
          <AppText variant="headline">Mahlzeit</AppText>
          <View style={styles.chips}>
            {MEALS.map((m) => (
              <Chip key={m} label={MEAL_LABELS[m]} selected={meal === m} onPress={() => setMeal(m)} />
            ))}
          </View>
        </Card>

        {/* Nährwerte */}
        <Card style={styles.card}>
          <View style={styles.kcalRow}>
            <View style={styles.flex}>
              <AppText variant="caption" color="textSecondary">
                Diese Portion
              </AppText>
              <View style={styles.kcalValue}>
                <AppText variant="display" accessibilityLiveRegion="polite">
                  {formatNumber(nutrients.kcal)}
                </AppText>
                <AppText variant="headline" color="textTertiary">
                  kcal
                </AppText>
              </View>
            </View>
            {shareOfDay != null ? (
              <View style={[styles.share, { backgroundColor: colors.accentSoft }]}>
                <AppText variant="bodyStrong" color="accent">
                  {shareOfDay} %
                </AppText>
                <AppText variant="caption" color="accent">
                  vom Tagesziel
                </AppText>
              </View>
            ) : null}
          </View>
          <View style={[styles.macros, { borderTopColor: colors.border }]}>
            {macro('Kohlenhydrate', nutrients.carbsG, colors.carbs)}
            {macro('Eiweiß', nutrients.proteinG, colors.protein)}
            {macro('Fett', nutrients.fatG, colors.fat)}
          </View>
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom, borderTopColor: colors.border }]}>
        <Button
          title={isEdit ? 'Änderungen speichern' : `Zu ${MEAL_LABELS[meal]} hinzufügen`}
          icon="check"
          onPress={save}
          loading={saving}
          disabled={amount == null}
        />
        {isEdit ? (
          <Button
            title={confirmDelete ? 'Wirklich löschen?' : 'Eintrag löschen'}
            variant="ghost"
            icon="delete"
            iconPosition="left"
            onPress={remove}
            style={confirmDelete ? { backgroundColor: colors.dangerSoft } : undefined}
          />
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.md },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  fav: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { gap: spacing.md },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  amountInput: { textAlign: 'center' },
  stepper: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kcalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  kcalValue: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  share: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center' },
  macros: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  macro: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: spacing.xxs },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
