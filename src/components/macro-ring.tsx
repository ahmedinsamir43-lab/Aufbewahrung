import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { ringState } from '@/domain/ring';
import { motion, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './ui/app-text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Ringdurchmesser für drei nebeneinanderliegende Ringe in einer Karte
 * (Bildschirmrand `lg`, Kartenrand `md`), begrenzt auf 72–112 px.
 */
export function useRingSize(): number {
  const { width } = useWindowDimensions();
  const column = (width - 2 * spacing.lg - 2 * spacing.md) / 3;
  return Math.round(Math.max(72, Math.min(112, column - spacing.sm)));
}

export interface MacroRingProps {
  label: string;
  consumed: number;
  target: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  /** Text im Ring; Standard: „Ist / Soll g". */
  centerValue?: string;
  centerCaption?: string;
  /** Zeile unter dem Label; Standard: Prozent des Solls. */
  footer?: string;
  delayMs?: number;
}

/** Animierter Kreisbogen für einen Makronährstoff. Wechselt bei Überschreitung die Farbe. */
export function MacroRing({
  label,
  consumed,
  target,
  color,
  size: sizeProp,
  strokeWidth = 10,
  centerValue,
  centerCaption,
  footer,
  delayMs = 0,
}: MacroRingProps) {
  const { colors } = useTheme();
  const defaultSize = useRingSize();
  const size = sizeProp ?? defaultSize;
  const state = ringState(consumed, target);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  const fill = useSharedValue(0);
  const over = useSharedValue(state.over ? 1 : 0);

  useEffect(() => {
    const timing = { duration: motion.ringDurationMs, easing: Easing.out(Easing.cubic) };
    fill.set(withDelay(delayMs, withTiming(state.fill, timing)));
    over.set(withTiming(state.over ? 1 : 0, { duration: 300 }));
  }, [state.fill, state.over, delayMs, fill, over]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fill.get()),
    stroke: interpolateColor(over.get(), [0, 1], [color, colors.over]),
  }));

  const value = centerValue ?? `${Math.round(consumed)}`;
  const caption = centerCaption ?? `/ ${Math.round(target)} g`;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`${label}: ${Math.round(consumed)} von ${Math.round(target)} Gramm, ${state.percent} Prozent${state.over ? ', überschritten' : ''}`}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.ringTrack}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            fill="none"
            animatedProps={animatedProps}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <AppText variant="number" style={state.over ? { color: colors.over } : undefined}>
            {value}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {caption}
          </AppText>
        </View>
      </View>
      <AppText
        variant="caption"
        color="textSecondary"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={styles.label}>
        {label}
      </AppText>
      <AppText variant="caption" color={state.over ? 'over' : 'textTertiary'}>
        {footer ?? `${state.percent} %`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: spacing.xs },
  center: { alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: spacing.xs, fontSize: 12, maxWidth: '100%' },
});
