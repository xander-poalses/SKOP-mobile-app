import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { SkopColors, SkopFonts, skopShadow } from '@/constants/skop-theme';
import { dialogEnter } from '@/constants/skop-motion';

type SkopDatePickerProps = {
  maximumDate?: string;
  minimumDate?: string;
  onChange: (value: string) => void;
  value: string;
};

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function SkopDatePicker({ maximumDate, minimumDate, onChange, value }: SkopDatePickerProps) {
  const selectedDate = parseDate(value) ?? startOfToday();
  const [open, setOpen] = useState(false);
  const [showYears, setShowYears] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const [yearPageStart, setYearPageStart] = useState(getYearPageStart(selectedDate.getFullYear()));
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const years = useMemo(
    () => Array.from({ length: 12 }, (_, index) => yearPageStart + index),
    [yearPageStart]
  );
  const minimumYear = parseDate(minimumDate ?? '')?.getFullYear() ?? 1900;
  const maximumYear = parseDate(maximumDate ?? '')?.getFullYear() ?? 2100;

  const openCalendar = () => {
    const current = parseDate(value) ?? startOfToday();
    setVisibleMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    setYearPageStart(getYearPageStart(current.getFullYear()));
    setShowYears(false);
    setOpen(true);
    void Haptics.selectionAsync();
  };

  const chooseYear = (year: number) => {
    if (year < minimumYear || year > maximumYear) return;
    setVisibleMonth(new Date(year, visibleMonth.getMonth(), 1));
    setShowYears(false);
    void Haptics.selectionAsync();
  };

  const chooseDate = (date: Date) => {
    if (isOutsideRange(date, minimumDate, maximumDate)) return;
    onChange(formatDate(date));
    setOpen(false);
    void Haptics.selectionAsync();
  };

  return (
    <>
      <Pressable
        accessibilityLabel="Choose date from calendar"
        accessibilityRole="button"
        onPress={openCalendar}
        style={({ pressed }) => [styles.openButton, pressed && styles.buttonPressed]}>
        <Ionicons color={SkopColors.ink} name="calendar-outline" size={21} />
        <Text style={styles.openButtonText}>CHOOSE FROM CALENDAR</Text>
      </Pressable>

      <Modal animationType="fade" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <View style={styles.backdrop}>
          <Pressable
            accessibilityLabel="Close calendar"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View entering={dialogEnter} style={styles.dialog}>
            <View style={styles.dialogHeader}>
              <View>
                <Text style={styles.eyebrow}>CHOOSE A DATE</Text>
                <Text style={styles.selectedLabel}>{formatReadableDate(value)}</Text>
              </View>
              <Pressable accessibilityLabel="Close calendar" onPress={() => setOpen(false)} style={styles.closeButton}>
                <Ionicons color={SkopColors.ink} name="close" size={27} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.calendarContent} showsVerticalScrollIndicator={false}>
              <View style={styles.monthHeader}>
                <Pressable
                  accessibilityLabel={showYears ? 'Previous years' : 'Previous month'}
                  onPress={() => {
                    if (showYears) setYearPageStart((current) => current - 12);
                    else setVisibleMonth(addMonths(visibleMonth, -1));
                  }}
                  style={({ pressed }) => [styles.monthButton, pressed && styles.buttonPressed]}>
                  <Ionicons color={SkopColors.ink} name="chevron-back" size={24} />
                </Pressable>
                <Pressable
                  accessibilityLabel={showYears ? 'Return to calendar' : 'Choose a year'}
                  onPress={() => {
                    setYearPageStart(getYearPageStart(visibleMonth.getFullYear()));
                    setShowYears((current) => !current);
                    void Haptics.selectionAsync();
                  }}
                  style={({ pressed }) => [styles.monthTitleButton, pressed && styles.titlePressed]}>
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.monthTitle}>
                    {showYears
                      ? `${yearPageStart} - ${yearPageStart + 11}`
                      : visibleMonth
                          .toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
                          .toUpperCase()}
                  </Text>
                  <Ionicons
                    color={SkopColors.ink}
                    name={showYears ? 'chevron-up' : 'chevron-down'}
                    size={18}
                  />
                </Pressable>
                <Pressable
                  accessibilityLabel={showYears ? 'Next years' : 'Next month'}
                  onPress={() => {
                    if (showYears) setYearPageStart((current) => current + 12);
                    else setVisibleMonth(addMonths(visibleMonth, 1));
                  }}
                  style={({ pressed }) => [styles.monthButton, pressed && styles.buttonPressed]}>
                  <Ionicons color={SkopColors.ink} name="chevron-forward" size={24} />
                </Pressable>
              </View>

              {showYears ? (
                <View style={styles.yearGrid}>
                  {years.map((year) => {
                    const selected = year === visibleMonth.getFullYear();
                    const disabled = year < minimumYear || year > maximumYear;
                    return (
                      <Pressable
                        accessibilityLabel={`Choose ${year}`}
                        disabled={disabled}
                        key={year}
                        onPress={() => chooseYear(year)}
                        style={({ pressed }) => [
                          styles.yearButton,
                          selected && styles.selectedYear,
                          disabled && styles.disabledDay,
                          pressed && !disabled && styles.dayPressed,
                        ]}>
                        <Text style={[styles.yearText, selected && styles.selectedDayText]}>{year}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <>
                  <View style={styles.weekRow}>
                    {weekDays.map((day, index) => (
                      <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>
                    ))}
                  </View>

                  <View style={styles.daysGrid}>
                    {calendarDays.map((date, index) => {
                      if (!date) return <View key={`empty-${index}`} style={styles.daySlot} />;
                      const dateValue = formatDate(date);
                      const selected = dateValue === value;
                      const disabled = isOutsideRange(date, minimumDate, maximumDate);
                      return (
                        <View key={dateValue} style={styles.daySlot}>
                          <Pressable
                            accessibilityLabel={date.toLocaleDateString('en-ZA', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                            disabled={disabled}
                            onPress={() => chooseDate(date)}
                            style={({ pressed }) => [
                              styles.dayButton,
                              selected && styles.selectedDay,
                              disabled && styles.disabledDay,
                              pressed && !disabled && styles.dayPressed,
                            ]}>
                            <Text style={[styles.dayText, selected && styles.selectedDayText]}>{date.getDate()}</Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

function getCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days: (Date | null)[] = Array(mondayFirstOffset).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) days.push(new Date(year, monthIndex, day));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function isOutsideRange(date: Date, minimumDate?: string, maximumDate?: string) {
  const value = formatDate(date);
  return Boolean((minimumDate && value < minimumDate) || (maximumDate && value > maximumDate));
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getYearPageStart(year: number) {
  return Math.floor(year / 12) * 12;
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatReadableDate(value: string) {
  const date = parseDate(value);
  if (!date) return 'NO DATE SELECTED';
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
}

const styles = StyleSheet.create({
  openButton: {
    width: '100%',
    minHeight: 52,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    ...skopShadow,
  },
  openButtonText: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 14 },
  buttonPressed: { transform: [{ translateY: 3 }], boxShadow: 'none' },
  backdrop: {
    flex: 1,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(33, 23, 18, 0.48)',
  },
  dialog: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '94%',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.background,
    ...skopShadow,
  },
  dialogHeader: {
    minHeight: 76,
    paddingLeft: 18,
    paddingRight: 10,
    borderBottomWidth: 2,
    borderBottomColor: SkopColors.ink,
    backgroundColor: SkopColors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: { color: SkopColors.surface, fontFamily: SkopFonts.bold, fontSize: 18 },
  selectedLabel: { marginTop: 2, color: SkopColors.surface, fontFamily: SkopFonts.medium, fontSize: 12 },
  closeButton: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarContent: { padding: 16, paddingBottom: 22 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  monthButton: {
    width: 42,
    height: 42,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 3px 0px 0px ${SkopColors.shadow}`,
  },
  monthTitleButton: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  titlePressed: { backgroundColor: SkopColors.yellow },
  monthTitle: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 16, textAlign: 'center' },
  weekRow: { marginTop: 18, flexDirection: 'row' },
  weekDay: {
    width: '14.2857%',
    color: SkopColors.muted,
    fontFamily: SkopFonts.bold,
    fontSize: 12,
    textAlign: 'center',
  },
  daysGrid: { marginTop: 7, flexDirection: 'row', flexWrap: 'wrap' },
  daySlot: { width: '14.2857%', height: 43, padding: 3 },
  dayButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 6,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDay: { backgroundColor: SkopColors.pink, boxShadow: `0px 3px 0px 0px ${SkopColors.shadow}` },
  disabledDay: { opacity: 0.22 },
  dayPressed: { backgroundColor: SkopColors.yellow },
  dayText: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 14 },
  selectedDayText: { color: SkopColors.surface },
  yearGrid: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  yearButton: {
    width: '30%',
    flexGrow: 1,
    height: 54,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedYear: {
    backgroundColor: SkopColors.pink,
    boxShadow: `0px 3px 0px 0px ${SkopColors.shadow}`,
  },
  yearText: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 17 },
});
