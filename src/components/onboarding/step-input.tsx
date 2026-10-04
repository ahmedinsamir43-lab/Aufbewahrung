import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { OptionCard } from '@/components/ui/option-card';
import { TextField } from '@/components/ui/text-field';
import {
  ACTIVITY_OPTIONS,
  DIET_OPTIONS,
  GOAL_OPTIONS,
  paceOptions,
  SEX_OPTIONS,
  type Option,
} from '@/content/labels';
import { parseAvoidFoods, type OnboardingDraft, type StepId } from '@/domain/onboarding';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface Props {
  step: StepId;
  draft: OnboardingDraft;
  invalid: boolean;
  update: (patch: Partial<OnboardingDraft>) => void;
  onSubmit: () => void;
}

function Options<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: Option<T>[];
  value: T | null;
  onSelect: (v: T) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" style={styles.options}>
      {options.map((o) => (
        <OptionCard
          key={o.value}
          title={o.title}
          help={o.help}
          icon={o.icon}
          selected={value === o.value}
          onPress={() => onSelect(o.value)}
        />
      ))}
    </View>
  );
}

/** Eingabeelement für den jeweiligen Interview-Schritt. */
export function StepInput({ step, draft, invalid, update, onSubmit }: Props) {
  const { colors } = useTheme();
  const numberField = (key: 'age' | 'height' | 'weight' | 'targetWeight', suffix: string, placeholder: string) => (
    <TextField
      large
      autoFocus
      invalid={invalid}
      value={draft[key]}
      onChangeText={(t) => update({ [key]: t.replace(/[^\d.,]/g, '') })}
      keyboardType={key === 'age' ? 'number-pad' : 'decimal-pad'}
      placeholder={placeholder}
      suffix={suffix}
      maxLength={5}
      returnKeyType="next"
      onSubmitEditing={onSubmit}
      accessibilityLabel={suffix === 'Jahre' ? 'Alter in Jahren' : `Wert in ${suffix}`}
    />
  );

  switch (step) {
    case 'firstName':
      return (
        <TextField
          large
          autoFocus
          invalid={invalid}
          value={draft.firstName}
          onChangeText={(t) => update({ firstName: t })}
          placeholder="Vorname"
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          maxLength={40}
          returnKeyType="next"
          onSubmitEditing={onSubmit}
          accessibilityLabel="Vorname"
        />
      );
    case 'age':
      return numberField('age', 'Jahre', '30');
    case 'sex':
      return <Options options={SEX_OPTIONS} value={draft.sex} onSelect={(sex) => update({ sex })} />;
    case 'height':
      return numberField('height', 'cm', '175');
    case 'weight':
      return numberField('weight', 'kg', '72,5');
    case 'goal':
      return <Options options={GOAL_OPTIONS} value={draft.goal} onSelect={(goal) => update({ goal })} />;
    case 'targetWeight':
      return (
        <View style={styles.stack}>
          {numberField('targetWeight', 'kg', draft.goal === 'gain' ? '78' : '68')}
          <AppText variant="caption" color="textSecondary">
            Aktuell: {draft.weight || '–'} kg
          </AppText>
        </View>
      );
    case 'activityLevel':
      return (
        <Options
          options={ACTIVITY_OPTIONS}
          value={draft.activityLevel}
          onSelect={(activityLevel) => update({ activityLevel })}
        />
      );
    case 'pace':
      return (
        <Options options={paceOptions(draft.goal)} value={draft.pace} onSelect={(pace) => update({ pace })} />
      );
    case 'dietStyle':
      return (
        <Options options={DIET_OPTIONS} value={draft.dietStyle} onSelect={(dietStyle) => update({ dietStyle })} />
      );
    case 'notes': {
      const terms = parseAvoidFoods(draft.avoidFoods);
      return (
        <View style={styles.stack}>
          <AppText variant="headline">Lebensmittel, die du meiden möchtest</AppText>
          <TextField
            value={draft.avoidFoods}
            onChangeText={(t) => update({ avoidFoods: t })}
            placeholder="z. B. Erdnüsse, Laktose"
            autoCapitalize="sentences"
            accessibilityLabel="Lebensmittel, die du meiden möchtest"
          />
          <AppText variant="caption" color="textSecondary">
            Mehrere Einträge mit Komma trennen.
          </AppText>
          {terms.length > 0 ? (
            <View style={styles.chips}>
              {terms.map((t) => (
                <View key={t} style={[styles.chip, { backgroundColor: colors.warningSoft }]}>
                  <AppText variant="caption" style={{ color: colors.warning }}>
                    {t}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}

          <AppText variant="headline" style={{ marginTop: spacing.md }}>
            Gesundheitliche Notiz
          </AppText>
          <TextField
            invalid={invalid}
            value={draft.healthNote}
            onChangeText={(t) => update({ healthNote: t })}
            placeholder="z. B. Diabetes, Schwangerschaft, Medikamente"
            multiline
            maxLength={500}
            style={styles.multiline}
            accessibilityLabel="Gesundheitliche Notiz"
          />
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  options: { gap: spacing.sm + spacing.xs },
  stack: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.sm + spacing.xs, paddingVertical: spacing.xs, borderRadius: radius.pill },
  multiline: { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing.md },
});
