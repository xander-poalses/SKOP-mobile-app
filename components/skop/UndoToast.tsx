import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { SkopColors, SkopFonts, skopShadow } from '@/constants/skop-theme';

type UndoToastProps = {
  message: string;
  onUndo: () => void;
  bottom: number;
};

// exits run about 20% shorter than entrances
const ENTER_MS = 220;
const EXIT_MS = 180;

export function UndoToast({ message, onUndo, bottom }: UndoToastProps) {
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      entering={FadeInDown.duration(ENTER_MS).easing(Easing.out(Easing.cubic))}
      exiting={FadeOutDown.duration(EXIT_MS).easing(Easing.in(Easing.cubic))}
      style={[styles.toast, { bottom }]}>
      <Text style={styles.message}>{message}</Text>
      {/* undo puts the previous plan back */}
      <Pressable
        accessibilityLabel={`Undo: ${message}`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onUndo();
        }}
        style={({ pressed }) => [styles.undo, pressed && styles.undoPressed]}>
        <Text style={styles.undoText}>UNDO</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    maxWidth: 460,
    alignSelf: 'center',
    minHeight: 56,
    paddingLeft: 18,
    paddingRight: 6,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    ...skopShadow,
  },
  message: { flex: 1, color: SkopColors.ink, fontFamily: SkopFonts.medium, fontSize: 16 },
  undo: {
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoPressed: { transform: [{ scale: 0.97 }] },
  undoText: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 17, textDecorationLine: 'underline' },
});
