import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import { BitcountGridDouble_400Regular } from '@expo-google-fonts/bitcount-grid-double';
import { BitcountGridSingle_400Regular } from '@expo-google-fonts/bitcount-grid-single';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { SkopColors } from '@/constants/skop-theme';
import { AuthProvider, useAuth } from '@/context/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SkopSessionProvider, useSkopSession } from '@/context/skop-session';
import { PreAccountProvider, usePreAccount } from '@/context/pre-account';
import {
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
  type NotificationResponse,
} from '@/lib/skop-notifications';

// keeps the splash screen open while the fonts load
SplashScreen.preventAutoHideAsync();

// keeps the tabs behind screens that open on top
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const baseTheme = colorScheme === 'light' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: SkopColors.background,
      card: SkopColors.background,
    },
  };

  // loads each font used by the skop theme
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_800ExtraBold,
    BitcountGridDouble_400Regular,
    BitcountGridSingle_400Regular,
  });

  // the native root stays cream while screens mount and change
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(SkopColors.background);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <PreAccountProvider>
      <AuthProvider>
        {/* shares the streak and game score with every screen */}
        <SkopSessionProvider>
          <ThemeProvider value={navigationTheme}>
            <RootNavigator />
            <StatusBar style="dark" />
          </ThemeProvider>
        </SkopSessionProvider>
      </AuthProvider>
    </PreAccountProvider>
  );
}

function RootNavigator() {
  const { emailVerified, loading, user } = useAuth();
  const { legacyPlan, profileLoading, quitPlan } = useSkopSession();
  const { loading: preAccountLoading, readyForSignup } = usePreAccount();
  const appLoading = loading || profileLoading || preAccountLoading;

  // keeps the splash screen up while firebase and the quit plan load
  useEffect(() => {
    if (!appLoading) SplashScreen.hideAsync();
  }, [appLoading]);

  // notification taps open the check-in without using a remote push service
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const openNotification = (response: NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (url === '/check-in') router.push('/check-in');
    };
    void getLastNotificationResponseAsync().then(openNotification);
    const subscription = addNotificationResponseReceivedListener(openNotification);
    return () => subscription.remove();
  }, []);

  if (appLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: SkopColors.background } }}>
      {/* the main app needs both a firebase user and a quit plan */}
      <Stack.Protected guard={Boolean(user && emailVerified && quitPlan)}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="check-in" options={{ animation: 'fade' }} />
        {/* fade avoids moving the live blurred header during this transition */}
        <Stack.Screen name="settings" options={{ animation: 'fade' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
      </Stack.Protected>

      {/* new users finish these two steps before opening the app */}
      <Stack.Protected guard={Boolean(user && emailVerified && !quitPlan && !legacyPlan)}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      {/* old profiles choose their nicotine product before moving to version two */}
      <Stack.Protected guard={Boolean(user && emailVerified && legacyPlan)}>
        <Stack.Screen name="profile-migration" />
      </Stack.Protected>

      {/* email accounts stay here until firebase confirms the address */}
      <Stack.Protected guard={Boolean(user && !emailVerified)}>
        <Stack.Screen name="verify-email" />
      </Stack.Protected>

      {/* these screens are only needed while signed out */}
      <Stack.Protected guard={!user}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="youth-support" />
        <Stack.Screen name="login" />
        <Stack.Protected guard={readyForSignup}>
          <Stack.Screen name="signup" />
        </Stack.Protected>
      </Stack.Protected>

      {/* breakout can distract users without requiring an account or saving a session */}
      <Stack.Screen name="urge" options={{ animation: 'fade' }} />
      <Stack.Screen name="legal" options={{ animation: 'fade' }} />
    </Stack>
  );
}
