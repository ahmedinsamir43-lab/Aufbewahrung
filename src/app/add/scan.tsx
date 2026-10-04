import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useAddParams } from '@/state/use-add-params';
import { useTheme } from '@/theme/use-theme';

/** Platzhalter – der Barcode-Scanner mit Open Food Facts folgt in Schritt 4. */
export default function ScanScreen() {
  const { colors } = useTheme();
  const { date, meal } = useAddParams();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <EmptyState
        icon="barcode_scanner"
        title="Scanner folgt in Kürze"
        text="Der Barcode-Scanner mit der Produktdatenbank Open Food Facts wird im nächsten Update freigeschaltet.">
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
