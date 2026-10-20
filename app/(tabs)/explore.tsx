import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
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
import { BottomNav } from '@/components/skop/BottomNav';
import { SkopColors, SkopFonts, skopShadow } from '@/constants/skop-theme';
import { type SkopSessionRecord, useSkopSession } from '@/context/skop-session';

const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const weekdayColours = [
  SkopColors.blue,
  SkopColors.green,
  SkopColors.pink,
  SkopColors.blue,
  SkopColors.green,
  SkopColors.pink,
  SkopColors.blue,
];

const baseUrgeHelp = [
  {
    title: 'DELAY',
    body: 'Give the craving a few minutes to pass before you decide what to do.',
    colour: SkopColors.yellow,
  },
  {
    title: 'DISTRACT',
    body: 'Play SKOP, walk, listen to music, call someone, or change where you are.',
    colour: SkopColors.blue,
  },
  {
    title: 'DEEP BREATHE',
    body: 'Breathe in for 4 seconds, hold for 5, then breathe out for 6.',
    colour: SkopColors.pink,
  },
  {
    title: 'DRINK WATER',
    body: 'Sip a cold glass of water and give your mouth something else to do.',
    colour: SkopColors.green,
  },
];

export default function InsightsScreen() {
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [showUrgeHelp, setShowUrgeHelp] = useState(false);
  const [sevenDaysAgo] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);
  const {
    averageSessionSeconds,
    checkInDue,
    dataSyncStatus,
    latestSpendChangeCents,
    quitPlan,
    refreshCloudData,
    sessions,
    skopSessionCount,
    spendCheckIns,
    totalSessionSeconds,
  } = useSkopSession();
  const { height, width } = useWindowDimensions();
  const wideLayout = width >= 700;
  const compactHeader = width > height || height < 600 || width < 400;
  const headerHeight = compactHeader ? APP_HEADER_COMPACT_HEIGHT : APP_HEADER_HEIGHT;
  const longestSessionSeconds = sessions.reduce(
    (longest, session) => Math.max(longest, session.durationSeconds),
    0
  );
  const days = buildWeekdayData(sessions);
  const urgeHelp = getUrgeHelp(quitPlan?.productType);
  const recentWeekSessions = sessions.filter((session) => {
    return new Date(session.startedAt).getTime() >= sevenDaysAgo;
  });
  const summary = [
    { label: 'SKOP SESSIONS', value: String(skopSessionCount), colour: SkopColors.yellow },
    { label: 'TIME IN SKOP', value: formatDuration(totalSessionSeconds), colour: SkopColors.green },
    { label: 'AVERAGE SESSION', value: formatDuration(averageSessionSeconds), colour: SkopColors.blue },
    { label: 'LONGEST SESSION', value: formatDuration(longestSessionSeconds), colour: SkopColors.pink },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.page}>
        <ScrollView
          refreshControl={
            <RefreshControl
              colors={[SkopColors.green]}
              onRefresh={() => void refreshCloudData()}
              refreshing={dataSyncStatus === 'syncing'}
              tintColor={SkopColors.green}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingTop: headerHeight + 28 }]}>
          {/* these cards only use sessions recorded after the game starts */}
          <View style={styles.summaryGrid}>
            {summary.map((item) => (
              <View
                key={item.label}
                style={[
                  styles.summaryCard,
                  !wideLayout && styles.narrowSummaryCard,
                  { backgroundColor: item.colour, width: wideLayout ? '23%' : undefined },
                ]}>
                <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.summaryLabel}>
                  {item.label}
                </Text>
                <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1} style={styles.summaryValue}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {quitPlan?.status === 'reducing' && (
            <View style={styles.spendSection}>
              <Text style={styles.sectionTitle}>SPENDING TREND</Text>
              <Text style={styles.spendSummary}>{formatSpendTrend(latestSpendChangeCents)}</Text>
              <Text style={styles.spendNote}>Compared with your usual spend. This does not measure nicotine use.</Text>
              {spendCheckIns.slice(0, 4).map((checkIn) => {
                const change = checkIn.expectedBaselineCents - checkIn.amountCents;
                return (
                  <View key={checkIn.id} style={styles.spendRow}>
                    <View>
                      <Text style={styles.sessionDay}>{formatCheckInPeriod(checkIn.periodStart, checkIn.periodEnd)}</Text>
                      <Text style={styles.sessionTime}>{checkIn.cadence.toUpperCase()}</Text>
                    </View>
                    <View style={styles.spendAmount}>
                      <Text style={styles.sessionMeasureValue}>R{formatCurrency(checkIn.amountCents)}</Text>
                      <Text style={styles.sessionTime}>{formatSpendTrend(change)}</Text>
                    </View>
                  </View>
                );
              })}
              <Pressable
                onPress={() => router.push('/check-in')}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                <Ionicons color={SkopColors.ink} name="wallet-outline" size={21} />
                <Text style={styles.secondaryButtonText}>
                  {checkInDue ? 'CHECK IN NOW' : 'UPDATE THIS PERIOD'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* groups session start times by weekday */}
          <View style={styles.chartWrap}>
            <Text style={styles.sectionTitle}>SESSIONS BY DAY</Text>
            <View style={styles.chart}>
              {days.map((item, index) => (
                <View key={`${item.day}-${index}`} style={styles.dayCard}>
                  <Text style={styles.value}>{item.value}</Text>
                  <View style={styles.pinWrap}>
                    <View style={[styles.pinLine, { height: item.height }]} />
                    <View style={[styles.pinHead, { bottom: Math.max(0, item.height - 6) }]} />
                  </View>
                  <Text style={[styles.day, { color: item.color }]}>{item.day}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.history}>
            <Text style={styles.sectionTitle}>RECENT SESSIONS</Text>
            {sessions.length === 0 ? (
              <Text style={styles.emptyText}>Your completed SKOP sessions will appear here.</Text>
            ) : (
              sessions.slice(0, 5).map((session) => (
                <SessionRow key={session.id} session={session} />
              ))
            )}

            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                setShowAllSessions(true);
              }}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
              <Ionicons color={SkopColors.ink} name="calendar-outline" size={21} />
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.secondaryButtonText}>
                VIEW PAST 7 DAYS
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowUrgeHelp(true);
              }}
              style={({ pressed }) => [styles.helpButton, pressed && styles.buttonPressed]}>
              <Ionicons color={SkopColors.ink} name="bulb-outline" size={23} />
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.helpButtonText}>
                HELP WITH AN URGE
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* android blur updates when the header renders after the scroll content */}
        <AppHeader title="Learn the URGE" />

        {/* marks insights as the active tab */}
        <BottomNav active="insights" />
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setShowAllSessions(false)}
        transparent
        visible={showAllSessions}>
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close session history"
            onPress={() => setShowAllSessions(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeading}>
                <Text style={styles.modalTitle}>PAST 7 DAYS</Text>
                <Text style={styles.modalSubtitle}>
                  {recentWeekSessions.length} SKOP {recentWeekSessions.length === 1 ? 'session' : 'sessions'}
                </Text>
              </View>
              <ModalCloseButton onPress={() => setShowAllSessions(false)} />
            </View>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}>
              {recentWeekSessions.length === 0 ? (
                <Text style={styles.modalEmptyText}>No SKOP sessions were completed in the past 7 days.</Text>
              ) : (
                recentWeekSessions.map((session) => <SessionRow key={session.id} session={session} />)
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setShowUrgeHelp(false)}
        transparent
        visible={showUrgeHelp}>
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close urge help"
            onPress={() => setShowUrgeHelp(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeading}>
                <Text style={styles.modalTitle}>WHEN AN URGE HITS</Text>
                <Text style={styles.modalSubtitle}>Try the 4 Ds while the craving passes.</Text>
              </View>
              <ModalCloseButton onPress={() => setShowUrgeHelp(false)} />
            </View>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}>
              {urgeHelp.map((item) => (
                <View key={item.title} style={styles.helpRow}>
                  <View style={[styles.helpMarker, { backgroundColor: item.colour }]} />
                  <View style={styles.helpCopy}>
                    <Text style={styles.helpTitle}>{item.title}</Text>
                    <Text style={styles.helpBody}>{item.body}</Text>
                  </View>
                </View>
              ))}
              <Text style={styles.supportText}>
                {quitPlan?.ageGroup === '13_17'
                  ? 'Cravings often pass within a few minutes. Speak to a parent, guardian, doctor, pharmacist or another adult you trust for more support.'
                  : 'Cravings often pass within a few minutes. A doctor or pharmacist can also help with nicotine replacement or stop-smoking medicine.'}
              </Text>
              <Text style={styles.sourceText}>
                Guidance reviewed from HSE, NHS, CDC, Mayo Clinic, Smokefree.gov, and CANSA.
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => void Linking.openURL(getPrimarySource(quitPlan?.productType, quitPlan?.ageGroup))}
                style={styles.sourceButton}>
                <Text style={styles.sourceButtonText}>OPEN REVIEWED SOURCE</Text>
                <Ionicons color={SkopColors.ink} name="open-outline" size={18} />
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SessionRow({ session }: { session: SkopSessionRecord }) {
  return (
    <View style={styles.sessionRow}>
      <View style={styles.sessionDate}>
        <Text style={styles.sessionDay}>{formatSessionDay(session.startedAt)}</Text>
        <Text style={styles.sessionTime}>{formatSessionTime(session.startedAt)}</Text>
      </View>
      <View style={styles.sessionMeasure}>
        <Text style={styles.sessionMeasureLabel}>TIME</Text>
        <Text style={styles.sessionMeasureValue}>{formatDuration(session.durationSeconds)}</Text>
      </View>
      <View style={styles.sessionMeasure}>
        <Text style={styles.sessionMeasureLabel}>SCORE</Text>
        <Text style={styles.sessionMeasureValue}>{session.score}</Text>
      </View>
      <View style={styles.sessionMeasure}>
        <Text style={styles.sessionMeasureLabel}>LEVEL</Text>
        <Text style={styles.sessionMeasureValue}>{session.highestLevel}</Text>
      </View>
    </View>
  );
}

function ModalCloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Close"
      accessibilityRole="button"
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
      <Ionicons color={SkopColors.ink} name="close" size={28} />
    </Pressable>
  );
}

function buildWeekdayData(sessions: SkopSessionRecord[]) {
  const counts = Array(7).fill(0) as number[];

  sessions.forEach((session) => {
    const sundayFirstIndex = new Date(session.startedAt).getDay();
    const mondayFirstIndex = (sundayFirstIndex + 6) % 7;
    counts[mondayFirstIndex] += 1;
  });

  const largestCount = Math.max(1, ...counts);
  return weekdayLabels.map((day, index) => ({
    day,
    value: counts[index],
    height: counts[index] === 0 ? 4 : Math.round(14 + (counts[index] / largestCount) * 48),
    color: weekdayColours[index],
  }));
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function formatSessionDay(value: string) {
  return new Date(value).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
  });
}

function formatSessionTime(value: string) {
  return new Date(value).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getUrgeHelp(productType?: 'cigarettes' | 'vaping' | 'both') {
  const productAction =
    productType === 'vaping'
      ? 'Put the vape out of reach, change rooms, or go somewhere you do not vape.'
      : productType === 'both'
        ? 'Move away from cigarettes and vapes, then change what you are doing.'
        : 'Move away from cigarettes or go to a place where smoking is not allowed.';

  return baseUrgeHelp.map((item) =>
    item.title === 'DISTRACT' ? { ...item, body: `${productAction} Play SKOP, walk, or call someone.` } : item
  );
}

function getPrimarySource(
  productType?: 'cigarettes' | 'vaping' | 'both',
  ageGroup?: 'under_13' | '13_17' | '18_plus',
) {
  if (ageGroup === '13_17') return 'https://www.cdc.gov/tobacco/e-cigarettes/youth-quitting.html';
  if (productType === 'vaping') return 'https://smokefree.gov/quit-smoking/ecigs-menthol-dip/quit-vaping';
  if (productType === 'both') return 'https://www.cdc.gov/tobacco/campaign/tips/quit-smoking/index.html';
  return 'https://www2.hse.ie/living-well/quit-smoking/get-help-to-quit/cravings-withdrawal/';
}

function formatSpendTrend(value: number | null) {
  if (value === null) return 'No check-ins yet';
  if (value === 0) return 'Same as usual';
  return `R${formatCurrency(Math.abs(value))} ${value > 0 ? 'less' : 'more'} than usual`;
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('en-ZA', { maximumFractionDigits: 2 });
}

function formatCheckInPeriod(start: string, end: string) {
  const startLabel = new Date(`${start}T00:00:00`).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
  const endLabel = new Date(`${end}T00:00:00`).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
  return start === end ? startLabel : `${startLabel} - ${endLabel}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: SkopColors.background,
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    backgroundColor: SkopColors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    gap: 40,
  },
  summaryGrid: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  summaryCard: {
    minWidth: 145,
    height: 112,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: 'space-between',
    ...skopShadow,
  },
  narrowSummaryCard: {
    flexBasis: 0,
    flexGrow: 1,
  },
  summaryLabel: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 13,
    textAlign: 'center',
  },
  summaryValue: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 28,
    textAlign: 'center',
  },
  chartWrap: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 14,
  },
  spendSection: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 14,
  },
  spendSummary: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 24,
    textAlign: 'center',
  },
  spendNote: {
    color: SkopColors.muted,
    fontFamily: SkopFonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  spendRow: {
    width: '100%',
    minHeight: 64,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spendAmount: { alignItems: 'flex-end' },
  sectionTitle: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 22,
  },
  chart: {
    width: '100%',
    height: 140,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  dayCard: {
    flex: 1,
    minWidth: 0,
    maxWidth: 72,
    height: 140,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    backgroundColor: SkopColors.surface,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 8,
    boxShadow: `0px 4px 0px 0px ${SkopColors.shadow}`,
  },
  value: {
    position: 'absolute',
    top: 3,
    fontSize: 20,
    fontFamily: SkopFonts.bold,
    color: SkopColors.ink,
  },
  pinWrap: {
    height: 68,
    width: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pinLine: {
    width: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: SkopColors.ink,
    backgroundColor: SkopColors.yellow,
  },
  pinHead: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: SkopColors.ink,
    backgroundColor: SkopColors.yellow,
  },
  day: {
    marginTop: 6,
    fontSize: 18,
    lineHeight: 20,
    fontFamily: SkopFonts.bold,
    textShadowColor: SkopColors.ink,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  history: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: 14,
  },
  secondaryButton: {
    minHeight: 54,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.surface,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...skopShadow,
  },
  secondaryButtonText: {
    flexShrink: 1,
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 17,
  },
  helpButton: {
    minHeight: 62,
    marginTop: 10,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.yellow,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...skopShadow,
  },
  helpButtonText: {
    flexShrink: 1,
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 19,
  },
  buttonPressed: {
    transform: [{ translateY: 4 }],
    boxShadow: `0px 2px 0px 0px ${SkopColors.shadow}`,
  },
  emptyText: {
    color: SkopColors.muted,
    fontFamily: SkopFonts.body,
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 20,
  },
  sessionRow: {
    minHeight: 70,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    boxShadow: `0px 4px 0px 0px ${SkopColors.shadow}`,
  },
  sessionDate: {
    flex: 1.2,
    minWidth: 0,
  },
  sessionDay: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 16,
  },
  sessionTime: {
    color: SkopColors.muted,
    fontFamily: SkopFonts.body,
    fontSize: 13,
  },
  sessionMeasure: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  sessionMeasureLabel: {
    color: SkopColors.muted,
    fontFamily: SkopFonts.bold,
    fontSize: 10,
  },
  sessionMeasureValue: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(33, 23, 18, 0.45)',
  },
  modalPanel: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '86%',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.background,
    boxShadow: `0px 8px 0px 0px ${SkopColors.shadow}`,
  },
  modalHeader: {
    minHeight: 84,
    borderBottomWidth: 2,
    borderBottomColor: SkopColors.ink,
    paddingLeft: 20,
    paddingRight: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SkopColors.yellow,
  },
  modalHeading: {
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 21,
  },
  modalSubtitle: {
    marginTop: 2,
    color: SkopColors.ink,
    fontFamily: SkopFonts.body,
    fontSize: 14,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 3px 0px 0px ${SkopColors.shadow}`,
  },
  closeButtonPressed: {
    transform: [{ translateY: 3 }],
    boxShadow: 'none',
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'web' ? 24 : 30,
    gap: 16,
  },
  modalEmptyText: {
    color: SkopColors.muted,
    fontFamily: SkopFonts.body,
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 30,
  },
  helpRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  helpMarker: {
    width: 12,
    minHeight: 62,
    alignSelf: 'stretch',
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 4,
  },
  helpCopy: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 2,
  },
  helpTitle: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 17,
  },
  helpBody: {
    marginTop: 3,
    color: SkopColors.ink,
    fontFamily: SkopFonts.body,
    fontSize: 15,
    lineHeight: 21,
  },
  supportText: {
    borderTopWidth: 2,
    borderTopColor: SkopColors.ink,
    paddingTop: 16,
    color: SkopColors.ink,
    fontFamily: SkopFonts.medium,
    fontSize: 15,
    lineHeight: 21,
  },
  sourceText: {
    color: SkopColors.muted,
    fontFamily: SkopFonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  sourceButton: {
    minHeight: 48,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    backgroundColor: SkopColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sourceButtonText: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 14,
  },
});
