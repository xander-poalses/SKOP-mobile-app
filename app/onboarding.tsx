import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/skop/Brand';
import { SkopDatePicker } from '@/components/skop/SkopDatePicker';
import { SkopButton } from '@/components/skop/SkopButton';
import { SkopColors, SkopFonts, skopShadow } from '@/constants/skop-theme';
import { usePreAccount } from '@/context/pre-account';
import {
  type CheckInCadence,
  type ProductType,
  type QuitJourney,
  type ReminderTime,
  type SpendPeriod,
  useSkopSession,
} from '@/context/skop-session';
import {
  addDays,
  dateToInputValue,
  inputValueToDate,
  startOfDay,
  validateJourneyDate,
} from '@/lib/skop-domain';

const products: { label: string; body: string; value: ProductType }[] = [
  { label: 'CIGARETTES', body: 'Support for stopping smoking.', value: 'cigarettes' },
  { label: 'VAPING', body: 'Support for stopping vaping.', value: 'vaping' },
  { label: 'BOTH', body: 'One plan for smoking and vaping.', value: 'both' },
];
const journeys: { label: string; body: string; value: QuitJourney }[] = [
  { label: "I'VE ALREADY QUIT", body: 'Bring your current progress into SKOP.', value: 'already_quit' },
  { label: 'CUT DOWN FIRST', body: 'Track spending while working towards a quit date.', value: 'cut_down' },
  { label: "I'M READY TO QUIT", body: 'Stop today or choose a date ahead.', value: 'ready_to_quit' },
];
const spendPeriods: { label: string; value: SpendPeriod }[] = [
  { label: 'DAILY', value: 'daily' },
  { label: 'WEEKLY', value: 'weekly' },
  { label: 'MONTHLY', value: 'monthly' },
];
const cadences: { label: string; value: CheckInCadence }[] = [
  { label: 'DAILY', value: 'daily' },
  { label: 'WEEKLY', value: 'weekly' },
  { label: 'MONTHLY', value: 'monthly' },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useSkopSession();
  const preAccount = usePreAccount();
  const firstStep = preAccount.productType ? 2 : 1;
  const today = new Date();
  const [step, setStep] = useState(firstStep);
  const [productType, setProductType] = useState<ProductType>(preAccount.productType ?? 'vaping');
  const [journey, setJourney] = useState<QuitJourney>('already_quit');
  const [dateValue, setDateValue] = useState(dateToInputValue(today));
  const [spendPeriod, setSpendPeriod] = useState<SpendPeriod>('daily');
  const [spendAmount, setSpendAmount] = useState('');
  const [checkInCadence, setCheckInCadence] = useState<CheckInCadence>('weekly');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState<ReminderTime>('evening');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const totalSteps = journey === 'cut_down' ? 5 : 4;
  const visibleStep = preAccount.productType ? step - 1 : step;
  const visibleTotalSteps = preAccount.productType ? totalSteps - 1 : totalSteps;

  const date = useMemo(() => inputValueToDate(dateValue), [dateValue]);

  const moveNext = () => {
    setErrorMessage('');
    if (step === 3) {
      const dateError = validateJourneyDate(journey, date);
      if (dateError) {
        setErrorMessage(dateError);
        return;
      }
    }
    if (step === 4) {
      const amount = Number(spendAmount.replace(',', '.'));
      if (!Number.isFinite(amount) || amount <= 0) {
        setErrorMessage('Enter a spend amount above R0.');
        return;
      }
      if (journey !== 'cut_down') {
        void finishOnboarding();
        return;
      }
    }
    setStep((current) => Math.min(totalSteps, current + 1));
  };

  const finishOnboarding = async () => {
    const amount = Number(spendAmount.replace(',', '.'));
    const dateError = validateJourneyDate(journey, date);
    if (dateError) {
      setStep(3);
      setErrorMessage(dateError);
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setStep(4);
      setErrorMessage('Enter a spend amount above R0.');
      return;
    }

    const quittingNow =
      journey === 'ready_to_quit' && startOfDay(date).getTime() === startOfDay(new Date()).getTime();
    const alreadyQuit = journey === 'already_quit' || quittingNow;
    setSaving(true);
    setErrorMessage('');

    try {
      await completeOnboarding({
        profileVersion: 2,
        productType,
        journey,
        status: alreadyQuit ? 'quit' : journey === 'cut_down' ? 'reducing' : 'scheduled',
        quitDate: alreadyQuit ? dateValue : null,
        targetQuitDate: alreadyQuit ? null : dateValue,
        spendPeriod,
        spendAmount: Math.round(amount * 100) / 100,
        checkInCadence: journey === 'cut_down' ? checkInCadence : null,
        remindersEnabled: journey === 'cut_down' ? remindersEnabled : false,
        reminderTime: journey === 'cut_down' && remindersEnabled ? reminderTime : null,
        ageConfirmedAt: new Date().toISOString(),
        ageGroup: preAccount.ageGroup ?? '18_plus',
        guardianConsentAt: preAccount.guardianConsentAt,
        guardianConsentVersion: preAccount.guardianConsentVersion,
        guardianPinHash: preAccount.guardianPinHash,
        guardianPinSalt: preAccount.guardianPinSalt,
        guardianRelationship: preAccount.guardianRelationship,
      });
      await preAccount.clearPreAccount();
    } catch {
      setErrorMessage('Your setup could not be saved. Please try again.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardArea}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}>
          <View style={styles.topRow}>
            <Brand compact />
            <View style={styles.stepBlock}>
              <Text style={styles.stepText}>{visibleStep} OF {visibleTotalSteps}</Text>
              <View style={styles.progressRail}>
                <View style={[styles.progressFill, { width: `${(visibleStep / visibleTotalSteps) * 100}%` }]} />
              </View>
            </View>
          </View>

          <View style={styles.form}>
            {step === 1 && (
              <ChoiceStep
                body="Your support will match what you use."
                options={products}
                selected={productType}
                title="WHAT DO YOU WANT TO SKOP?"
                onSelect={setProductType}
              />
            )}
            {step === 2 && (
              <ChoiceStep
                body="Choose the starting point that fits you."
                options={journeys}
                selected={journey}
                title="WHERE ARE YOU STARTING?"
                onSelect={(value) => {
                  setJourney(value);
                  if (value === 'already_quit') setDateValue(dateToInputValue(new Date()));
                  if (value !== 'already_quit') setDateValue(dateToInputValue(addDays(new Date(), 1)));
                }}
              />
            )}
            {step === 3 && (
              <>
                <Heading
                  title={journey === 'already_quit' ? 'WHEN DID YOU QUIT?' : 'WHEN DO YOU WANT TO QUIT?'}
                  body={
                    journey === 'already_quit'
                      ? 'Choose today or a date in the past.'
                      : journey === 'cut_down'
                        ? 'This is the date you are working towards.'
                        : 'Choose today or a date ahead.'
                  }
                />
                <DateFields journey={journey} value={dateValue} onChange={setDateValue} />
              </>
            )}
            {step === 4 && (
              <>
                <Heading
                  title={journey === 'already_quit' ? 'WHAT DID IT COST?' : 'WHAT DOES IT COST NOW?'}
                  body="Choose the time period you use for this amount."
                />
                <SegmentedOptions
                  options={spendPeriods}
                  selected={spendPeriod}
                  onSelect={setSpendPeriod}
                />
                <View style={styles.amountBlock}>
                  <Text style={styles.fieldLabel}>{spendPeriod.toUpperCase()} SPEND</Text>
                  <View style={styles.amountInputWrap}>
                    <Text style={styles.currency}>R</Text>
                    <TextInput
                      editable={!saving}
                      keyboardType="decimal-pad"
                      onChangeText={(value) => setSpendAmount(value.replace(/[^0-9.,]/g, ''))}
                      placeholder="0.00"
                      placeholderTextColor={SkopColors.muted}
                      style={styles.amountInput}
                      value={spendAmount}
                    />
                  </View>
                </View>
              </>
            )}
            {step === 5 && (
              <>
                <Heading
                  title="HOW OFTEN WILL YOU CHECK IN?"
                  body="This tracks spending, not nicotine use."
                />
                <SegmentedOptions options={cadences} selected={checkInCadence} onSelect={setCheckInCadence} />
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: remindersEnabled }}
                  onPress={() => setRemindersEnabled((current) => !current)}
                  style={styles.reminderToggle}>
                  <View style={[styles.checkbox, remindersEnabled && styles.checkboxChecked]}>
                    {remindersEnabled && <Ionicons name="checkmark" size={18} color={SkopColors.surface} />}
                  </View>
                  <View style={styles.reminderCopy}>
                    <Text style={styles.reminderTitle}>REMIND ME</Text>
                    <Text style={styles.reminderBody}>Use a general SKOP notification.</Text>
                  </View>
                </Pressable>
                {remindersEnabled && (
                  <SegmentedOptions
                    options={[
                      { label: 'MORNING 08:00', value: 'morning' as const },
                      { label: 'EVENING 20:00', value: 'evening' as const },
                    ]}
                    selected={reminderTime}
                    onSelect={setReminderTime}
                  />
                )}
              </>
            )}

            {!!errorMessage && (
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>{errorMessage}</Text>
            )}
          </View>

          <View style={styles.actions}>
            {step > firstStep && <SkopButton disabled={saving} label="BACK" onPress={() => setStep((current) => current - 1)} />}
            <SkopButton
              disabled={saving}
              label={saving ? 'SAVING...' : step === totalSteps ? 'START SKOP' : 'CONTINUE'}
              onPress={step === totalSteps ? finishOnboarding : moveNext}
              variant="green"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Heading({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.heading}>
      <Text adjustsFontSizeToFit numberOfLines={2} style={styles.title}>{title}</Text>
      <Text style={styles.bodyText}>{body}</Text>
    </View>
  );
}

function ChoiceStep<T extends string>({
  body,
  onSelect,
  options,
  selected,
  title,
}: {
  body: string;
  onSelect: (value: T) => void;
  options: { label: string; body: string; value: T }[];
  selected: T;
  title: string;
}) {
  return (
    <>
      <Heading body={body} title={title} />
      <View style={styles.choiceList}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => {
              void Haptics.selectionAsync();
              onSelect(option.value);
            }}
            style={({ pressed }) => [
              styles.choiceButton,
              selected === option.value && styles.choiceButtonSelected,
              pressed && styles.buttonPressed,
            ]}>
            <View style={styles.choiceCopy}>
              <Text style={styles.choiceTitle}>{option.label}</Text>
              <Text style={styles.choiceBody}>{option.body}</Text>
            </View>
            <Ionicons
              color={SkopColors.ink}
              name={selected === option.value ? 'checkmark-circle' : 'ellipse-outline'}
              size={26}
            />
          </Pressable>
        ))}
      </View>
    </>
  );
}

