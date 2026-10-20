import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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

import { SkopButton } from '@/components/skop/SkopButton';
import { SkopDatePicker } from '@/components/skop/SkopDatePicker';
import { SkopColors, SkopFonts, skopShadow } from '@/constants/skop-theme';
import { useAuth } from '@/context/auth';
import { useSkopSession } from '@/context/skop-session';
import { getAuthErrorMessage } from '@/lib/auth-error';
import {
  type CheckInCadence,
  type ProductType,
  type QuitJourney,
  type ReminderTime,
  type SpendPeriod,
} from '@/lib/skop-firestore';

export default function SettingsScreen() {
  const { quitPlan, resetStreak, updateQuitPlan } = useSkopSession();
  const { deleteAccount, logOut, sendPasswordReset, user } = useAuth();

  // controls whether the reset warning is open
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [accountMessage, setAccountMessage] = useState('');
  const [accountError, setAccountError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [editingPlan, setEditingPlan] = useState(false);
  const [planError, setPlanError] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductType>('cigarettes');
  const [editJourney, setEditJourney] = useState<QuitJourney>('already_quit');
  const [editDate, setEditDate] = useState('');
  const [editSpendPeriod, setEditSpendPeriod] = useState<SpendPeriod>('daily');
  const [editSpend, setEditSpend] = useState('');
  const [editCadence, setEditCadence] = useState<CheckInCadence>('weekly');
  const [editReminders, setEditReminders] = useState(false);
  const [editReminderTime, setEditReminderTime] = useState<ReminderTime>('morning');

  // settings use columns when the screen has room for them
  const { height, width } = useWindowDimensions();
  // the split layout needs tablet height as well as tablet width
  const wideLayout = width >= 700 && height >= 600 && width > height;
  const compact = height < 600;
  const pageWidth = Math.min(width, 960);
  const leftColumnWidth = wideLayout
    ? Math.min(520, Math.max(0, pageWidth - 48 - 40 - 360))
    : Math.min(520, Math.max(0, width - 48));
  const accountButtonWidth = wideLayout ? (leftColumnWidth - 14) / 2 : leftColumnWidth;
  const accountButtonFontSize = wideLayout
    ? Math.max(13, Math.min(20, Math.floor((accountButtonWidth - 24) / (15 * 0.72))))
    : 20;

  const openPlanEditor = () => {
    if (!quitPlan) return;
    setEditProduct(quitPlan.productType);
    setEditJourney(quitPlan.journey);
    setEditDate(quitPlan.quitDate ?? quitPlan.targetQuitDate ?? '');
    setEditSpendPeriod(quitPlan.spendPeriod);
    setEditSpend(String(quitPlan.spendAmount));
    setEditCadence(quitPlan.checkInCadence ?? 'weekly');
    setEditReminders(quitPlan.remindersEnabled);
    setEditReminderTime(quitPlan.reminderTime ?? 'morning');
    setPlanError('');
    setEditingPlan(true);
  };

  const savePlan = async () => {
    if (!quitPlan) return;
    const amount = Number(editSpend.replace(',', '.'));
    const selectedDate = parseDateOnly(editDate);
    const today = startOfToday();

    if (!selectedDate) {
      setPlanError('Enter the date as YYYY-MM-DD.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setPlanError('Enter a spend amount above R0.');
      return;
    }
    if (editJourney === 'already_quit' && selectedDate > today) {
      setPlanError('An existing quit date cannot be in the future.');
      return;
    }
    if (editJourney === 'cut_down' && selectedDate <= today) {
      setPlanError('A cut-down target date must be in the future.');
      return;
    }
    if (editJourney === 'ready_to_quit' && selectedDate < today) {
      setPlanError('A planned quit date cannot be in the past.');
      return;
    }

    setSavingPlan(true);
    setPlanError('');
    try {
      await updateQuitPlan({
        ...quitPlan,
        productType: editProduct,
        journey: editJourney,
        status:
          editJourney === 'already_quit'
            ? 'quit'
            : editJourney === 'cut_down'
              ? 'reducing'
              : 'scheduled',
        quitDate: editJourney === 'already_quit' ? editDate : null,
        targetQuitDate: editJourney === 'already_quit' ? null : editDate,
        spendPeriod: editSpendPeriod,
        spendAmount: amount,
        checkInCadence: editJourney === 'cut_down' ? editCadence : null,
        remindersEnabled: editJourney === 'cut_down' ? editReminders : false,
        reminderTime: editJourney === 'cut_down' && editReminders ? editReminderTime : null,
      });
      setEditingPlan(false);
    } catch {
      setPlanError('Your quit plan could not be saved. Please try again.');
    } finally {
      setSavingPlan(false);
    }
  };

  // clears the streak and returns home
  const confirmReset = () => {
    resetStreak();
    setConfirmingReset(false);
    router.replace('/');
  };

  // firebase clears the saved user and the route guard opens signup
  const handleLogout = async () => {
    setLogoutError('');
    setLoggingOut(true);

    try {
      await logOut();
    } catch (error) {
      setLogoutError(getAuthErrorMessage(error));
      setLoggingOut(false);
    }
  };

  // firebase emails the user a link instead of changing a password in the app
  const handlePasswordReset = async () => {
    setAccountError('');
    setAccountMessage('');
    setSendingReset(true);

    try {
      await sendPasswordReset();
      setAccountMessage('Password reset email sent.');
    } catch (error) {
      setAccountError(getAuthErrorMessage(error));
    } finally {
      setSendingReset(false);
    }
  };

  // reauthentication runs before firestore and auth data are removed
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setAccountError('Enter your current password.');
      return;
    }

    setAccountError('');
    setDeletingAccount(true);

    try {
      await deleteAccount(deletePassword);
    } catch (error) {
      setAccountError(getAuthErrorMessage(error));
      setDeletingAccount(false);
    }
  };

  const settingsSections = (
    <View style={[styles.settingsSections, wideLayout && styles.wideSection]}>
      {/* firebase auth owns the account email and password */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>YOUR ACCOUNT</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            numberOfLines={1}
            style={styles.accountEmail}>
            {user?.email ?? 'No email'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email status</Text>
          <View style={styles.verifiedStatus}>
            <Ionicons name="checkmark-circle" size={20} color={SkopColors.green} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>
        <View style={[styles.accountActions, wideLayout && styles.wideAccountActions]}>
          <SkopButton
            compact
            disabled={sendingReset}
            label={sendingReset ? 'SENDING...' : 'CHANGE PASSWORD'}
            labelFontSize={accountButtonFontSize}
            onPress={handlePasswordReset}
            variant="yellow"
          />
          <SkopButton
            compact
            label="DELETE ACCOUNT"
            labelFontSize={accountButtonFontSize}
            onPress={() => {
              setAccountError('');
              setConfirmingDelete(true);
            }}
            variant="pink"
          />
        </View>

        {!!accountMessage && (
          <Text accessibilityLiveRegion="polite" style={styles.accountMessage}>
            {accountMessage}
          </Text>
        )}
        {!!accountError && !confirmingDelete && (
          <Text accessibilityLiveRegion="polite" style={styles.accountError}>
            {accountError}
          </Text>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>YOUR QUIT PLAN</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Product</Text>
          <Text style={styles.rowValue}>{formatProduct(quitPlan?.productType)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Approach</Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.rowValue}>
            {formatJourney(quitPlan?.journey)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{quitPlan?.status === 'quit' ? 'Quit date' : 'Target date'}</Text>
          <Text style={styles.rowValue}>
            {formatQuitDate(quitPlan?.quitDate ?? quitPlan?.targetQuitDate)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{formatSpendPeriod(quitPlan?.spendPeriod)} spend</Text>
          <Text style={styles.rowValue}>R{quitPlan?.spendAmount ?? 0}</Text>
        </View>
        {quitPlan?.journey === 'cut_down' && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Check-ins</Text>
            <Text style={styles.rowValue}>{formatSpendPeriod(quitPlan.checkInCadence)}</Text>
          </View>
        )}
        <SkopButton compact label="CHANGE QUIT APPROACH" onPress={openPlanEditor} variant="yellow" />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>DATA & PRIVACY</Text>
        <Text style={styles.noticePreview}>
          See what SKOP stores, how Firebase is involved, how to delete your data, and the limits of
          the SKOP health guidance.
        </Text>
        <SkopButton compact label="READ DATA & HEALTH NOTICE" onPress={() => router.push('/legal')} />
      </View>
    </View>
  );

  const accountFooter = (
    <View style={[styles.footer, wideLayout && styles.wideFooter]}>
      {quitPlan?.status === 'quit' && (
        <Pressable accessibilityRole="button" onPress={() => setConfirmingReset(true)} style={styles.resetLink}>
          <Text style={styles.resetText}>{getResetLabel(quitPlan.productType)}</Text>
        </Pressable>
      )}

      {!!logoutError && (
        <Text accessibilityLiveRegion="polite" style={styles.logoutError}>
          {logoutError}
        </Text>
      )}

      {/* signs the user out of firebase */}
      <Pressable
        accessibilityRole="button"
        disabled={loggingOut}
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && styles.logoutButtonPressed,
          loggingOut && styles.logoutButtonDisabled,
        ]}>
        <Text style={styles.logoutText}>{loggingOut ? 'LOGGING OUT...' : 'LOG OUT'}</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.page}>
        <View style={[styles.header, compact && styles.compactHeader]}>
          <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={SkopColors.ink} />
          </Pressable>
          <Text style={styles.title}>SETTINGS</Text>
          <View style={styles.backButton} />
        </View>

        {wideLayout ? (
          <View style={[styles.body, styles.wideBody]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={[styles.settingsScroll, styles.wideSettingsScroll]}
              contentContainerStyle={styles.settingsScrollContent}>
              {settingsSections}
            </ScrollView>
            {accountFooter}
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {settingsSections}
            {accountFooter}
          </ScrollView>
        )}

        {/* asks for confirmation before changing the streak */}
        {confirmingReset && (
          <View style={styles.overlay}>
            <View style={styles.dialog}>
              <Text style={styles.dialogTitle}>RESET YOUR STREAK?</Text>
              <Text style={styles.dialogBody}>This starts your quit time from today.</Text>
              <View style={styles.actions}>
                <SkopButton label="GO BACK" small onPress={() => setConfirmingReset(false)} />
                <SkopButton label="RESET" variant="pink" small onPress={confirmReset} />
              </View>
            </View>
          </View>
        )}

        {/* deletion needs the current password before firebase accepts it */}
        {confirmingDelete && (
          <View style={styles.overlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.deleteKeyboard}>
              <View style={styles.dialog}>
                <Text style={styles.dialogTitle}>DELETE YOUR ACCOUNT?</Text>
                <Text style={styles.dialogBody}>This removes your quit plan and every SKOP session.</Text>
                <TextInput
                  autoCapitalize="none"
                  editable={!deletingAccount}
                  onChangeText={setDeletePassword}
                  placeholder="Current password"
                  placeholderTextColor={SkopColors.muted}
                  secureTextEntry
                  style={styles.passwordInput}
                  value={deletePassword}
                />
                {!!accountError && (
                  <Text accessibilityLiveRegion="polite" style={styles.accountError}>
                    {accountError}
                  </Text>
                )}
                <View style={styles.actions}>
                  <SkopButton
                    disabled={deletingAccount}
                    label="GO BACK"
                    small
                    onPress={() => {
                      setConfirmingDelete(false);
                      setDeletePassword('');
                      setAccountError('');
                    }}
                  />
                  <SkopButton
                    disabled={deletingAccount}
                    label={deletingAccount ? 'DELETING...' : 'DELETE'}
                    variant="pink"
                    small
                    onPress={handleDeleteAccount}
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        )}

        <Modal animationType="fade" onRequestClose={() => setEditingPlan(false)} transparent visible={editingPlan}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.planModalBackdrop}>
            <View style={styles.planDialog}>
              <View style={styles.planHeader}>
                <Text style={styles.dialogTitle}>CHANGE QUIT APPROACH</Text>
                <Pressable accessibilityLabel="Close" onPress={() => setEditingPlan(false)} style={styles.closeButton}>
                  <Ionicons color={SkopColors.ink} name="close" size={26} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.planForm} showsVerticalScrollIndicator={false}>
                <ChoiceField
                  label="WHAT DO YOU WANT TO SKOP?"
                  onChange={setEditProduct}
                  options={[
                    ['cigarettes', 'CIGARETTES'],
                    ['vaping', 'VAPING'],
                    ['both', 'BOTH'],
                  ]}
                  value={editProduct}
                />
                <ChoiceField
                  label="QUIT APPROACH"
                  onChange={setEditJourney}
                  options={[
                    ['already_quit', "I'VE QUIT"],
                    ['cut_down', 'CUT DOWN'],
                    ['ready_to_quit', 'READY'],
                  ]}
                  value={editJourney}
                />
                <Text style={styles.fieldLabel}>
                  {editJourney === 'already_quit' ? 'QUIT DATE' : 'TARGET QUIT DATE'}
                </Text>
                <TextInput
                  autoCapitalize="none"
                  onChangeText={setEditDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={SkopColors.muted}
                  style={styles.planInput}
                  value={editDate}
                />
                <SkopDatePicker
                  maximumDate={editJourney === 'already_quit' ? dateToInputValue(startOfToday()) : undefined}
                  minimumDate={
                    editJourney === 'already_quit'
                      ? '1900-01-01'
                      : dateToInputValue(addDays(startOfToday(), editJourney === 'cut_down' ? 1 : 0))
                  }
                  onChange={setEditDate}
                  value={editDate}
                />
                <ChoiceField
                  label="USUAL SPEND PERIOD"
                  onChange={setEditSpendPeriod}
                  options={[
                    ['daily', 'DAILY'],
                    ['weekly', 'WEEKLY'],
                    ['monthly', 'MONTHLY'],
                  ]}
                  value={editSpendPeriod}
                />
                <Text style={styles.fieldLabel}>USUAL SPEND</Text>
                <TextInput
                  inputMode="decimal"
                  onChangeText={setEditSpend}
                  placeholder="0.00"
                  placeholderTextColor={SkopColors.muted}
                  style={styles.planInput}
                  value={editSpend}
                />
                {editJourney === 'cut_down' && (
                  <>
                    <ChoiceField
                      label="CHECK-IN CADENCE"
                      onChange={setEditCadence}
                      options={[
                        ['daily', 'DAILY'],
                        ['weekly', 'WEEKLY'],
                        ['monthly', 'MONTHLY'],
                      ]}
                      value={editCadence}
                    />
                    <View style={styles.reminderRow}>
                      <Text style={styles.fieldLabel}>LOCAL REMINDERS</Text>
                      <Pressable
                        accessibilityRole="switch"
                        accessibilityState={{ checked: editReminders }}
                        onPress={() => setEditReminders((value) => !value)}
                        style={[styles.toggle, editReminders && styles.toggleOn]}>
                        <View style={[styles.toggleKnob, editReminders && styles.toggleKnobOn]} />
                      </Pressable>
                    </View>
                    {editReminders && (
                      <ChoiceField
                        label="REMINDER TIME"
                        onChange={setEditReminderTime}
                        options={[
                          ['morning', '08:00'],
                          ['evening', '20:00'],
                        ]}
                        value={editReminderTime}
                      />
                    )}
                  </>
                )}
                {!!planError && <Text style={styles.accountError}>{planError}</Text>}
                <SkopButton
                  disabled={savingPlan}
                  label={savingPlan ? 'SAVING...' : 'SAVE PLAN'}
                  onPress={() => void savePlan()}
                  variant="green"
                />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function formatSpendPeriod(period?: string | null) {
  if (!period) return 'Daily';
  return `${period.charAt(0).toUpperCase()}${period.slice(1)}`;
}

function formatQuitDate(value?: string | null) {
  if (!value) return 'Not set';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatProduct(product?: ProductType) {
  if (product === 'both') return 'Cigarettes and vaping';
  return product ? `${product.charAt(0).toUpperCase()}${product.slice(1)}` : 'Not set';
}

function formatJourney(journey?: QuitJourney) {
  if (journey === 'already_quit') return 'Already quit';
  if (journey === 'cut_down') return 'Cut down first';
  if (journey === 'ready_to_quit') return 'Ready to quit';
  return 'Not set';
}

function getResetLabel(product: ProductType) {
  if (product === 'vaping') return 'I vaped since my quit date';
  if (product === 'both') return 'I smoked or vaped since my quit date';
  return 'I smoked since my quit date';
}

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dateToInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ChoiceField<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: [T, string][];
  value: T;
}) {
  return (
    <View style={styles.choiceField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map(([option, optionLabel]) => (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.choice, value === option && styles.choiceActive]}>
            <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1} style={styles.choiceText}>
              {optionLabel}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SkopColors.background },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    backgroundColor: SkopColors.background,
  },
  header: {
    height: 84,
    borderBottomWidth: 2,
    borderColor: SkopColors.ink,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactHeader: { height: 64 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 27 },
  body: {
    flexGrow: 1,
    padding: 24,
  },
  wideBody: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 40,
  },
  settingsScroll: {
    width: '100%',
  },
  wideSettingsScroll: {
    flex: 1,
    width: 'auto',
  },
  settingsScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: 14,
  },
  settingsSections: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: 32,
  },
  wideSection: {
    flex: 1,
    width: 'auto',
  },
  sectionTitle: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 20, marginBottom: 6 },
  noticePreview: { color: SkopColors.ink, fontFamily: SkopFonts.body, fontSize: 15, lineHeight: 21 },
  row: {
    height: 58,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { color: SkopColors.ink, fontFamily: SkopFonts.medium, fontSize: 17 },
  rowValue: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 17 },
  accountEmail: {
    flex: 1,
    marginLeft: 18,
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 16,
    textAlign: 'right',
  },
  verifiedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedText: {
    color: SkopColors.green,
    fontFamily: SkopFonts.bold,
    fontSize: 16,
  },
  accountActions: {
    height: 118,
    gap: 14,
  },
  wideAccountActions: {
    height: 52,
    flexDirection: 'row',
  },
  accountMessage: {
    color: SkopColors.green,
    fontFamily: SkopFonts.medium,
    fontSize: 14,
    textAlign: 'center',
  },
  accountError: {
    color: '#b42318',
    fontFamily: SkopFonts.medium,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  footer: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 14,
    marginTop: 'auto',
    paddingTop: 32,
  },
  wideFooter: {
    flex: 1,
    width: 'auto',
    maxWidth: 360,
    marginTop: 0,
    paddingTop: 0,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
  },
  resetLink: { padding: 12 },
  resetText: { color: SkopColors.muted, fontFamily: SkopFonts.body, fontSize: 13, textDecorationLine: 'underline' },
  logoutButton: {
    width: '100%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: '#d92d20',
    ...skopShadow,
  },
  logoutButtonPressed: {
    transform: [{ translateY: 3 }],
    boxShadow: `0px 3px 0px 0px ${SkopColors.shadow}`,
  },
  logoutButtonDisabled: {
    opacity: 0.55,
  },
  logoutText: {
    color: '#ffffff',
    fontFamily: SkopFonts.bold,
    fontSize: 18,
  },
  logoutError: {
    color: '#b42318',
    fontFamily: SkopFonts.medium,
    fontSize: 14,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(33,23,18,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteKeyboard: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: 340,
    maxWidth: '86%',
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.background,
    padding: 22,
    ...skopShadow,
  },
  dialogTitle: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 23, textAlign: 'center' },
  dialogBody: { color: SkopColors.ink, fontFamily: SkopFonts.body, fontSize: 16, marginTop: 8, textAlign: 'center' },
  passwordInput: {
    height: 52,
    marginTop: 18,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.surface,
    color: SkopColors.ink,
    fontFamily: SkopFonts.body,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  actions: { gap: 12, marginTop: 22 },
  planModalBackdrop: {
    flex: 1,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(33,23,18,0.45)',
  },
  planDialog: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.background,
    ...skopShadow,
  },
  planHeader: {
    minHeight: 70,
    paddingLeft: 18,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: SkopColors.ink,
    backgroundColor: SkopColors.yellow,
  },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  planForm: { padding: 18, paddingBottom: 28, gap: 16 },
  choiceField: { gap: 8 },
  fieldLabel: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 14 },
  choiceRow: { flexDirection: 'row', gap: 8 },
  choice: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.surface,
    ...skopShadow,
  },
  choiceActive: { backgroundColor: SkopColors.yellow },
  choiceText: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 13 },
  planInput: {
    height: 52,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.surface,
    color: SkopColors.ink,
    fontFamily: SkopFonts.medium,
    fontSize: 17,
    paddingHorizontal: 14,
  },
  reminderRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggle: {
    width: 58,
    height: 32,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 16,
    padding: 3,
    backgroundColor: SkopColors.surface,
  },
  toggleOn: { backgroundColor: SkopColors.green },
  toggleKnob: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 11,
    backgroundColor: SkopColors.background,
  },
  toggleKnobOn: { alignSelf: 'flex-end' },
});
