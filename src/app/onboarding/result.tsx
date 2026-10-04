import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanSummary } from '@/components/plan/plan-summary';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { haptics } from '@/components/ui/haptics';
import { Notice } from '@/components/ui/notice';
import { draftToProfile } from '@/domain/onboarding';
import { calculatePlan } from '@/domain/nutrition-plan';
import { saveProfileAndPlan } from '@/services/profile-service';
import { useOnboarding } from '@/state/onboarding-context';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function ResultScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const { draft, setStep } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const conversion = useMemo(() => draftToProfile(draft), [draft]);
  const plan = useMemo(() => (conversion.ok ? calculatePlan(conversion.profile) : null), [conversion]);

  // Sollte nur bei unvollständigem Entwurf auftreten: zurück zur ersten fehlerhaften Frage.
  useEffect(() => {
    if (conversion.ok) return;
    setStep(conversion.step);
    if (router.canGoBack()) router.back();
    else router.replace('/onboarding');
  }, [conversion, setStep]);

  if (!conversion.ok || !plan) return null;
  const { profile } = conversion;

  const accept = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveProfileAndPlan(db, profile);
      haptics.success();
      router.replace('/');
    } catch {
      setSaveError('Der Plan konnte nicht gespeichert werden. Bitte versuche es erneut.');
      haptics.error();
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <AppText variant="overline" color="accent">
            DEIN PERSÖNLICHER PLAN
          </AppText>
          <AppText variant="display" accessibilityRole="header">
            Alles bereit, {profile.firstName}.
          </AppText>
          <AppText variant="body" color="textSecondary">
            Berechnet aus deinen Angaben nach der Mifflin-St-Jeor-Formel. Du kannst alles später in
            den Einstellungen ändern.
          </AppText>
        </Animated.View>

        <PlanSummary plan={plan} profile={profile} />

        {saveError ? <Notice tone="danger">{saveError}</Notice> : null}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <Button title="Plan übernehmen" icon="check" onPress={accept} loading={saving} />
        <Button title="Angaben ändern" variant="ghost" onPress={() => router.back()} disabled={saving} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: spacing.sm },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
