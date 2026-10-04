import { CameraView, useCameraPermissions, type BarcodeScanningResult, type BarcodeType } from 'expo-camera';
import { router, useIsFocused } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScanFrame } from '@/components/scanner/scan-frame';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { haptics } from '@/components/ui/haptics';
import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { TextField } from '@/components/ui/text-field';
import { queueScan } from '@/db/repositories/pending-scan';
import { normalizeBarcode } from '@/domain/barcode';
import { resolveBarcode, type BarcodeResolution } from '@/services/barcode-service';
import { useAddParams } from '@/state/use-add-params';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const BARCODE_TYPES: BarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e'];

type Phase =
  | { kind: 'scanning' }
  | { kind: 'resolving'; barcode: string }
  | { kind: 'result'; barcode: string; result: Exclude<BarcodeResolution, { kind: 'found' }> };

export default function ScanScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { date, meal } = useAddParams();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>({ kind: 'scanning' });
  const [torch, setTorch] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const busy = useRef(false);

  const handleCode = async (barcode: string) => {
    if (busy.current) return;
    busy.current = true;
    haptics.success();
    setPhase({ kind: 'resolving', barcode });
    try {
      const result = await resolveBarcode(db, barcode);
      if (result.kind === 'found') {
        router.replace({ pathname: '/add/portion', params: { foodId: String(result.foodId), date, meal } });
        return;
      }
      if (result.kind === 'offline') await queueScan(db, { barcode, date, meal }, new Date().toISOString());
      setPhase({ kind: 'result', barcode, result });
    } catch {
      setPhase({ kind: 'result', barcode, result: { kind: 'not_found' } });
    }
  };

  const onScanned = ({ data, type }: BarcodeScanningResult) => {
    if (busy.current) return;
    const code = normalizeBarcode(data, type);
    // Fehllesungen (falsche Prüfziffer) ignorieren und weiter scannen.
    if (code) handleCode(code);
  };

  const submitManual = () => {
    const code = normalizeBarcode(manualCode);
    if (!code) {
      setManualError('Ungültiger Barcode – bitte die Ziffern unter dem Strichcode prüfen.');
      haptics.error();
      return;
    }
    setManualError(null);
    handleCode(code);
  };

  const scanAgain = () => {
    busy.current = false;
    setPhase({ kind: 'scanning' });
  };

  const createManually = (barcode: string, name?: string | null, brand?: string | null) =>
    router.replace({
      pathname: '/add/manual',
      params: { date, meal, barcode, q: name ?? '', brand: brand ?? '' },
    });

  const manualEntry = (
    <View style={styles.manual}>
      <TextField
        autoFocus
        value={manualCode}
        onChangeText={(t) => {
          setManualCode(t.replace(/\D/g, ''));
          setManualError(null);
        }}
        keyboardType="number-pad"
        maxLength={14}
        placeholder="z. B. 4006381333931"
        invalid={!!manualError}
        returnKeyType="search"
        onSubmitEditing={submitManual}
        accessibilityLabel="Barcode-Nummer"
      />
      {manualError ? (
        <AppText variant="caption" color="danger">
          {manualError}
        </AppText>
      ) : null}
      <Button title="Produkt suchen" icon="search" iconPosition="left" onPress={submitManual} />
    </View>
  );

  // Berechtigung
  if (!permission) return <View style={[styles.screen, { backgroundColor: '#000' }]} />;
  if (!permission.granted) {
    return (
      <KeyboardAvoidingView behavior="padding" style={[styles.screen, styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <CloseButton />
        <EmptyState
          icon="photo_camera"
          title="Kamera erlauben"
          text="Zum Scannen von Barcodes benötigt die App Zugriff auf die Kamera. Bilder werden nicht gespeichert.">
          {permission.canAskAgain ? (
            <Button title="Zugriff erlauben" onPress={requestPermission} />
          ) : (
            <Button title="Einstellungen öffnen" onPress={() => Linking.openSettings()} />
          )}
          {manualOpen ? manualEntry : (
            <Button title="Nummer eintippen" variant="ghost" icon="dialpad" iconPosition="left" onPress={() => setManualOpen(true)} />
          )}
        </EmptyState>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { backgroundColor: '#000' }]}>
      {focused ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
          onBarcodeScanned={phase.kind === 'scanning' && !manualOpen ? onScanned : undefined}
        />
      ) : null}
      <ScanFrame active={phase.kind === 'scanning' && !manualOpen} color={colors.onAccent} />

      <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
        <CloseButton />
        <RoundButton
          icon={torch ? 'flashlight_off' : 'flashlight_on'}
          label={torch ? 'Licht aus' : 'Licht an'}
          onPress={() => {
            haptics.select();
            setTorch((t) => !t);
          }}
        />
      </View>

      <View style={[styles.hint, { top: insets.top + 96 }]}>
        <AppText variant="headline" align="center" style={styles.white}>
          Barcode in den Rahmen halten
        </AppText>
        <AppText variant="caption" align="center" style={styles.whiteMuted}>
          EAN-13, EAN-8, UPC-A und UPC-E werden automatisch erkannt
        </AppText>
      </View>

      <Animated.View
        key={phase.kind + (manualOpen ? 'm' : '')}
        entering={FadeInDown.duration(260)}
        style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: spacing.lg + insets.bottom }]}>
        {phase.kind === 'scanning' && !manualOpen ? (
          <Button title="Nummer eintippen" variant="secondary" icon="dialpad" iconPosition="left" onPress={() => setManualOpen(true)} />
        ) : null}
        {phase.kind === 'scanning' && manualOpen ? (
          <>
            <AppText variant="headline">Barcode-Nummer eingeben</AppText>
            {manualEntry}
            <Button title="Zurück zur Kamera" variant="ghost" onPress={() => setManualOpen(false)} />
          </>
        ) : null}
        {phase.kind === 'resolving' ? (
          <View style={styles.resolving}>
            <ActivityIndicator color={colors.accent} />
            <View>
              <AppText variant="headline">Produkt wird gesucht …</AppText>
              <AppText variant="caption" color="textSecondary">
                {phase.barcode}
              </AppText>
            </View>
          </View>
        ) : null}
        {phase.kind === 'result' ? (
          <ResultPanel
            barcode={phase.barcode}
            result={phase.result}
            onScanAgain={scanAgain}
            onCreate={createManually}
          />
        ) : null}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.round}>
      <Icon name={icon} size={22} color="#FFFFFF" />
    </PressableScale>
  );
}

