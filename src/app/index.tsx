import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/**
 * Platzhalter für Schritt 1: bestätigt, dass App, Theme und Datenbank-Migration
 * auf dem Gerät funktionieren. Ab Schritt 2 leitet dieser Screen je nach
 * vorhandenem Profil zum Onboarding oder zum Dashboard weiter.
 */
export default function Index() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const [version, setVersion] = useState<number | null>(null);

  useEffect(() => {
    db.getFirstAsync<{ user_version: number }>('PRAGMA user_version').then((row) =>
      setVersion(row?.user_version ?? 0),
    );
  }, [db]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        <Text style={[typography.title, { color: colors.text }]}>Nährwert</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
          Projekt-Grundgerüst läuft.
        </Text>
        <Text style={[typography.caption, { color: colors.accent, marginTop: spacing.md }]}>
          Datenbank-Schema v{version ?? '…'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
});
