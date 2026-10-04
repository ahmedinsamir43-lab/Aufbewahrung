import { Stack } from 'expo-router';

import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function AddLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 18 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="search" options={{ title: 'Lebensmittel suchen' }} />
      <Stack.Screen name="manual" options={{ title: 'Neues Lebensmittel' }} />
      <Stack.Screen name="portion" options={{ title: 'Portion' }} />
      <Stack.Screen name="scan" options={{ title: 'Barcode scannen', headerShown: false }} />
      <Stack.Screen name="photo" options={{ title: 'Foto-Erkennung' }} />
    </Stack>
  );
}
