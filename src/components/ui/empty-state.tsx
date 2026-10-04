import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export function EmptyState({ icon, title, text, children }: { icon: IconName; title: string; text: string; children?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <Icon name={icon} size={40} color={colors.accent} />
      </View>
      <AppText variant="title" align="center">
        {title}
      </AppText>
      <AppText variant="body" color="textSecondary" align="center">
        {text}
      </AppText>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  icon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  actions: { alignSelf: 'stretch', marginTop: spacing.md, gap: spacing.sm },
});
