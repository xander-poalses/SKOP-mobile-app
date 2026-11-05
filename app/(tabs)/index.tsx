import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  APP_HEADER_COMPACT_HEIGHT,
  APP_HEADER_HEIGHT,
  AppHeader,
} from '@/components/skop/AppHeader';
import Animated from 'react-native-reanimated';

import { BottomNav } from '@/components/skop/BottomNav';
import { SkopButton } from '@/components/skop/SkopButton';
import { UndoToast } from '@/components/skop/UndoToast';
import { SkopColors, SkopFonts, skopShadow, skopNumbers } from '@/constants/skop-theme';
import { dialogEnter } from '@/constants/skop-motion';
import { useSkopSession } from '@/context/skop-session';

export default function HomeScreen() {
  const {
    checkInDue,
    confirmQuit,
    lastSessionAt,
    latestSpendChangeCents,
    moneySaved,
    quitPlan,
    skopSessionCount,
    streak,
    streakResetUndoable,
    undoStreakReset,
    updateQuitPlan,
  } = useSkopSession();
  const [targetPromptHidden, setTargetPromptHidden] = useState(false);
  const { height, width } = useWindowDimensions();
  const wideLayout = width > height * 1.25;
  const compact = height < 600;
  const compactHeader = width > height || height < 600 || width < 400;
  const headerHeight = compactHeader ? APP_HEADER_COMPACT_HEIGHT : APP_HEADER_HEIGHT;
  const isQuit = quitPlan?.status === 'quit';
  const countdown = getCountdown(quitPlan?.targetQuitDate);
  const progressCards = isQuit
    ? [
        { value: String(streak.years), label: 'years', color: SkopColors.pink },
        { value: String(streak.months), label: 'months', color: SkopColors.blue },
        { value: String(streak.days), label: 'days', color: SkopColors.green },
      ]
    : [
        { value: String(countdown.months), label: 'months', color: SkopColors.pink },
        { value: String(countdown.days), label: 'days', color: SkopColors.blue },
        { value: String(countdown.hours), label: 'hours', color: SkopColors.green },
      ];
  const moneyText = `R${formatMoney(moneySaved)}`;
  const actionWidth = Math.min(Math.max(width - 48, 0), 460);
  const moneyCardWidth = Math.max(0, (actionWidth - 24) / 2);
  const moneyFontSize = getMoneyFontSize(moneyText, moneyCardWidth);
  const targetReached = Boolean(
    quitPlan?.targetQuitDate &&
      inputValueToDate(quitPlan.targetQuitDate).getTime() <= startOfDay(new Date()).getTime()
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.page, wideLayout && styles.widePage]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingTop: headerHeight + 24 },
            wideLayout && styles.wideContent,
          ]}>
          <View style={[styles.streakSection, wideLayout && styles.wideStreakSection]}>
            {/* these cards change from a countdown to a streak after confirmation */}
            <View style={styles.streakRow}>
              {progressCards.map((item) => (
                <View
                  key={item.label}
                  style={[
                    styles.streakCard,
                    compact && styles.compactStreakCard,
                    { backgroundColor: item.color },
                  ]}>
                  <Text style={[styles.streakValue, compact && styles.compactStreakValue]}>
                    {item.value}
                  </Text>
                  <View style={[styles.streakDivider, compact && styles.compactStreakDivider]} />
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    numberOfLines={1}
                    style={[styles.streakLabel, compact && styles.compactStreakLabel]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.caption}>
              {isQuit
                ? 'Streak still standing'
                : quitPlan?.status === 'reducing'
                  ? 'Working towards your quit date'
                  : 'Your quit date is getting closer'}
            </Text>
          </View>

          <View style={[styles.actionSection, wideLayout && styles.wideActionSection]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open urge distraction game"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/urge' as Href);
              }}
              style={({ pressed }) => [styles.urgeButton, pressed && styles.urgeButtonPressed]}>
              <Image source={require('../../assets/figma/home-urge-source.svg')} style={styles.urgeIcon} />
              <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={styles.urgeText}>
                I HAVE AN URGE
              </Text>
              <Image source={require('../../assets/figma/home-urge-source.svg')} style={styles.urgeIcon} />
            </Pressable>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.statTitle}>
                  {isQuit ? 'MONEY SAVED' : quitPlan?.status === 'reducing' ? 'SPEND CHANGE' : 'QUIT DATE'}
                </Text>
                {isQuit && (
                  <Image source={require('../../assets/figma/home-money-source.svg')} style={styles.moneyIcon} />
                )}
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.4}
                  numberOfLines={1}
                  style={[styles.money, { fontSize: moneyFontSize }]}>
                  {isQuit
                    ? moneyText
                    : quitPlan?.status === 'reducing'
                      ? formatSpendChange(latestSpendChangeCents)
                      : formatShortDate(quitPlan?.targetQuitDate)}
                </Text>
                <Text style={styles.statNote}>
                  {isQuit
                    ? '*This is an estimate*'
                    : quitPlan?.status === 'reducing'
                      ? formatSpendChangeNote(latestSpendChangeCents)
                      : 'Confirm it when the day arrives'}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statTitle}>SKOP SESSIONS</Text>
                <Text style={styles.urgeCount}>{skopSessionCount}</Text>
                <Text style={styles.statNote}>{formatLastSession(lastSessionAt)}</Text>
              </View>
            </View>

            {quitPlan?.status === 'reducing' && checkInDue && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/check-in')}
                style={({ pressed }) => [styles.checkInButton, pressed && styles.urgeButtonPressed]}>
                <Ionicons color={SkopColors.ink} name="wallet-outline" size={23} />
                <Text style={styles.checkInText}>SPENDING CHECK-IN</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        <AppHeader title="SKOP the URGE" />
        <BottomNav active="home" />
        {/* sits just above the bottom nav after a streak reset */}
        {streakResetUndoable && (
          <UndoToast
            bottom={(compactHeader ? 72 : 112) + 16}
            message="Streak reset to today"
            onUndo={undoStreakReset}
          />
        )}
      </View>

      <Modal animationType="fade" transparent visible={targetReached && !targetPromptHidden}>
        <View style={styles.modalBackdrop}>
          <Animated.View entering={dialogEnter} style={styles.targetDialog}>
            <Text style={styles.targetTitle}>DID YOUR QUIT DATE WORK FOR YOU?</Text>
            <Text style={styles.targetBody}>Your streak only starts when you confirm it.</Text>
            <SkopButton
              label="YES, I QUIT"
              onPress={() => {
                if (quitPlan?.targetQuitDate) void confirmQuit(quitPlan.targetQuitDate);
              }}
              variant="green"
            />
            {quitPlan?.status === 'scheduled' && (
              <SkopButton
                label="CUT DOWN FIRST"
                onPress={() => {
                  if (!quitPlan) return;
                  void updateQuitPlan({
                    ...quitPlan,
                    journey: 'cut_down',
                    status: 'reducing',
                    checkInCadence: 'weekly',
                    remindersEnabled: false,
                    reminderTime: null,
                  });
                  router.push('/settings');
                }}
                variant="yellow"
              />
            )}
            <SkopButton label="CHOOSE ANOTHER DATE" onPress={() => router.push('/settings')} />
            <Pressable onPress={() => setTargetPromptHidden(true)} style={styles.notNow}>
              <Text style={styles.notNowText}>Not now</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatMoney(amount: number) {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function getMoneyFontSize(value: string, cardWidth: number) {
  const availableWidth = Math.max(0, cardWidth - 24);
  const estimatedSize = availableWidth / Math.max(1, value.length * 0.72);
  return Math.max(16, Math.min(36, Math.floor(estimatedSize)));
}

function formatLastSession(lastSessionAt: string | null) {
  if (!lastSessionAt) return 'No sessions yet';
  const sessionDate = new Date(lastSessionAt);
  const today = new Date();
  const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
  const todayStart = startOfDay(today);
  const daysAgo = Math.max(0, Math.round((todayStart.getTime() - sessionDay.getTime()) / 86400000));
  if (daysAgo === 0) return 'Last session: Today';
  if (daysAgo === 1) return 'Last session: Yesterday';
  return `Last session: ${daysAgo} days ago`;
}

function getCountdown(value?: string | null) {
  if (!value) return { months: 0, days: 0, hours: 0 };
  const totalHours = Math.max(0, Math.ceil((inputValueToDate(value).getTime() - Date.now()) / 3600000));
  const totalDays = Math.floor(totalHours / 24);
  return { months: Math.floor(totalDays / 30), days: totalDays % 30, hours: totalHours % 24 };
}

function formatSpendChange(value: number | null) {
  if (value === null) return 'NO DATA';
  return `R${formatMoney(Math.round(Math.abs(value) / 100))}`;
}

function formatSpendChangeNote(value: number | null) {
  if (value === null) return 'Complete your first check-in';
  if (value === 0) return 'Same as your usual spend';
  return value > 0 ? 'Less than your usual spend' : 'More than your usual spend';
}

function formatShortDate(value?: string | null) {
  if (!value) return 'NO DATE';
  return inputValueToDate(value).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
}

function inputValueToDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', backgroundColor: SkopColors.background },
  page: { flex: 1, width: '100%', maxWidth: 960, alignSelf: 'center', backgroundColor: SkopColors.background },
  widePage: { maxWidth: 960 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 },
  wideContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 40 },
  streakSection: { width: '100%', maxWidth: 430, alignSelf: 'center' },
  wideStreakSection: { flex: 1, width: 'auto' },
  streakRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  streakCard: {
    flex: 1,
    minWidth: 0,
    maxWidth: 120,
    height: 150,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    ...skopShadow,
  },
  compactStreakCard: { height: 118, paddingVertical: 12 },
  streakValue: { ...skopNumbers, fontSize: 46, lineHeight: 48, fontFamily: SkopFonts.bold, color: SkopColors.surface },
  compactStreakValue: { fontSize: 36, lineHeight: 38 },
  streakDivider: { position: 'absolute', top: 74, left: 0, right: 0, height: 2, backgroundColor: SkopColors.ink },
  compactStreakDivider: { top: 57 },
  streakLabel: { fontSize: 20, letterSpacing: 0, fontFamily: SkopFonts.bold, color: SkopColors.ink },
  compactStreakLabel: { fontSize: 17 },
  caption: { marginTop: 16, textAlign: 'center', color: SkopColors.ink, fontSize: 16, fontFamily: SkopFonts.medium },
  actionSection: { width: '100%', maxWidth: 460, alignSelf: 'center', marginTop: 40 },
  wideActionSection: { flex: 1, width: 'auto', marginTop: 0 },
  urgeButton: {
    height: 53,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: SkopColors.ink,
    backgroundColor: SkopColors.yellow,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...skopShadow,
  },
  checkInButton: {
    minHeight: 52,
    marginTop: 24,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...skopShadow,
  },
  checkInText: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 17 },
  urgeText: { color: SkopColors.ink, fontSize: 20, fontFamily: SkopFonts.bold },
  urgeButtonPressed: { transform: [{ translateY: 3 }], boxShadow: `0px 1px 0px 0px ${SkopColors.shadow}` },
  urgeIcon: { width: 24, height: 22 },
  statsRow: { marginTop: 32, flexDirection: 'row', gap: 24 },
  statCard: {
    flex: 1,
    minWidth: 0,
    height: 160,
    padding: 10,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: SkopColors.ink,
    backgroundColor: SkopColors.surface,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statTitle: { width: '100%', fontSize: 15, fontFamily: SkopFonts.bold, color: SkopColors.ink, textAlign: 'center' },
  money: { ...skopNumbers, width: '100%', fontSize: 36, letterSpacing: 0, fontFamily: SkopFonts.bold, color: SkopColors.ink, textAlign: 'center' },
  urgeCount: { ...skopNumbers, fontSize: 58, lineHeight: 64, fontFamily: SkopFonts.bold, color: SkopColors.ink },
  statNote: { width: '100%', fontSize: 12, fontFamily: SkopFonts.body, color: SkopColors.ink, textAlign: 'center' },
  moneyIcon: { width: 32, height: 26, transform: [{ rotate: '180deg' }] },
  modalBackdrop: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(33, 23, 18, 0.45)' },
  targetDialog: {
    width: '100%',
    maxWidth: 520,
    padding: 22,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.background,
    gap: 16,
    ...skopShadow,
  },
  targetTitle: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 23, textAlign: 'center' },
  targetBody: { color: SkopColors.ink, fontFamily: SkopFonts.body, fontSize: 16, textAlign: 'center' },
  notNow: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  notNowText: { color: SkopColors.muted, fontFamily: SkopFonts.body, fontSize: 14, textDecorationLine: 'underline' },
});
