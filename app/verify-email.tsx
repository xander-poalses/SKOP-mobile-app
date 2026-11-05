import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/skop/Brand';
import { SkopButton } from '@/components/skop/SkopButton';
import { SkopColors, SkopFonts } from '@/constants/skop-theme';
import { useAuth } from '@/context/auth';
import { getAuthErrorMessage } from '@/lib/auth-error';

const RESEND_WAIT_SECONDS = 30;

export default function VerifyEmailScreen() {
  const { logOut, refreshEmailVerification, resendEmailVerification, user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_WAIT_SECONDS);
  const [message, setMessage] = useState('We sent a verification link to your inbox.');
  const [errorMessage, setErrorMessage] = useState('');

  // counts down before another email can be requested
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const checkVerification = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    setErrorMessage('');

    try {
      const verified = await refreshEmailVerification();
      if (!verified) setMessage('That email is not verified yet. Open the link and try again.');
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setChecking(false);
    }
  }, [checking, refreshEmailVerification]);

  // coming back from the email app checks the account again
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkVerification();
    });

    return () => subscription.remove();
  }, [checkVerification]);

  const resend = async () => {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setErrorMessage('');

    try {
      await resendEmailVerification();
      setSecondsLeft(RESEND_WAIT_SECONDS);
      setMessage('A new verification email has been sent.');
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.page}>
        <Brand compact />

        <View style={styles.content}>
          <View style={styles.icon}>
            <Ionicons name="mail-outline" size={48} color={SkopColors.ink} />
          </View>
          <Text style={styles.title}>CHECK YOUR EMAIL</Text>
          <Text style={styles.body}>{message}</Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.email}>
            {user?.email}
          </Text>
          <Text style={styles.help}>The email may take a minute. Check your spam folder too.</Text>

          {!!errorMessage && (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {errorMessage}
            </Text>
          )}

          <View style={styles.actions}>
            <SkopButton
              disabled={checking}
              label={checking ? 'CHECKING...' : 'I HAVE VERIFIED'}
              onPress={checkVerification}
              variant="green"
            />
            <SkopButton
              disabled={secondsLeft > 0 || resending}
              label={
                secondsLeft > 0
                  ? `RESEND IN ${secondsLeft}s`
                  : resending
                    ? 'SENDING...'
                    : 'RESEND EMAIL'
              }
              onPress={resend}
              variant="yellow"
            />
          </View>

          <SkopButton label="USE ANOTHER ACCOUNT" small onPress={logOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SkopColors.background,
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 36,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    gap: 14,
  },
  icon: {
    width: 84,
    height: 84,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 28,
    textAlign: 'center',
  },
  body: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.body,
    fontSize: 17,
    textAlign: 'center',
  },
  email: {
    width: '100%',
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 17,
    textAlign: 'center',
  },
  help: {
    color: SkopColors.muted,
    fontFamily: SkopFonts.body,
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    height: 184,
    gap: 20,
    marginTop: 12,
  },
  error: {
    color: '#b42318',
    fontFamily: SkopFonts.medium,
    fontSize: 14,
    textAlign: 'center',
  },
});
