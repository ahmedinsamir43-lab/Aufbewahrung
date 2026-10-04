import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { haptics } from './haptics';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

/** Auswahlkarte mit Icon, Titel und Hilfszeile. */
export function OptionCard({
  title,
  help,
  icon,
  selected,
  onPress,
}: {
  title: string;
  help?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={help ? `${title}. ${help}` : title}
      scaleTo={0.98}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.accentSoft : colors.card,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}>
      {icon ? (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: selected ? colors.accent : colors.background },
          ]}>
          <Icon name={icon} size={22} color={selected ? colors.onAccent : colors.textSecondary} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="headline">{title}</AppText>
        {help ? (
          <AppText variant="caption" color="textSecondary">
            {help}
          </AppText>
        ) : null}
      </View>
      <View
        style={[
          styles.radio,
          { borderColor: selected ? colors.accent : colors.borderStrong },
          selected && { backgroundColor: colors.accent },
        ]}>
        {selected ? <Icon name="check" size={14} color={colors.onAccent} /> : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: spacing.xxs },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
