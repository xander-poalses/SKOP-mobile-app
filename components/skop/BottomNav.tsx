import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { SkopButton } from '@/components/skop/SkopButton';
import { SkopColors } from '@/constants/skop-theme';

type BottomNavProps = {
  active: 'home' | 'insights';
};

export function BottomNav({ active }: BottomNavProps) {
  // landscape needs a shorter nav so the page keeps enough height
  const { height, width } = useWindowDimensions();
  const compact = width > height || height < 600;

  return (
    <BlurView
      intensity={60}
      tint="light"
      style={[styles.nav, compact && styles.compactNav]}>
      {/* keeps the blur tinted with the skop background colour */}
      <View pointerEvents="none" style={styles.chromeBackground} />
      {/* replace stops old tab visits filling the back history */}
      <SkopButton
        label="HOME"
        compact={compact}
        variant={active === 'home' ? 'yellow' : 'surface'}
        onPress={() => router.replace('/')}
      />
      {/* the active route gets its brand colour */}
      <SkopButton
        label="INSIGHTS"
        compact={compact}
        variant={active === 'insights' ? 'blue' : 'surface'}
        onPress={() => router.replace('/explore')}
      />
    </BlurView>
  );
}

const styles = StyleSheet.create({
  nav: {
    height: 112,
    paddingVertical: 10,
    paddingHorizontal: 24,
    flexDirection: 'row',
    gap: 24,
    borderTopWidth: 2,
    borderColor: SkopColors.ink,
    backgroundColor: SkopColors.chrome,
  },
  compactNav: {
    height: 72,
    paddingVertical: 8,
  },
  chromeBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SkopColors.chrome,
  },
});
