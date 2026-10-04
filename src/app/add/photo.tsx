import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useAddParams } from '@/state/use-add-params';
import { useTheme } from '@/theme/use-theme';

/** Platzhalter – die Foto-Erkennung über den Backend-Proxy folgt in Schritt 5. */
export default function PhotoScreen() {
  const { colors } = useTheme();
  const { date, meal } = useAddParams();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <EmptyState
        icon="photo_camera"
        title="Foto-Erkennung folgt in Kürze"
        text="Fotografiere bald deine Mahlzeit – die Lebensmittel werden erkannt und dir als bearbeitbarer Vorschlag angezeigt.">
        <Button
          title="Stattdessen suchen"
          icon="search"
          iconPosition="left"
          onPress={() => router.replace({ pathname: '/add/search', params: { date, meal } })}
        />
      </EmptyState>
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, justifyContent: 'center' } });
