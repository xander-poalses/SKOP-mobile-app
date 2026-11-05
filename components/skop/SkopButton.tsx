import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text } from 'react-native';

import { SkopColors, SkopFonts, skopShadow } from '@/constants/skop-theme';

type SkopButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'surface' | 'yellow' | 'blue' | 'green' | 'pink';
  small?: boolean;
  compact?: boolean;
  disabled?: boolean;
  labelFontSize?: number;
};

const variantColor = {
  surface: SkopColors.surface,
  yellow: SkopColors.yellow,
  blue: SkopColors.blue,
  green: SkopColors.green,
  pink: SkopColors.pink,
};

export function SkopButton({
  label,
  onPress,
  variant = 'surface',
  small,
  compact,
  disabled,
  labelFontSize,
}: SkopButtonProps) {
  // filled buttons need text that works on dark colours
  const isFilled = variant === 'blue' || variant === 'green' || variant === 'pink';

  // every skop button gives the same light tap before running its action
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    // moves the button down while it is held
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        small ? styles.smallButton : compact ? styles.compactButton : styles.bigButton,
        { backgroundColor: variantColor[variant] },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        style={[
          styles.label,
          small ? styles.smallLabel : compact ? styles.compactLabel : styles.bigLabel,
          isFilled && styles.lightLabel,
          labelFontSize ? { fontSize: labelFontSize } : undefined,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 20,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    ...skopShadow,
  },
  bigButton: {
    height: 82,
    flex: 1,
  },
  compactButton: {
    height: 52,
    flex: 1,
  },
  smallButton: {
    height: 40,
    width: '100%',
  },
  pressed: {
    transform: [{ translateY: 3 }],
    boxShadow: `0px 3px 0px 0px ${SkopColors.shadow}`,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontFamily: SkopFonts.bold,
    color: SkopColors.ink,
    textAlign: 'center',
  },
  bigLabel: {
    fontSize: 28,
  },
  compactLabel: {
    fontSize: 20,
  },
  smallLabel: {
    fontSize: 14,
  },
  lightLabel: {
    color: '#ffffff',
  },
});
