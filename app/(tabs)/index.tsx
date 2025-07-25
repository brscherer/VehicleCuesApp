import { DeviceMotion } from 'expo-sensors';
import React, { useEffect, useState } from 'react';
import { Button, Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const DOT_SIZE = 20;
const OFFSET_MULTIPLIER = 25; // make dot movement noticeable, increasing affect sensitivity

export default function App() {
  const [enabled, setEnabled] = useState(false);
  const accel = useSharedValue({ x: 0, y: 0, z: 0 }); // x: left-to-right; y: bottom-to-top; z: into/out of screen

  useEffect(() => {
    DeviceMotion.setUpdateInterval(100); // motion and orientation sensors each 100ms
    let sub: any;
    if (enabled) {
      sub = DeviceMotion.addListener((dm) => {
        accel.value = dm.acceleration || { x: 0, y: 0, z: 0 };
      });
    }
    return () => sub?.remove();
  }, [accel, enabled]);

  const speed = useDerivedValue(() => {
    const { x, y, z } = accel.value;
    return Math.sqrt(x * x + y * y + z * z);
  });

  const inVehicle = useDerivedValue(() => speed.value > 0.5); // threshold for hand movement, triggering only on vehicle movement (higher speed)

  // Shared values for dot offsets
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  // runs animations only on changes
  useAnimatedReaction(
    () => accel.value.x,
    (x) => {
      if (inVehicle.value) {
        offsetX.value = withSpring(-x * OFFSET_MULTIPLIER);
      } else {
        offsetX.value = withSpring(0);
      }
    }
  );

  // separate animations from x axis to y axis
  useAnimatedReaction(
    () => accel.value.y,
    (y) => {
      if (inVehicle.value) {
        offsetY.value = withSpring(y * OFFSET_MULTIPLIER);
      } else {
        offsetY.value = withSpring(0);
      }
    }
  );

  const leftDotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }],
    opacity: inVehicle.value ? 1 : 0,
  }));
  const topDotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offsetY.value }],
    opacity: inVehicle.value ? 1 : 0,
  }));

  return (
    <View style={styles.container}>
      <Button
        title={enabled ? 'Disable Cues' : 'Enable Cues'}
        onPress={() => setEnabled((v) => !v)}
      />
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, styles.left, leftDotStyle]} />
        <Animated.View style={[styles.dot, styles.top, topDotStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  dotsContainer: { ...StyleSheet.absoluteFillObject },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: 'red',
  },
  left: {
    left: 10,
    top: height / 2 - DOT_SIZE / 2,
  },
  top: {
    top: 10,
    left: width / 2 - DOT_SIZE / 2,
  },
});
