import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { haptics } from '@/components/ui/haptics';
import { LabeledField } from '@/components/ui/labeled-field';
import { Notice } from '@/components/ui/notice';
import { insertFood } from '@/db/repositories/food';
import { EMPTY_FOOD_DRAFT, validateFood, type FoodDraft, type FoodField } from '@/domain/food-validation';
import { useAddParams } from '@/state/use-add-params';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Manuelles Anlegen eines Lebensmittels (Angaben pro 100 g von der Verpackung). */
export default function ManualFoodScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { date, meal, query } = useAddParams();
  const [draft, setDraft] = useState<FoodDraft>({ ...EMPTY_FOOD_DRAFT, name: query });
  const [errors, setErrors] = useState<Partial<Record<FoodField, string>>>({});
  const [warning, setWarning] = useState<string | null>(null);
  const [acceptedWarning, setAcceptedWarning] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field: FoodField) => (value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    setAcceptedWarning(false);
    setWarning(null);
  };

  const save = async () => {
    const result = validateFood(draft);
    if (!result.ok) {
      setErrors(result.errors);
      haptics.error();
      return;
    }
    if (result.warning && !acceptedWarning) {
      setWarning(result.warning);
      setAcceptedWarning(true);
      haptics.error();
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const id = await insertFood(db, { source: 'manual', ...result.food }, now);
      router.replace({ pathname: '/add/portion', params: { foodId: String(id), date, meal } });
    } catch {
      setSaving(false);
      setWarning('Speichern fehlgeschlagen. Bitte versuche es erneut.');
    }
  };

  const numeric = { keyboardType: 'decimal-pad' as const, maxLength: 6 };

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <LabeledField label="Name" value={draft.name} onChangeText={set('name')} error={errors.name} autoFocus={!query} placeholder="z. B. Skyr Natur" maxLength={80} />
          <LabeledField label="Marke (optional)" value={draft.brand} onChangeText={set('brand')} placeholder="z. B. Arla" maxLength={60} />
        </Card>

        <Card style={styles.card}>
          <View>
            <AppText variant="headline">Nährwerte pro 100 g</AppText>
            <AppText variant="caption" color="textSecondary">
              Steht auf der Verpackung in der Nährwerttabelle.
            </AppText>
          </View>
          <LabeledField label="Energie" suffix="kcal" value={draft.kcal} onChangeText={set('kcal')} error={errors.kcal} placeholder="0" autoFocus={!!query} {...numeric} />
          <View style={styles.grid}>
            <LabeledField style={styles.cell} label="Kohlenhydrate" suffix="g" value={draft.carbs} onChangeText={set('carbs')} error={errors.carbs} placeholder="0" {...numeric} />
            <LabeledField style={styles.cell} label="Eiweiß" suffix="g" value={draft.protein} onChangeText={set('protein')} error={errors.protein} placeholder="0" {...numeric} />
          </View>
          <LabeledField label="Fett" suffix="g" value={draft.fat} onChangeText={set('fat')} error={errors.fat} placeholder="0" {...numeric} />
        </Card>

        <Card style={styles.card}>
          <LabeledField
            label="Übliche Portion (optional)"
            suffix="g"
            value={draft.defaultPortion}
            onChangeText={set('defaultPortion')}
            error={errors.defaultPortion}
            placeholder="z. B. 150"
            {...numeric}
          />
        </Card>

        {warning ? <Notice tone="warning" title="Bitte prüfen">{warning}</Notice> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom, borderTopColor: colors.border }]}>
        <Button
          title={warning && acceptedWarning ? 'Trotzdem speichern' : 'Speichern & weiter'}
          icon="check"
          onPress={save}
          loading={saving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.md },
  grid: { flexDirection: 'row', gap: spacing.md },
  cell: { flex: 1 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
