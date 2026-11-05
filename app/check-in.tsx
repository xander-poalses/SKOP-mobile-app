import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SkopButton } from '@/components/skop/SkopButton';
import { SkopColors, SkopFonts, skopNumbers } from '@/constants/skop-theme';
import { useSkopSession } from '@/context/skop-session';

export default function CheckInScreen() {
  const { quitPlan, saveSpendCheckIn } = useSkopSession();
  const [amount, setAmount] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const parsedAmount = Number(amount.replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setErrorMessage('Enter an amount of R0 or more.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    await saveSpendCheckIn(parsedAmount);
    router.replace('/explore');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <View style={styles.page}>
          <View style={styles.copy}>
            <Text style={styles.title}>SPENDING CHECK-IN</Text>
            <Text style={styles.body}>
              How much did you spend during your last {quitPlan?.checkInCadence ?? 'check-in'} period?
            </Text>
            <Text style={styles.note}>This tracks spending, not nicotine use.</Text>
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.currency}>R</Text>
            <TextInput
              autoFocus
              editable={!saving}
              keyboardType="decimal-pad"
              onChangeText={(value) => setAmount(value.replace(/[^0-9.,]/g, ''))}
              placeholder="0.00"
              placeholderTextColor={SkopColors.muted}
              style={styles.input}
              value={amount}
            />
          </View>
          {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
          <View style={styles.actions}>
            <SkopButton disabled={saving} label="NOT NOW" onPress={() => router.back()} />
            <SkopButton
              disabled={saving}
              label={saving ? 'SAVING...' : 'SAVE'}
              onPress={save}
              variant="green"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SkopColors.background },
  keyboard: { flex: 1 },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    padding: 24,
    justifyContent: 'center',
    gap: 26,
  },
  copy: { alignItems: 'center', gap: 8 },
  title: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 29, textAlign: 'center' },
  body: { color: SkopColors.ink, fontFamily: SkopFonts.body, fontSize: 17, textAlign: 'center' },
  note: { color: SkopColors.muted, fontFamily: SkopFonts.body, fontSize: 13, textAlign: 'center' },
  inputWrap: {
    height: 72,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currency: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 27 },
  input: { ...skopNumbers, flex: 1, marginLeft: 8, color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 27 },
  error: { color: '#b42318', fontFamily: SkopFonts.medium, fontSize: 14, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 16, minHeight: 64 },
});
