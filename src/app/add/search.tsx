import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FoodRow } from '@/components/food/food-row';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import { haptics } from '@/components/ui/haptics';
import { Notice } from '@/components/ui/notice';
import { recentFoods, searchFoods, upsertOffFood } from '@/db/repositories/food';
import { getProfile } from '@/db/repositories/profile';
import { findAvoidMatches } from '@/domain/avoid-match';
import { MEAL_LABELS } from '@/domain/meals';
import type { Food } from '@/domain/types';
import { OffNetworkError, searchProducts, type MappedProduct } from '@/services/open-food-facts';
import { useAddParams } from '@/state/use-add-params';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const SEARCH_DEBOUNCE_MS = 150;

type OnlineState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; query: string; products: MappedProduct[] }
  | { status: 'offline' }
  | { status: 'error' };

/** Darstellung eines noch nicht gespeicherten Online-Treffers in der gemeinsamen Listenzeile. */
function previewFood(p: MappedProduct): Food {
  return {
    id: -1,
    source: 'openfoodfacts',
    barcode: p.barcode,
    name: p.name,
    brand: p.brand,
    per100g: p.per100g,
    defaultPortionG: p.defaultPortionG,
    ingredientsText: p.ingredientsText,
    isFavorite: false,
    lastUsedAt: null,
    createdAt: '',
    updatedAt: '',
  };
}

export default function SearchScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { date, meal } = useAddParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [recent, setRecent] = useState<Food[]>([]);
  const [avoidTerms, setAvoidTerms] = useState<string[]>([]);
  const [online, setOnline] = useState<OnlineState>({ status: 'idle' });

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
  const canSearchOnline = query.trim().length >= 2;

  const changeQuery = (q: string) => {
    setQuery(q);
    if (online.status !== 'idle') setOnline({ status: 'idle' });
  };

  // Nur auf ausdrückliche Aktion: Open Food Facts erlaubt 10 Suchanfragen pro Minute.
  const searchOnline = async () => {
    if (!canSearchOnline || online.status === 'loading') return;
    const q = query.trim();
    setOnline({ status: 'loading' });
    try {
      setOnline({ status: 'done', query: q, products: await searchProducts(q) });
    } catch (error) {
      setOnline({ status: error instanceof OffNetworkError ? 'offline' : 'error' });
    }
  };

  const openOnline = async (p: MappedProduct) => {
    haptics.tap();
    const id = await upsertOffFood(db, p, new Date().toISOString());
    router.push({ pathname: '/add/portion', params: { foodId: String(id), date, meal } });
  };

  const onlineSection = searching ? (
    <View style={styles.online}>
      {online.status === 'idle' ? (
        <Button
          title="In Open Food Facts suchen"
          variant="secondary"
          icon="travel_explore"
          iconPosition="left"
          disabled={!canSearchOnline}
          onPress={searchOnline}
        />
      ) : null}
      {online.status === 'loading' ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <AppText variant="body" color="textSecondary">
            Suche in Open Food Facts …
          </AppText>
        </View>
      ) : null}
      {online.status === 'offline' ? (
        <Notice tone="warning" title="Keine Internetverbindung">
          Die Online-Suche ist gerade nicht möglich. Deine gespeicherten Lebensmittel findest du weiterhin oben.
        </Notice>
      ) : null}
      {online.status === 'error' ? (
        <Notice tone="danger">Die Suche ist fehlgeschlagen. Bitte versuche es später erneut.</Notice>
      ) : null}
      {online.status === 'done' ? (
        <>
          <AppText variant="overline" color="textSecondary">
            OPEN FOOD FACTS · {online.products.length} TREFFER
          </AppText>
          {online.products.length === 0 ? (
            <AppText variant="body" color="textSecondary">
              Keine Produkte mit vollständigen Nährwerten gefunden.
            </AppText>
          ) : (
            online.products.map((p) => (
              <FoodRow
                key={p.barcode}
                food={previewFood(p)}
                avoided={findAvoidMatches(avoidTerms, p.name, p.brand, p.ingredientsText).length > 0}
                onPress={() => openOnline(p)}
              />
            ))
          )}
          <AppText variant="caption" color="textTertiary">
            Daten: Open Food Facts (ODbL), von der Community gepflegt – bitte Werte mit der Verpackung abgleichen.
          </AppText>
        </>
      ) : null}
    </View>
  ) : null;
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
          onChangeText={changeQuery}
          onSubmitEditing={searchOnline}
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
              {searching ? 'DEINE LEBENSMITTEL' : 'FAVORITEN & ZULETZT VERWENDET'}
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
        ListFooterComponent={onlineSection}
        ListEmptyComponent={
          <View style={styles.empty}>
            {searching ? (
              <AppText variant="body" color="textSecondary" align="center">
                Nicht in deinen gespeicherten Lebensmitteln.
              </AppText>
            ) : (
              <>
                <Icon name="restaurant_menu" size={40} color={colors.textTertiary} />
                <AppText variant="headline" align="center">
                  Noch keine Lebensmittel
                </AppText>
                <AppText variant="body" color="textSecondary" align="center">
                  Suche nach einem Lebensmittel, scanne einen Barcode oder lege es selbst an. Alles wird
                  gespeichert und steht dir beim nächsten Mal sofort zur Verfügung.
                </AppText>
              </>
            )}
          </View>
        }
      />

      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom, borderTopColor: colors.border }]}>
        <Button
          title={searching ? `„${query.trim()}“ anlegen` : 'Neues Lebensmittel anlegen'}
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
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg, paddingHorizontal: spacing.md },
  online: { gap: spacing.sm, marginTop: spacing.lg },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
