import { Redirect } from 'expo-router';
import Tabs from 'expo-router/js-tabs';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { useProfileAndPlan } from '@/state/use-profile';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  const state = useProfileAndPlan();

  if (state.status === 'loading') return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  if (!state.profile) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Heute',
          tabBarIcon: ({ color }) => <Icon name="home" ios="house.fill" color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
