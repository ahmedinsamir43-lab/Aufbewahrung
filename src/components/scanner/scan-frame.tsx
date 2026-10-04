import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

export const FRAME = { width: 280, height: 180 } as const;
const CORNER = 28;
const STROKE = 4;

/** Abgedunkelte Fläche mit Sucherrahmen, Eckmarkierungen und animierter Scanlinie. */
export function ScanFrame({ active, color }: { active: boolean; color: string }) {
  const y = useSharedValue(0);

  useEffect(() => {
    y.set(active ? withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true) : 0);
  }, [active, y]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.get() * (FRAME.height - 24) }],
    opacity: active ? 1 : 0,
  }));

  const corner = (pos: object) => <View style={[styles.corner, { borderColor: color }, pos]} />;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.shade} />
      <View style={styles.middle}>
        <View style={styles.shade} />
        <View style={styles.frame}>
          {corner({ top: 0, left: 0, borderTopWidth: STROKE, borderLeftWidth: STROKE, borderTopLeftRadius: 18 })}
          {corner({ top: 0, right: 0, borderTopWidth: STROKE, borderRightWidth: STROKE, borderTopRightRadius: 18 })}
          {corner({ bottom: 0, left: 0, borderBottomWidth: STROKE, borderLeftWidth: STROKE, borderBottomLeftRadius: 18 })}
          {corner({ bottom: 0, right: 0, borderBottomWidth: STROKE, borderRightWidth: STROKE, borderBottomRightRadius: 18 })}
          <Animated.View style={[styles.line, { backgroundColor: color, shadowColor: color }, lineStyle]} />
        </View>
        <View style={styles.shade} />
      </View>
      <View style={styles.shade} />
    </View>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  middle: { flexDirection: 'row', height: FRAME.height },
  frame: { width: FRAME.width, height: FRAME.height },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  line: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 12,
    height: 2,
    borderRadius: 1,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
