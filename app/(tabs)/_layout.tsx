import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import { Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/skop/AppHeader';
import { BottomNav } from '@/components/skop/BottomNav';
import { SkopColors } from '@/constants/skop-theme';

// tab pushes move within the screen, so they use ease-in-out
const PUSH_MS = 280;

export default function TabLayout() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, 960);
  const onInsights = pathname.startsWith('/explore');

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.page}>
        {/* the tab pages slide beneath the header and above the nav */}
        <View style={styles.scenes}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' },
              sceneStyle: { backgroundColor: SkopColors.background },
              // the new tab pushes the old one out with no fade
              transitionSpec: {
                animation: 'timing',
                config: { duration: PUSH_MS, easing: Easing.inOut(Easing.cubic) },
              },
              sceneStyleInterpolator: ({ current }) => ({
                sceneStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: [-pageWidth, 0, pageWidth],
                      }),
                    },
                  ],
                },
              }),
            }}>
            {/* the file name index makes this the home route */}
            <Tabs.Screen name="index" options={{ title: 'Home' }} />
            {/* explore holds the insights screen */}
            <Tabs.Screen name="explore" options={{ title: 'Insights' }} />
          </Tabs>
        </View>

        {/* the header and nav stay still while the pages move */}
        <AppHeader title={onInsights ? 'Learn the URGE' : 'SKOP the URGE'} />
        <BottomNav active={onInsights ? 'insights' : 'home'} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', backgroundColor: SkopColors.background },
  page: { flex: 1, width: '100%', maxWidth: 960, alignSelf: 'center', backgroundColor: SkopColors.background },
  // clips the sliding pages to the page width on tablets
  scenes: { flex: 1, overflow: 'hidden' },
});
