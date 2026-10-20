import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SkopButton } from '@/components/skop/SkopButton';
import { SkopDatePicker } from '@/components/skop/SkopDatePicker';
import { QuitSupportContact } from '@/components/skop/QuitSupportContact';
import { SkopColors, SkopFonts } from '@/constants/skop-theme';
import { usePreAccount } from '@/context/pre-account';
import { dateToInputValue, getAgeGroup, inputValueToDate } from '@/lib/skop-domain';
import type { ProductType } from '@/lib/skop-firestore';

const products: { label: string; body: string; value: ProductType }[] = [
  { label: 'CIGARETTES', body: 'Support for stopping smoking.', value: 'cigarettes' },
  { label: 'VAPING', body: 'Support for stopping vaping.', value: 'vaping' },
  { label: 'BOTH', body: 'One plan for smoking and vaping.', value: 'both' },
];

export default function WelcomeScreen() {
  const params = useLocalSearchParams<{ step?: string }>();
  const preAccount = usePreAccount();
  const [step, setStep] = useState(params.step === '3' ? 3 : 1);
  const [productType, setProductType] = useState<ProductType>(preAccount.productType ?? 'vaping');
  const [birthDateValue, setBirthDateValue] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianBirthDateValue, setGuardianBirthDateValue] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('');
  const [guardianPin, setGuardianPin] = useState('');
  const [guardianConfirmed, setGuardianConfirmed] = useState(false);
  const [guardianSaving, setGuardianSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const birthDate = useMemo(() => inputValueToDate(birthDateValue), [birthDateValue]);
  const guardianBirthDate = useMemo(
    () => inputValueToDate(guardianBirthDateValue),
    [guardianBirthDateValue],
  );

  const continueFlow = async () => {
    setErrorMessage('');
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      await preAccount.setProductType(productType);
      setStep(3);
      return;
    }
    if (step === 3) {
      const ageGroup = getAgeGroup(birthDate);
      if (!ageGroup) {
        setErrorMessage('Enter a valid date of birth.');
        return;
      }
      await preAccount.setAgeResult(ageGroup);
      if (ageGroup === 'under_13') {
        router.replace('/youth-support');
        return;
      }
      if (ageGroup === '13_17') {
        setStep(4);
        return;
      }
      router.replace('/signup');
      return;
    }
    if (!guardianName.trim() || !guardianRelationship.trim()) {
      setErrorMessage('Enter the guardian\'s name and relationship.');
      return;
    }
    if (getAgeGroup(guardianBirthDate) !== '18_plus') {
      setErrorMessage('The parent or guardian must be 18 or older.');
      return;
    }
    if (!/^\d{6}$/.test(guardianPin)) {
      setErrorMessage('Create a 6-digit guardian PIN.');
      return;
    }
    if (!guardianConfirmed) {
      setErrorMessage('The parent or guardian must confirm consent.');
      return;
    }
    setGuardianSaving(true);
    try {
      const bytes = await Crypto.getRandomBytesAsync(16);
      const pinSalt = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      const pinHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${pinSalt}:${guardianPin}`,
      );
      await preAccount.setGuardianAttestation({
        consentAt: new Date().toISOString(),
        consentVersion: 1,
        pinHash,
        pinSalt,
        relationship: guardianRelationship.trim(),
      });
      router.replace('/signup');
    } catch {
      setErrorMessage('The guardian consent could not be saved. Please try again.');
    } finally {
      setGuardianSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View
          accessibilityLabel={`Step ${step} of 4`}
          accessibilityRole="progressbar"
          style={styles.stepIndicator}>
          {[1, 2, 3, 4].map((item) => (
            <View
              key={item}
              style={[
                styles.stepDot,
                item < step && styles.completedStepDot,
                item === step && styles.currentStepDot,
              ]}
            />
          ))}
        </View>

        {step === 1 ? (
          <View style={styles.welcomeMarkWrap}>
            <Image
              accessibilityLabel="SKOP logo"
              contentFit="contain"
              source={require('@/assets/images/SKOP-WordLogo-withSlogan-NoBackground.svg')}
              style={styles.welcomeMark}
            />
          </View>
        ) : null}

        <View style={styles.form}>
          {step === 2 && (
            <>
              <View style={styles.headingBlock}>
                <Text style={styles.title}>WHAT DO YOU WANT TO SKOP?</Text>
                <Text style={styles.body}>Choose the support that fits you.</Text>
              </View>
              <View style={styles.options}>
                {products.map((product) => (
                  <SkopButton
                    key={product.value}
                    label={product.label}
                    onPress={() => setProductType(product.value)}
                    variant={productType === product.value ? 'yellow' : undefined}
                  />
                ))}
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <View style={styles.headingBlock}>
                <Text style={styles.title}>WHEN WERE YOU BORN?</Text>
                <Text style={styles.body}>Get the right support based on your age.</Text>
                <Text style={styles.privacyNote}>
                  Your birth date stays on this screen. SKOP saves only your age group if you continue.
                </Text>
              </View>
              <BirthDateFields value={birthDateValue} onChange={setBirthDateValue} />
              <Text style={styles.ageNotice}>
                *Please enter your date of birth accurately. It determines the support and consent steps
                shown to you. Providing false information may lead to restricted or terminated access.
                Nothing in this notice limits rights or protections that cannot lawfully be excluded.
              </Text>
            </>
          )}

          {step === 4 && (
            <>
              <View style={[styles.headingBlock, styles.guardianHeading]}>
                <Text style={[styles.title, styles.guardianHeadingText]}>CONTINUE WITH A GUARDIAN</Text>
                <Text style={[styles.body, styles.guardianHeadingText]}>
                  Ask your parent or guardian to complete this step with you.
                </Text>
                <Text style={[styles.privacyNote, styles.guardianHeadingText]}>
                  Their name and birth date stay on this screen. SKOP saves only the consent record below.
                </Text>
              </View>
              <View style={styles.guardianField}>
                <Text style={styles.fieldLabel}>PARENT OR GUARDIAN NAME</Text>
                <TextInput
                  autoCapitalize="words"
                  editable={!guardianSaving}
                  onChangeText={setGuardianName}
                  placeholder="Full name"
                  placeholderTextColor={SkopColors.muted}
                  style={styles.guardianInput}
                  value={guardianName}
                />
              </View>
              <View style={styles.guardianField}>
                <Text style={styles.fieldLabel}>GUARDIAN DATE OF BIRTH</Text>
                <BirthDateFields value={guardianBirthDateValue} onChange={setGuardianBirthDateValue} />
              </View>
              <View style={styles.guardianField}>
                <Text style={styles.fieldLabel}>RELATIONSHIP TO THE YOUNG PERSON</Text>
                <TextInput
                  editable={!guardianSaving}
                  onChangeText={setGuardianRelationship}
                  placeholder="For example, parent or legal guardian"
                  placeholderTextColor={SkopColors.muted}
                  style={styles.guardianInput}
                  value={guardianRelationship}
                />
              </View>
              <View style={styles.guardianField}>
                <Text style={styles.fieldLabel}>CREATE A 6-DIGIT GUARDIAN PIN</Text>
                <TextInput
                  editable={!guardianSaving}
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={(value) => setGuardianPin(value.replace(/\D/g, ''))}
                  placeholder="000000"
                  placeholderTextColor={SkopColors.muted}
                  secureTextEntry
                  style={styles.guardianInput}
                  value={guardianPin}
                />
              </View>
              <Text style={styles.consentCopy}>
                I agree that this young person may create a SKOP account. SKOP will save their email, nicotine
                quit plan, spending check-ins and game sessions. I understand that I can ask for the account and
                its data to be deleted.
              </Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: guardianConfirmed }}
                onPress={() => setGuardianConfirmed((current) => !current)}
                style={styles.consentCheck}>
                <View style={[styles.checkbox, guardianConfirmed && styles.checkboxChecked]}>
                  {guardianConfirmed ? <Ionicons color={SkopColors.surface} name="checkmark" size={20} /> : null}
                </View>
                <Text style={styles.consentCheckText}>
                  I am 18 or older, I can give consent for this young person, and I agree to the statement above.
                </Text>
              </Pressable>
              <QuitSupportContact />
            </>
          )}

          {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        </View>

        <View style={styles.actions}>
          <SkopButton
            disabled={guardianSaving}
            label={guardianSaving ? 'SAVING...' : step === 4 ? 'CREATE THEIR ACCOUNT' : 'CONTINUE'}
            onPress={continueFlow}
            variant="green"
          />
          {step > 1 ? (
            <SkopButton label="BACK" onPress={() => setStep((current) => Math.max(1, current - 1))} small />
          ) : (
            <SkopButton label="I ALREADY HAVE AN ACCOUNT" onPress={() => router.push('/login')} small />
          )}
          {step === 1 && (
            <SkopButton label="DATA & HEALTH NOTICE" onPress={() => router.push('/legal')} small />
          )}
        </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function BirthDateFields({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-') : ['', '', ''];
  const [year, setYear] = useState(initialDate[0]);
  const [month, setMonth] = useState(initialDate[1]);
  const [day, setDay] = useState(initialDate[2]);

  const update = (nextDay: string, nextMonth: string, nextYear: string) => {
    setDay(nextDay);
    setMonth(nextMonth);
    setYear(nextYear);
    onChange(
      nextYear.length === 4 && nextMonth.length > 0 && nextDay.length > 0
        ? `${nextYear}-${nextMonth.padStart(2, '0')}-${nextDay.padStart(2, '0')}`
        : '',
    );
  };

  return (
    <View style={styles.dateBlock}>
      <View style={styles.dateRow}>
        <DateField label="DAY" maxLength={2} value={day} onChange={(next) => update(next, month, year)} />
        <DateField label="MONTH" maxLength={2} value={month} onChange={(next) => update(day, next, year)} />
        <DateField label="YEAR" maxLength={4} value={year} onChange={(next) => update(day, month, next)} />
      </View>
      <SkopDatePicker
        maximumDate={dateToInputValue(new Date())}
        minimumDate="1906-01-01"
        onChange={(nextValue) => {
          const [nextYear, nextMonth, nextDay] = nextValue.split('-');
          update(nextDay, nextMonth, nextYear);
        }}
        value={value}
      />
    </View>
  );
}

function DateField({ label, maxLength, value, onChange }: {
  label: string;
  maxLength: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.dateField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        keyboardType="number-pad"
        maxLength={maxLength}
        onChangeText={(next) => onChange(next.replace(/[^0-9]/g, ''))}
        placeholder={label === 'YEAR' ? 'YYYY' : label === 'MONTH' ? 'MM' : 'DD'}
        placeholderTextColor={SkopColors.muted}
        style={styles.dateInput}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SkopColors.background },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  welcomeMarkWrap: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeMark: { width: '88%', maxWidth: 520, aspectRatio: 644 / 282 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    justifyContent: 'space-between',
    gap: 32,
  },
  stepIndicator: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 28,
  },
  stepDot: {
    width: 42,
    height: 10,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 4,
    backgroundColor: SkopColors.surface,
  },
  completedStepDot: { backgroundColor: SkopColors.green },
  currentStepDot: { backgroundColor: SkopColors.yellow },
  form: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: 24 },
  headingBlock: { alignItems: 'center', gap: 12 },
  guardianHeading: { width: '100%', alignItems: 'flex-start' },
  guardianHeadingText: { width: '100%', textAlign: 'left' },
  title: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 34, textAlign: 'center' },
  body: { color: SkopColors.ink, fontFamily: SkopFonts.body, fontSize: 18, textAlign: 'center' },
  privacyNote: { color: SkopColors.muted, fontFamily: SkopFonts.body, fontSize: 14, textAlign: 'center' },
  ageNotice: { color: SkopColors.muted, fontFamily: SkopFonts.body, fontSize: 12, lineHeight: 17 },
  options: { gap: 16 },
  dateBlock: { gap: 20 },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 1, gap: 6 },
  fieldLabel: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 14 },
  dateInput: {
    minHeight: 58,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.surface,
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 20,
    textAlign: 'center',
    boxShadow: `0px 6px 0px 0px ${SkopColors.shadow}`,
  },
  consentCopy: { color: SkopColors.ink, fontFamily: SkopFonts.body, fontSize: 15, lineHeight: 22 },
  guardianField: { gap: 7 },
  guardianInput: {
    minHeight: 58,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.surface,
    color: SkopColors.ink,
    fontFamily: SkopFonts.body,
    fontSize: 16,
    paddingHorizontal: 16,
  },
  consentCheck: {
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: SkopColors.green },
  consentCheckText: { flex: 1, color: SkopColors.ink, fontFamily: SkopFonts.body, fontSize: 14, lineHeight: 20 },
  errorText: { color: '#b42318', fontFamily: SkopFonts.medium, fontSize: 14, textAlign: 'center' },
  actions: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: 16 },
});
