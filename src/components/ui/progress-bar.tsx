import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Animierter Fortschrittsbalken (0–1). */
export function ProgressBar({ progress }: { progress: number }) {
  const { colors } = useTheme();
  const value = useSharedValue(progress);

  useEffect(() => {
    value.set(withSpring(Math.min(1, Math.max(0, progress)), { damping: 20, stiffness: 140 }));
  }, [progress, value]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${value.get() * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={[styles.track, { backgroundColor: colors.ringTrack }]}>
      <Animated.View style={[styles.fill, { backgroundColor: colors.accent }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
