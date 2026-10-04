import { Stack } from 'expo-router';

import { OnboardingProvider } from '@/state/onboarding-context';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }} />
    </OnboardingProvider>
  );
}
