import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type Tone = 'info' | 'warning' | 'danger' | 'success';

/** Hinweisbox für Warnungen und Erläuterungen. */
export function Notice({ tone = 'info', title, children }: { tone?: Tone; title?: string; children: string }) {
  const { colors } = useTheme();
  const config: Record<Tone, { bg: string; fg: string; icon: IconName }> = {
    info: { bg: colors.accentSoft, fg: colors.accent, icon: 'info' },
    warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'warning' },
    danger: { bg: colors.dangerSoft, fg: colors.danger, icon: 'error' },
    success: { bg: colors.successSoft, fg: colors.success, icon: 'check_circle' },
  };
  const c = config[tone];
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      style={[styles.box, { backgroundColor: c.bg }]}>
      <Icon name={c.icon} size={20} color={c.fg} />
      <View style={styles.text}>
        {title ? (
          <AppText variant="bodyStrong" style={{ color: c.fg }}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="caption" color="text">
          {children}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: spacing.sm + spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  text: { flex: 1, gap: spacing.xxs },
});
