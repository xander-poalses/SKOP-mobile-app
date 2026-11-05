import { Easing, FadeInDown, Keyframe } from 'react-native-reanimated';

// entrances use ease-out; exits run about 20% shorter
export const SkopMotion = {
  enterMs: 220,
  exitMs: 180,
  staggerMs: 30,
  // rows past this count appear together so long lists don't drag
  staggerLimit: 10,
};

// dialogs settle from 95% scale instead of popping in at full size
export const dialogEnter = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.95 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.out(Easing.cubic) },
}).duration(SkopMotion.enterMs);

// list rows rise in one after another
export function rowEnter(index: number) {
  return FadeInDown.duration(SkopMotion.enterMs)
    .delay(Math.min(index, SkopMotion.staggerLimit) * SkopMotion.staggerMs)
    .easing(Easing.out(Easing.cubic));
}
