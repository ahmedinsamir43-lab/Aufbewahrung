import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { haptics } from '@/components/ui/haptics';
import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { radius, spacing } from '@/theme/tokens';
import { softShadow, useTheme } from '@/theme/use-theme';

export type AddMethod = 'scan' | 'photo' | 'search';

const OPTIONS: { method: AddMethod; title: string; help: string; icon: IconName }[] = [
  { method: 'scan', title: 'Barcode scannen', help: 'Verpackte Lebensmittel', icon: 'barcode_scanner' },
  { method: 'photo', title: 'Foto aufnehmen', help: 'Mahlzeit automatisch erkennen', icon: 'photo_camera' },
  { method: 'search', title: 'Suchen', help: 'Nach Namen oder selbst anlegen', icon: 'search' },
];

/** Großer „+"-Button mit den drei Erfassungswegen. */
export function AddFab({ onSelect, bottomOffset = 0 }: { onSelect: (m: AddMethod) => void; bottomOffset?: number }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const choose = (m: AddMethod) => {
    haptics.tap();
    setOpen(false);
    onSelect(m);
  };

  return (
    <>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Lebensmittel erfassen"
        scaleTo={0.92}
        onPress={() => {
          haptics.tap();
          setOpen(true);
        }}
        style={[
          styles.fab,
          { backgroundColor: colors.accent, bottom: spacing.lg + bottomOffset },
          softShadow(colors, isDark, 2),
        ]}>
        <Icon name="add" size={32} color={colors.onAccent} />
      </PressableScale>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)} statusBarTranslucent navigationBarTranslucent>
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Schließen" />
          <Animated.View
            entering={FadeInDown.springify().damping(18)}
            style={[
              styles.sheet,
              { backgroundColor: colors.card, paddingBottom: spacing.lg + insets.bottom },
            ]}>
            <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
            <AppText variant="title">Was möchtest du erfassen?</AppText>
            {OPTIONS.map((o) => (
              <PressableScale
                key={o.method}
                accessibilityRole="button"
                accessibilityLabel={`${o.title}. ${o.help}`}
                onPress={() => choose(o.method)}
                style={[styles.option, { backgroundColor: colors.background }]}>
                <View style={[styles.optionIcon, { backgroundColor: colors.accent }]}>
                  <Icon name={o.icon} size={24} color={colors.onAccent} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="headline">{o.title}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {o.help}
                  </AppText>
                </View>
                <Icon name="chevron_right" size={22} color={colors.textTertiary} />
              </PressableScale>
            ))}
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm + spacing.xs,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  optionIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