function CloseButton() {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Schließen"
      onPress={() => router.back()}
      style={[styles.round, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
      <Icon name="close" size={22} color={colors.onAccent} />
    </PressableScale>
  );
}

function ResultPanel({
  barcode,
  result,
  onScanAgain,
  onCreate,
}: {
  barcode: string;
  result: Exclude<BarcodeResolution, { kind: 'found' }>;
  onScanAgain: () => void;
  onCreate: (barcode: string, name?: string | null, brand?: string | null) => void;
}) {
  const { colors } = useTheme();
  const content: Record<typeof result.kind, { icon: IconName; tone: string; title: string; text: string }> = {
    offline: {
      icon: 'cloud_off',
      tone: colors.warning,
      title: 'Keine Internetverbindung',
      text: 'Der Scan wurde gespeichert und wird automatisch abgerufen, sobald du online bist. Du findest ihn dann auf dem Startbildschirm.',
    },
    not_found: {
      icon: 'help',
      tone: colors.warning,
      title: 'Produkt nicht gefunden',
      text: 'Dieser Barcode ist in Open Food Facts nicht hinterlegt. Lege das Produkt mit den Angaben der Verpackung an – beim nächsten Scan wird es sofort erkannt.',
    },
    incomplete: {
      icon: 'edit_note',
      tone: colors.warning,
      title: 'Nährwerte unvollständig',
      text: 'Das Produkt ist bekannt, aber die Nährwerte fehlen oder sind unplausibel. Bitte ergänze sie von der Verpackung.',
    },
  };
  const c = content[result.kind];
  return (
    <View style={styles.result} accessibilityLiveRegion="polite">
      <View style={styles.resultHead}>
        <View style={[styles.resultIcon, { backgroundColor: colors.warningSoft }]}>
          <Icon name={c.icon} size={24} color={c.tone} />
        </View>
        <View style={styles.flex}>
          <AppText variant="headline">{c.title}</AppText>
          <AppText variant="caption" color="textSecondary">
            {result.kind === 'incomplete' && result.name ? `${result.name} · ${barcode}` : barcode}
          </AppText>
        </View>
      </View>
      <AppText variant="body" color="textSecondary">
        {c.text}
      </AppText>
      {result.kind === 'offline' ? (
        <>
          <Button title="Weiter scannen" icon="barcode_scanner" iconPosition="left" onPress={onScanAgain} />
          <Button title="Fertig" variant="ghost" onPress={() => router.back()} />
        </>
      ) : (
        <>
          <Button
            title={result.kind === 'incomplete' ? 'Nährwerte ergänzen' : 'Produkt anlegen'}
            icon="edit_note"
            iconPosition="left"
            onPress={() =>
              result.kind === 'incomplete' ? onCreate(barcode, result.name, result.brand) : onCreate(barcode)
            }
          />
          <Button title="Erneut scannen" variant="ghost" onPress={onScanAgain} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { justifyContent: 'center' },
  flex: { flex: 1 },
  topBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  hint: { position: 'absolute', left: spacing.lg, right: spacing.lg, gap: spacing.xs },
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.75)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  manual: { gap: spacing.sm },
  resolving: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  result: { gap: spacing.md },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  resultIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