function SegmentedOptions<T extends string>({
  onSelect,
  options,
  selected,
}: {
  onSelect: (value: T) => void;
  options: { label: string; value: T }[];
  selected: T;
}) {
  return (
    <View style={styles.periodRow}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => {
            void Haptics.selectionAsync();
            onSelect(option.value);
          }}
          style={({ pressed }) => [
            styles.periodButton,
            selected === option.value && styles.periodButtonSelected,
            pressed && styles.buttonPressed,
          ]}>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.periodText}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function DateFields({
  journey,
  onChange,
  value,
}: {
  journey: QuitJourney;
  onChange: (value: string) => void;
  value: string;
}) {
  const [yearValue, monthValue, dayValue] = value.split('-');
  const update = (part: 'day' | 'month' | 'year', next: string) => {
    const day = part === 'day' ? next : dayValue;
    const month = part === 'month' ? next : monthValue;
    const year = part === 'year' ? next : yearValue;
    onChange(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  };
  const todayValue = dateToInputValue(new Date());
  const minimumDate =
    journey === 'already_quit'
      ? '1900-01-01'
      : journey === 'cut_down'
        ? dateToInputValue(addDays(new Date(), 1))
        : todayValue;
  const maximumDate = journey === 'already_quit' ? todayValue : undefined;

  return (
    <View style={styles.datePickerBlock}>
      <View style={styles.dateRow}>
        <DateInput label="DAY" maxLength={2} value={String(Number(dayValue))} onChange={(next) => update('day', next)} />
        <DateInput label="MONTH" maxLength={2} value={String(Number(monthValue))} onChange={(next) => update('month', next)} />
        <DateInput label="YEAR" maxLength={4} value={yearValue} onChange={(next) => update('year', next)} wide />
      </View>
      <SkopDatePicker
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        onChange={onChange}
        value={value}
      />
    </View>
  );
}

function DateInput({
  label,
  maxLength,
  onChange,
  value,
  wide,
}: {
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  value: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.dateField, wide && styles.yearField]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.dateInputWrap}>
        <TextInput
          keyboardType="number-pad"
          maxLength={maxLength}
          onChangeText={(next) => onChange(next.replace(/\D/g, ''))}
          selectTextOnFocus
          style={styles.dateInput}
          value={value}
        />
        <Ionicons color={SkopColors.ink} name="calendar-outline" size={19} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SkopColors.background },
  keyboardArea: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: 24,
    gap: 28,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepBlock: { width: '48%', maxWidth: 300, alignItems: 'flex-end', gap: 7 },
  stepText: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 13 },
  progressRail: {
    width: '100%',
    height: 9,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    backgroundColor: SkopColors.surface,
  },
  progressFill: { height: '100%', backgroundColor: SkopColors.green },
  form: { flex: 1, justifyContent: 'center', minHeight: 380, gap: 24 },
  heading: { alignItems: 'center', gap: 7 },
  title: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 29, textAlign: 'center' },
  bodyText: { color: SkopColors.ink, fontFamily: SkopFonts.body, fontSize: 16, textAlign: 'center' },
  choiceList: { gap: 14 },
  choiceButton: {
    minHeight: 76,
    padding: 16,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...skopShadow,
  },
  choiceButtonSelected: { backgroundColor: SkopColors.yellow },
  choiceCopy: { flex: 1, minWidth: 0 },
  choiceTitle: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 17 },
  choiceBody: { color: SkopColors.ink, fontFamily: SkopFonts.body, fontSize: 14, marginTop: 2 },
  datePickerBlock: { gap: 18 },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 1, gap: 6 },
  yearField: { flex: 1.25 },
  fieldLabel: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 14 },
  dateInputWrap: {
    height: 58,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 20,
    textAlign: 'center',
  },
  periodRow: { flexDirection: 'row', gap: 10 },
  periodButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 4px 0px 0px ${SkopColors.shadow}`,
  },
  periodButtonSelected: { backgroundColor: SkopColors.yellow },
  periodText: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 14, textAlign: 'center' },
  amountBlock: { gap: 7 },
  amountInputWrap: {
    height: 64,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currency: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 23 },
  amountInput: { flex: 1, color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 23, marginLeft: 8 },
  reminderToggle: {
    minHeight: 72,
    padding: 14,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 4,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: SkopColors.green },
  reminderCopy: { flex: 1 },
  reminderTitle: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 16 },
  reminderBody: { color: SkopColors.ink, fontFamily: SkopFonts.body, fontSize: 14 },
  errorText: { color: '#b42318', fontFamily: SkopFonts.medium, fontSize: 14, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 16, minHeight: 64 },
  buttonPressed: { transform: [{ translateY: 3 }] },
});
