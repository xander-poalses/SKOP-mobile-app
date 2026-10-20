import { Href, router } from 'expo-router';
import { BlurView } from 'expo-blur';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { SkopColors, SkopFonts } from '@/constants/skop-theme';

type AppHeaderProps = {
  title: string;
};

export const APP_HEADER_HEIGHT = 96;
export const APP_HEADER_COMPACT_HEIGHT = 70;

export function AppHeader({ title }: AppHeaderProps) {
  // landscape and narrow phones use a shorter header so the title still fits
  const { height, width } = useWindowDimensions();
  const compact = width > height || height < 600 || width < 400;
  const expoGoAndroid =
    Platform.OS === 'android' &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  const headerContent = (
    <>
      {/* this fades the cream while letting more of the blur show near the bottom */}
      <LinearGradient
        colors={['#fff3d6', '#fff3d689']}
        end={{ x: 0, y: 1 }}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={styles.chromeOverlay}
      />
      {/* keeps the small brand mark clear beside the screen title */}
      <View style={[styles.logoWrap, compact && styles.compactLogoWrap]}>
        <Image
          source={require('../../assets/images/Favicon-NoBackground.png')}
          style={[styles.logo, compact && styles.compactLogo]}
          contentFit="contain"
        />
      </View>
      {/* keeps the screen title and settings action together */}
      <View style={styles.titleRow}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          numberOfLines={1}
          style={[styles.title, compact && styles.compactTitle]}>
          {title}
        </Text>
        <View style={styles.divider} />
        {/* opens settings without showing a stack header */}
        <Pressable
          accessibilityLabel="Open settings"
          hitSlop={10}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/settings' as Href);
          }}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
          <Image source={require('../../assets/figma/home-settings-source.svg')} style={styles.settingsIcon} />
        </Pressable>
      </View>
    </>
  );

  // expo go can use a software renderer that cannot draw android hardware bitmaps
  if (expoGoAndroid) {
    return <View style={[styles.header, compact && styles.compactHeader]}>{headerContent}</View>;
  }

  return (
    <BlurView
      blurReductionFactor={4}
      experimentalBlurMethod="dimezisBlurView"
      intensity={Platform.OS === 'android' ? 35 : 60}
      tint="default"
      style={[styles.header, compact && styles.compactHeader]}>
      {headerContent}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    zIndex: 10,
    top: 0,
    left: 0,
    right: 0,
    height: APP_HEADER_HEIGHT,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  compactHeader: {
    height: APP_HEADER_COMPACT_HEIGHT,
    paddingHorizontal: 20,
  },
  chromeOverlay: {
    ...StyleSheet.absoluteFill,
  },
  titleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginLeft: 16,
  },
  title: {
    flexShrink: 1,
    fontSize: 25,
    fontFamily: SkopFonts.bold,
    color: SkopColors.ink,
  },
  compactTitle: {
    fontSize: 21,
  },
  divider: {
    width: 2,
    height: 47,
    backgroundColor: SkopColors.ink,
  },
  logoWrap: {
    width: 80,
    height: 80,
  },
  compactLogoWrap: {
    width: 56,
    height: 56,
  },
  logo: {
    width: 80,
    height: 80,
  },
  compactLogo: {
    width: 56,
    height: 56,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    width: 44,
    height: 44,
  },
  pressed: {
    transform: [{ translateY: 3 }],
  },
});
