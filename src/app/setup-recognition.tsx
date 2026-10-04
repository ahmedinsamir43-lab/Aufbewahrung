import * as Clipboard from 'expo-clipboard';
import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { haptics } from '@/components/ui/haptics';
import { LabeledField } from '@/components/ui/labeled-field';
import { Notice } from '@/components/ui/notice';
import { getSetting, setSetting, SETTING_KEYS } from '@/db/repositories/settings';
import {
  clearRecognitionConfig,
  CONNECTION_MESSAGES,
  loadRecognitionConfig,
  normalizeWorkerUrl,
  saveRecognitionConfig,
  testRecognitionConnection,
  type ConnectionTest,
} from '@/services/recognition';
import { generateAppToken } from '@/services/token';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

function StepBadge({ n }: { n: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.accent }]}>
      <AppText variant="bodyStrong" style={{ color: colors.onAccent }}>
        {n}
      </AppText>
    </View>
  );
}

/**
 * Einrichtung der Foto-Erkennung direkt in der App: Token erzeugen und kopieren,
 * Worker-Adresse eintragen, gesamte Kette (Worker → Token → Gemini) testen und speichern.
 */
export default function SetupRecognitionScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionTest | null>(null);
  const [copied, setCopied] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    (async () => {
      const existing = await loadRecognitionConfig(db);
      if (existing) {
        setToken(existing.token);
        setUrl(existing.url.replace(/^https:\/\//, ''));
        setConfigured(true);
        return;
      }
      // Entwurfs-Token sofort sichern: Es wird bei Cloudflare eingefügt, bevor getestet wird.
      let draft = await getSetting<string>(db, SETTING_KEYS.recognitionDraftToken);
      if (!draft) {
        draft = generateAppToken();
        await setSetting(db, SETTING_KEYS.recognitionDraftToken, draft);
      }
      setToken(draft);
    })();
  }, [db]);

  const copy = async () => {
    if (!token) return;
    await Clipboard.setStringAsync(token);
    haptics.success();
    setCopied(true);
  };

  const share = async () => {
    if (!token) return;
    await Share.share({ message: token, title: 'Nährwert App-Token' }).catch(() => {});
  };

  const regenerate = async () => {
    const next = generateAppToken();
    await setSetting(db, SETTING_KEYS.recognitionDraftToken, next);
    setToken(next);
    setCopied(false);
    setResult(null);
  };

  const test = async () => {
    const normalized = normalizeWorkerUrl(url);
    if (!normalized) {
      setUrlError('Bitte die Adresse des Workers eingeben, z. B. naehrwert-recognition.name.workers.dev');
      haptics.error();
      return;
    }
    if (!token) return;
    setUrlError(null);
    setTesting(true);
    setResult(null);
    const r = await testRecognitionConnection({ url: normalized, token });
    setResult(r);
    setTesting(false);
    if (CONNECTION_MESSAGES[r].ok) {
      await saveRecognitionConfig(db, { url: normalized, token });
      setConfigured(true);
      haptics.success();
    } else {
      haptics.error();
    }
  };

  const remove = async () => {
    await clearRecognitionConfig(db);
    setConfigured(false);
    setResult(null);
    await regenerate();
  };

  const message = result ? CONNECTION_MESSAGES[result] : null;
  const mono = Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' });

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Foto-Erkennung einrichten' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="body" color="textSecondary">
          Einmalige Einrichtung, kostenlos. Die ausführliche Schritt-für-Schritt-Anleitung findest du in
          docs/FOTO-ERKENNUNG.md. Hier erledigst du Teil C.
        </AppText>

        {configured && !result ? (
          <Notice tone="success" title="Eingerichtet">
            Die Foto-Erkennung ist eingerichtet. Du kannst die Verbindung jederzeit erneut testen.
          </Notice>
        ) : null}

        <Card style={styles.card}>
          <View style={styles.stepHead}>
            <StepBadge n="1" />
            <AppText variant="headline" style={styles.flex}>
              App-Token kopieren
            </AppText>
          </View>
          <AppText variant="caption" color="textSecondary">
            Füge dieses Token bei Cloudflare als Secret mit dem Namen APP_TOKEN ein (Anleitung Schritt C2). Richtest du
            Cloudflare am PC ein, schicke es dir mit „Teilen“ selbst, z. B. per E-Mail.
          </AppText>
          <View style={[styles.tokenBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <AppText selectable variant="caption" style={{ fontFamily: mono, color: colors.text }} accessibilityLabel="App-Token">
              {token ?? '…'}
            </AppText>
          </View>
          <View style={styles.row}>
            <Button
              title={copied ? 'Kopiert' : 'Kopieren'}
              variant={copied ? 'secondary' : 'primary'}
              icon={copied ? 'check' : 'content_copy'}
              iconPosition="left"
              onPress={copy}
              style={styles.flex}
            />
            <Button title="Teilen" variant="secondary" icon="share" iconPosition="left" onPress={share} style={styles.flex} />
          </View>
          {!configured ? (
            <Button title="Neues Token erzeugen" variant="ghost" onPress={regenerate} />
          ) : null}
        </Card>

        <Card style={styles.card}>
          <View style={styles.stepHead}>
            <StepBadge n="2" />
            <AppText variant="headline" style={styles.flex}>
              Worker-Adresse eintragen
            </AppText>
          </View>
          <LabeledField
            label="Adresse (steht bei Cloudflare unter „Visit“ bzw. „Domains & Routes“)"
            value={url}
            onChangeText={(t) => {
              setUrl(t);
              setUrlError(null);
              setResult(null);
            }}
            placeholder="naehrwert-recognition.name.workers.dev"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            error={urlError ?? undefined}
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.stepHead}>
            <StepBadge n="3" />
            <AppText variant="headline" style={styles.flex}>
              Verbindung testen
            </AppText>
          </View>
          <AppText variant="caption" color="textSecondary">
            Prüft Worker, Token und Gemini-Schlüssel mit einem winzigen Testbild. Bei Erfolg wird gespeichert.
          </AppText>
          {message ? (
            <Notice tone={message.ok ? 'success' : 'danger'} title={message.title}>
              {message.text}
            </Notice>
          ) : null}
        </Card>

        {configured ? <Button title="Einrichtung entfernen" variant="ghost" icon="delete" iconPosition="left" onPress={remove} /> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom, borderTopColor: colors.border }]}>
        {message?.ok ? (
          <Button title="Fertig" icon="check" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        ) : (
          <Button title="Verbindung testen" icon="wifi" iconPosition="left" onPress={test} loading={testing} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  flex: { flex: 1 },
  card: { gap: spacing.sm + spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tokenBox: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
