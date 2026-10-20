// shortcut: Expo Go SDK 57 lacks the topic module, remove these direct imports when Expo fixes its package entry point.
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import {
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
} from 'expo-notifications/build/NotificationsEmitter';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import {
  AndroidNotificationPriority,
  SchedulableTriggerInputTypes,
} from 'expo-notifications/build/Notifications.types';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import type { NotificationResponse, NotificationTriggerInput } from 'expo-notifications';
import { Platform } from 'react-native';

import type { CheckInCadence, QuitPlan } from '@/lib/skop-firestore';

const CHANNEL_ID = 'skop-check-ins';
const NOTIFICATION_ID = 'skop-spend-check-in';

if (Platform.OS !== 'web') {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// local reminders keep working without firebase messaging or an expo push token
export async function applyCheckInReminder(plan: QuitPlan) {
  if (Platform.OS === 'web') return false;

  await cancelScheduledNotificationAsync(NOTIFICATION_ID).catch(() => undefined);
  if (
    plan.status !== 'reducing' ||
    !plan.remindersEnabled ||
    !plan.checkInCadence ||
    !plan.reminderTime
  ) {
    return false;
  }

  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(CHANNEL_ID, {
      name: 'SKOP check-ins',
      description: 'Reminders for spending check-ins',
      importance: AndroidImportance.LOW,
      enableVibrate: false,
      showBadge: false,
      sound: null,
    });
  }

  const currentPermission = await getPermissionsAsync();
  const permission =
    currentPermission.status === 'granted'
      ? currentPermission
      : await requestPermissionsAsync();
  if (permission.status !== 'granted') return false;

  const hour = plan.reminderTime === 'morning' ? 8 : 20;
  await scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: 'Your SKOP check-in is ready',
      body: 'Take a moment to update your progress.',
      data: { url: '/check-in' },
      sound: false,
      ...(Platform.OS === 'android'
        ? { priority: AndroidNotificationPriority.LOW }
        : {}),
    },
    trigger: buildTrigger(plan.checkInCadence, hour),
  });

  return true;
}

export async function clearCheckInReminder() {
  if (Platform.OS === 'web') return;
  await cancelScheduledNotificationAsync(NOTIFICATION_ID).catch(() => undefined);
}

function buildTrigger(cadence: CheckInCadence, hour: number): NotificationTriggerInput {
  const channelId = Platform.OS === 'android' ? CHANNEL_ID : undefined;

  if (cadence === 'daily') {
    return {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      channelId,
    };
  }

  if (cadence === 'weekly') {
    return {
      type: SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2,
      hour,
      minute: 0,
      channelId,
    };
  }

  return {
    type: SchedulableTriggerInputTypes.MONTHLY,
    day: 1,
    hour,
    minute: 0,
    channelId,
  };
}

export {
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
  type NotificationResponse,
};
