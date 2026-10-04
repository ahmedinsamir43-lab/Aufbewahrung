import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FoodRow } from '@/components/food/food-row';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import { getProfile } from '@/db/repositories/profile';
import { recentFoods, searchFoods } from '@/db/repositories/food';
import { findAvoidMatches } from '@/domain/avoid-match';
import { MEAL_LABELS } from '@/domain/meals';
import type { Food } from '@/domain/types';
import { useAddParams } from '@/state/use-add-params';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const SEARCH_DEBOUNCE_MS = 150;

export default function SearchScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { date, meal } = useAddParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [recent, setRecent] = useState<Food[]>([]);
  const [avoidTerms, setAvoidTerms] = useState<string[]>([]);

  useEffect(() => {
    recentFoods(db).then(setRecent);
    getProfile(db).then((p) => setAvoidTerms(p?.avoidFoods ?? []));
  }, [db]);

  useEffect(() => {
    const handle = setTimeout(() => {
      searchFoods(db, query).then(setResults);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [db, query]);

  const searching = query.trim().length > 0;
  const list = searching ? results : recent;

  const openFood = (food: Food) =>
    router.push({ pathname: '/add/portion', params: { foodId: String(food.id), date, meal } });
  const createFood = () =>
    router.push({ pathname: '/add/manual', params: { date, meal, q: query.trim() } });

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.searchBox}>
        <TextField
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="z. B. Haferflocken, Apfel …"
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Lebensmittel suchen"
        />
        <AppText variant="caption" color="textSecondary">
          Wird zu {MEAL_LABELS[meal]} hinzugefügt
        </AppText>
      </View>

      <FlatList
        data={list}
        keyExtractor={(f) => String(f.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={
          list.length > 0 ? (
            <AppText variant="overline" color="textSecondary" style={styles.sectionTitle}>
              {searching ? 'TREFFER' : 'FAVORITEN & ZULETZT VERWENDET'}
            </AppText>
          ) : null
        }
        renderItem={({ item }) => (
          <FoodRow
            food={item}
            avoided={findAvoidMatches(avoidTerms, item.name, item.brand, item.ingredientsText).length > 0}
            onPress={() => openFood(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name={searching ? 'search' : 'restaurant_menu'} size={40} color={colors.textTertiary} />
            <AppText variant="headline" align="center">
              {searching ? 'Nichts gefunden' : 'Noch keine Lebensmittel'}
            </AppText>
            <AppText variant="body" color="textSecondary" align="center">
              {searching
                ? 'Lege das Lebensmittel mit den Angaben von der Verpackung selbst an.'
                : 'Suche nach einem Lebensmittel oder lege es selbst an. Es wird gespeichert und steht dir beim nächsten Mal sofort zur Verfügung.'}
            </AppText>
          </View>
        }
      />

      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom, borderTopColor: colors.border }]}>
        <Button
          title={searching ? `„${query.trim()}" anlegen` : 'Neues Lebensmittel anlegen'}
          variant="secondary"
          icon="add"
          iconPosition="left"
          onPress={createFood}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  searchBox: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  list: { padding: spacing.lg, flexGrow: 1 },
  sectionTitle: { marginBottom: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl, paddingHorizontal: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
