import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Animierter Fortschrittsbalken (0–1). */
export function ProgressBar({
  progress,
  color,
  height = 6,
}: {
  progress: number;
  color?: string;
  height?: number;
}) {
  const { colors } = useTheme();
  const value = useSharedValue(0);

  useEffect(() => {
    value.set(withSpring(Math.min(1, Math.max(0, progress)), { damping: 20, stiffness: 140 }));
  }, [progress, value]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${value.get() * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={[styles.track, { height, backgroundColor: colors.ringTrack }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color ?? colors.accent }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
