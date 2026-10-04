import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SuggestionCard, type Suggestion } from '@/components/photo/suggestion-card';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { haptics } from '@/components/ui/haptics';
import { Notice } from '@/components/ui/notice';
import { getProfile } from '@/db/repositories/profile';
import { findAvoidMatches } from '@/domain/avoid-match';
import { formatInput, formatNumber } from '@/domain/format';
import { MEAL_LABELS, MEALS } from '@/domain/meals';
import { parsePortion, scaleNutrients } from '@/domain/portion';
import { itemPer100g } from '@/domain/recognition';
import type { Meal } from '@/domain/types';
import { prepareImage } from '@/services/image-prep';
import { logRecognizedItems } from '@/services/log-service';
import { readConfig, recognizeMeal } from '@/services/recognition';
import { useAddParams } from '@/state/use-add-params';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Phase =
  | { kind: 'idle' }
  | { kind: 'analyzing'; uri: string }
  | { kind: 'result'; uri: string; suggestions: Suggestion[] }
  | { kind: 'failed'; uri: string | null; title: string; text: string };

/** Foto-Erkennung: Vorschläge werden immer zur Prüfung angezeigt, nie ungeprüft gespeichert. */
export default function PhotoScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useAddParams();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [meal, setMeal] = useState<Meal>(params.meal);
  const [avoidTerms, setAvoidTerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const configured = readConfig() != null;

  useEffect(() => {
    getProfile(db).then((p) => setAvoidTerms(p?.avoidFoods ?? []));
  }, [db]);

  const pick = async (source: 'camera' | 'library') => {
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, allowsEditing: false };
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setPhase({ kind: 'failed', uri: null, title: 'Kamera nicht erlaubt', text: 'Erlaube den Kamerazugriff in den Einstellungen oder wähle ein Foto aus der Galerie.' });
        return;
      }
    }
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;
    analyze(result.assets[0]);
  };

  const analyze = async (asset: ImagePicker.ImagePickerAsset) => {
    setPhase({ kind: 'analyzing', uri: asset.uri });
    let base64: string;
    try {
      base64 = await prepareImage(asset.uri, asset.width, asset.height);
    } catch {
      setPhase({ kind: 'failed', uri: asset.uri, title: 'Foto nicht lesbar', text: 'Das Foto konnte nicht verarbeitet werden. Bitte versuche ein anderes.' });
      return;
    }
    const r = await recognizeMeal(base64);
    if (r.kind === 'ok') {
      if (r.items.length === 0) {
        haptics.error();
        setPhase({ kind: 'failed', uri: asset.uri, title: 'Kein Essen erkannt', text: 'Fotografiere die Mahlzeit möglichst von schräg oben, gut beleuchtet und vollständig im Bild.' });
        return;
      }
      haptics.success();
      setPhase({
        kind: 'result',
        uri: asset.uri,
        suggestions: r.items.map((item, i) => ({
          key: `${i}-${item.name}`,
          item,
          name: item.name,
          gramsText: formatInput(item.geschaetzteMenge_g),
          selected: true,
        })),
      });
      return;
    }
    haptics.error();
    const messages = {
      not_configured: ['Nicht eingerichtet', 'Die Foto-Erkennung ist noch nicht eingerichtet.'],
      offline: ['Keine Internetverbindung', 'Die Foto-Erkennung benötigt Internet. Nutze die Suche oder versuche es später erneut.'],
      quota: ['Tageslimit erreicht', 'Das kostenlose Kontingent für heute ist aufgebraucht. Morgen geht es wieder – bis dahin hilft die Suche.'],
      error: ['Erkennung fehlgeschlagen', r.kind === 'error' ? r.message : ''],
    } as const;
    const [title, text] = messages[r.kind];
    setPhase({ kind: 'failed', uri: asset.uri, title, text });
  };

  const save = async () => {
    if (phase.kind !== 'result') return;
    const chosen = phase.suggestions.filter((s) => s.selected);
    const items = chosen.flatMap((s) => {
      const amountG = parsePortion(s.gramsText);
      return amountG == null ? [] : [{ item: s.item, name: s.name, amountG }];
    });
    if (items.length === 0 || items.length !== chosen.length) {
      haptics.error();
      return;
    }
    setSaving(true);
    try {
      await logRecognizedItems(db, items, { date: params.date, meal });
      haptics.success();
      router.dismissTo('/');
    } catch {
      haptics.error();
      setSaving(false);
    }
  };

  const searchInstead = () => router.replace({ pathname: '/add/search', params: { date: params.date, meal } });

  if (!configured) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="photo_camera"
          title="Foto-Erkennung einrichten"
          text="Für die kostenlose Foto-Erkennung wird einmalig ein eigener Server-Zugang (Cloudflare Worker mit Gemini-Schlüssel) benötigt. Die Anleitung steht in docs/FOTO-ERKENNUNG.md.">
          <Button title="Stattdessen suchen" icon="search" iconPosition="left" onPress={searchInstead} />
        </EmptyState>
      </View>
    );
  }

  const selected = phase.kind === 'result' ? phase.suggestions.filter((s) => s.selected) : [];
  const total = selected.reduce(
    (sum, s) => sum + scaleNutrients(itemPer100g(s.item), parsePortion(s.gramsText) ?? 0).kcal,
    0,
  );
  const invalid = selected.some((s) => parsePortion(s.gramsText) == null);

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {phase.kind === 'idle' ? (
          <>
            <EmptyState
              icon="auto_awesome"
              title="Mahlzeit fotografieren"
              text="Die Lebensmittel werden erkannt und Mengen sowie Nährwerte geschätzt. Du prüfst und korrigierst jeden Vorschlag, bevor er gespeichert wird.">
              <Button title="Foto aufnehmen" icon="photo_camera" iconPosition="left" onPress={() => pick('camera')} />
              <Button title="Aus Galerie wählen" variant="secondary" icon="image" iconPosition="left" onPress={() => pick('library')} />
            </EmptyState>
            <AppText variant="caption" color="textTertiary" align="center" style={styles.privacy}>
              Datenschutz: Das Foto wird verkleinert an deinen Server und von dort zur Analyse an Google Gemini
              übertragen. In der kostenlosen Stufe darf Google Eingaben zur Verbesserung seiner Dienste nutzen. In
              der App wird das Foto nicht gespeichert.
            </AppText>
          </>
        ) : null}

        {phase.kind !== 'idle' && phase.uri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: phase.uri }} style={styles.photo} contentFit="cover" accessibilityLabel="Aufgenommenes Foto" />
            {phase.kind === 'analyzing' ? (
              <View style={styles.overlay}>
                <ActivityIndicator color="#FFFFFF" size="large" />
                <AppText variant="headline" style={styles.white}>
                  Mahlzeit wird analysiert …
                </AppText>
              </View>
            ) : null}
          </View>
        ) : null}

        {phase.kind === 'failed' ? (
          <View style={styles.stack}>
            <Notice tone="warning" title={phase.title}>
              {phase.text}
            </Notice>
            <Button title="Neues Foto" icon="photo_camera" iconPosition="left" onPress={() => setPhase({ kind: 'idle' })} />
            <Button title="Stattdessen suchen" variant="ghost" onPress={searchInstead} />
          </View>
        ) : null}

        {phase.kind === 'result' ? (
          <View style={styles.stack}>
            <Notice tone="info" title="KI-Vorschlag – bitte prüfen">
              Mengen und Nährwerte sind Schätzungen. Passe Bezeichnung und Gramm an oder entferne falsche Einträge.
            </Notice>
            {phase.suggestions.map((s) => (
              <SuggestionCard
                key={s.key}
                suggestion={s}
                avoided={findAvoidMatches(avoidTerms, s.name)}
                onChange={(next) =>
                  setPhase({ ...phase, suggestions: phase.suggestions.map((x) => (x.key === next.key ? next : x)) })
                }
              />
            ))}
            <View style={styles.chips}>
              {MEALS.map((m) => (
                <Chip key={m} label={MEAL_LABELS[m]} selected={meal === m} onPress={() => setMeal(m)} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {phase.kind === 'result' ? (
        <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom, borderTopColor: colors.border }]}>
          <View style={styles.summary}>
            <AppText variant="caption" color="textSecondary">
              {selected.length === 0
                ? 'Nichts ausgewählt'
                : `${selected.length} ${selected.length === 1 ? 'Eintrag' : 'Einträge'} ausgewählt`}
            </AppText>
            <AppText variant="bodyStrong">{formatNumber(total)} kcal</AppText>
          </View>
          <Button
            title={`Zu ${MEAL_LABELS[meal]} hinzufügen`}
            icon="check"
            onPress={save}
            loading={saving}
            disabled={selected.length === 0 || invalid}
          />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  privacy: { paddingHorizontal: spacing.md },
  photoWrap: { borderRadius: radius.lg, overflow: 'hidden', aspectRatio: 4 / 3 },
  photo: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  white: { color: '#FFFFFF' },
  stack: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm + spacing.xs,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
