import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StepInput } from '@/components/onboarding/step-input';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { haptics } from '@/components/ui/haptics';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { QUESTIONS } from '@/content/onboarding-questions';
import { nextStep, previousStep, progressOf, validateStep, visibleSteps } from '@/domain/onboarding';
import { useOnboarding } from '@/state/onboarding-context';
import { motion, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { loaded, step, draft, setStep, update } = useOnboarding();
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const steps = visibleSteps(draft);
  const index = steps.indexOf(step);
  const question = QUESTIONS[step];
  const isLast = nextStep(step, draft) === null;

  const goBack = () => {
    const prev = previousStep(step, draft);
    if (!prev) return false;
    setError(null);
    setDirection('back');
    setStep(prev);
    return true;
  };

  const goNext = () => {
    const validation = validateStep(step, draft);
    if (validation) {
      setError(validation);
      haptics.error();
      return;
    }
    setError(null);
    const next = nextStep(step, draft);
    if (next) {
      setDirection('forward');
      setStep(next);
    } else {
      router.push('/onboarding/result');
    }
  };

  // Android-Zurück-Taste führt zur vorherigen Frage statt die App zu verlassen –
  // nur solange dieser Screen fokussiert ist (nicht unter dem Ergebnis-Screen).
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, draft]),
  );

  if (!loaded) return <View style={[styles.screen, { backgroundColor: colors.background }]} />;

  const entering = (direction === 'forward' ? FadeInRight : FadeInLeft)
    .duration(motion.stepDurationMs)
    .withInitialValues({ transform: [{ translateX: direction === 'forward' ? 24 : -24 }] });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <AppText variant="overline" color="accent">
              NÄHRWERT
            </AppText>
            <AppText variant="caption" color="textSecondary">
              Frage {index + 1} von {steps.length}
            </AppText>
          </View>
          <ProgressBar progress={progressOf(step, draft)} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View key={step} entering={entering} style={styles.question}>
            <View style={styles.titleBlock}>
              <AppText variant="display" accessibilityRole="header">
                {question.title(draft.firstName.trim())}
              </AppText>
              {question.help ? (
                <AppText variant="body" color="textSecondary">
                  {question.help}
                </AppText>
              ) : null}
            </View>

            <StepInput
              step={step}
              draft={draft}
              invalid={error != null}
              update={(patch) => {
                if (error) setError(null);
                update(patch);
              }}
              onSubmit={goNext}
            />

            {error ? (
              <Animated.View entering={FadeIn.duration(180)} style={styles.error} accessibilityLiveRegion="polite">
                <Icon name="error" size={18} color={colors.danger} />
                <AppText variant="caption" color="danger" style={styles.flex}>
                  {error}
                </AppText>
              </Animated.View>
            ) : null}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {index > 0 ? (
            <Button
              title="Zurück"
              variant="secondary"
              icon="arrow_back"
              iconPosition="left"
              onPress={goBack}
              style={styles.backButton}
            />
          ) : null}
          <Button
            title={isLast ? 'Plan berechnen' : 'Weiter'}
            icon={isLast ? 'check' : 'arrow_forward'}
            onPress={goNext}
            style={styles.flex}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm + spacing.xs },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  content: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  question: { gap: spacing.xl },
  titleBlock: { gap: spacing.sm },
  error: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: -spacing.md },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  backButton: { paddingHorizontal: spacing.md + spacing.xs },
});
