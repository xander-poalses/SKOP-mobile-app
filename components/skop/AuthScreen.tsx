import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/skop/Brand';
import { SkopButton } from '@/components/skop/SkopButton';
import { SkopColors, SkopFonts } from '@/constants/skop-theme';
import { useAuth } from '@/context/auth';
import { usePreAccount } from '@/context/pre-account';
import { getAuthErrorMessage } from '@/lib/auth-error';

type AuthScreenProps = {
  mode: 'signup' | 'login';
};

export function AuthScreen({ mode }: AuthScreenProps) {
  // changes the fields and labels for each auth route
  const isSignup = mode === 'signup';
  const { logIn, signUp } = useAuth();
  const preAccount = usePreAccount();
  const { readyForSignup } = preAccount;

  // these values update as the user types into each field
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmedPassword, setConfirmedPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // auth uses columns on tablets and landscape screens
  const { height, width } = useWindowDimensions();
  const wideLayout = width >= 700 || width > height;
  const compactBrand = height < 600;
  const shortLandscape = width > height && height < 600;

  // checks the form before sending the details to firebase
  const submit = async () => {
    const cleanEmail = email.trim();
    setErrorMessage('');

    if (!cleanEmail || !password) {
      setErrorMessage('Enter your email and password.');
      return;
    }

    if (isSignup && password.length < 6) {
      setErrorMessage('Use a password with at least 6 characters.');
      return;
    }

    if (isSignup && password !== confirmedPassword) {
      setErrorMessage('The passwords do not match.');
      return;
    }

    if (isSignup && !readyForSignup) {
      router.replace('/welcome');
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);

    try {
      if (isSignup) {
        await signUp(cleanEmail, password);
      } else {
        await logIn(cleanEmail, password);
      }
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {isSignup && (
        <Pressable
          accessibilityLabel="Go back to date of birth"
          hitSlop={10}
          onPress={() => router.replace('/welcome?step=3')}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
          <Ionicons color={SkopColors.ink} name="arrow-back" size={30} />
        </Pressable>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardArea}>
        <ScrollView
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            wideLayout && styles.wideContent,
            shortLandscape && styles.shortLandscapeContent,
          ]}>
          <View style={styles.brandArea}>
            <Brand compact={compactBrand} />
          </View>

          <View style={[styles.formArea, wideLayout && styles.wideFormArea]}>
            {/* holds the email and password fields */}
            <View style={styles.form}>
              <Field
                autoComplete="email"
                editable={!submitting}
                keyboardType="email-address"
                label="EMAIL"
                onChangeText={setEmail}
                placeholder="example@gmail.com"
                textContentType="emailAddress"
                value={email}
              />
              <Field
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                editable={!submitting}
                label="PASSWORD"
                onChangeText={setPassword}
                onSubmitEditing={isSignup ? undefined : submit}
                placeholder={isSignup ? 'Create password here...' : 'Enter password here...'}
                secure
                textContentType={isSignup ? 'newPassword' : 'password'}
                value={password}
              />
              {/* signup needs the password entered twice */}
              {isSignup && (
                <Field
                  autoComplete="new-password"
                  editable={!submitting}
                  label="CONFIRM PASSWORD"
                  onChangeText={setConfirmedPassword}
                  onSubmitEditing={submit}
                  placeholder="Re-enter password here..."
                  secure
                  textContentType="newPassword"
                  value={confirmedPassword}
                />
              )}
            </View>

            {!!errorMessage && (
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {errorMessage}
              </Text>
            )}

            {/* switches between the login and signup routes */}
            <View style={styles.actions}>
              <SkopButton
                disabled={submitting}
                label={submitting ? 'PLEASE WAIT...' : isSignup ? 'CREATE ACCOUNT' : 'LOGIN'}
                onPress={submit}
                variant="green"
              />
              <SkopButton
                disabled={submitting}
                label={isSignup ? 'Switch to LOGIN' : 'Switch to SIGN-UP'}
                small
                onPress={() => router.replace(isSignup ? '/login' : readyForSignup ? '/signup' : '/welcome')}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// keeps every text field using the same layout
type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  editable?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoComplete?: 'email' | 'current-password' | 'new-password';
  textContentType?: 'emailAddress' | 'password' | 'newPassword';
  onSubmitEditing?: () => void;
};

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  secure,
  editable,
  keyboardType,
  autoComplete,
  textContentType,
  onSubmitEditing,
}: FieldProps) {
  // password fields can switch between hidden and visible text
  const [showValue, setShowValue] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          autoCapitalize="none"
          autoComplete={autoComplete}
          autoCorrect={false}
          editable={editable}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={SkopColors.muted}
          returnKeyType={onSubmitEditing ? 'done' : 'next'}
          secureTextEntry={secure && !showValue}
          style={styles.input}
          textContentType={textContentType}
          value={value}
        />
        {/* password fields show the eye icon */}
        {secure && (
          <Pressable
            accessibilityLabel={showValue ? 'Hide password' : 'Show password'}
            hitSlop={10}
            onPress={() => setShowValue((current) => !current)}>
            <Ionicons name={showValue ? 'eye-off-outline' : 'eye-outline'} size={24} color={SkopColors.ink} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SkopColors.background,
  },
  backButton: {
    position: 'absolute',
    top: 33,
    left: 24,
    zIndex: 2,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: { transform: [{ translateY: 3 }] },
  keyboardArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
    gap: 36,
  },
  wideContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 56,
  },
  shortLandscapeContent: {
    alignItems: 'flex-start',
    paddingVertical: 20,
    gap: 32,
  },
  brandArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formArea: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    gap: 28,
  },
  wideFormArea: {
    width: 'auto',
  },
  form: {
    gap: 22,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 20,
    fontFamily: SkopFonts.bold,
    color: SkopColors.ink,
  },
  inputWrap: {
    height: 56,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: SkopFonts.body,
    color: SkopColors.ink,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    fontFamily: SkopFonts.medium,
    textAlign: 'center',
  },
  actions: {
    gap: 20,
    height: 142,
  },
});
