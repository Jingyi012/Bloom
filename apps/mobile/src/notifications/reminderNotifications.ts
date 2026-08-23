import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Language, LocalSettings } from "@/settings/settingsStorage";

const REMINDER_ID_KEY = "bloom.notifications.dailyReminderId.v1";
const REMINDER_CHANNEL_ID = "daily-diary-reminder";

export type ReminderSyncResult =
  | "scheduled"
  | "disabled"
  | "permissionDenied"
  | "invalidTime"
  | "unsupported"
  | "error";

let presentationConfigured = false;

/** Configure how a reminder is presented while Bloom is in the foreground. */
export function configureNotificationPresentation(): void {
  if (presentationConfigured || Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  presentationConfigured = true;
}

function parseReminderTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

async function cancelStoredReminder(): Promise<void> {
  const identifier = await AsyncStorage.getItem(REMINDER_ID_KEY);
  if (identifier) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // The notification may already have been removed by the operating system.
    }
  }
  await AsyncStorage.removeItem(REMINDER_ID_KEY);
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

async function configureAndroidChannel(language: Language): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: language === "zh" ? "每日日记提醒" : "Daily diary reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function syncDailyReminderInternal(
  settings: Pick<LocalSettings, "language" | "remindersEnabled" | "reminderTime">,
): Promise<ReminderSyncResult> {
  if (Platform.OS === "web") return "unsupported";

  configureNotificationPresentation();

  const parsed = parseReminderTime(settings.reminderTime);
  if (!settings.remindersEnabled) {
    await cancelStoredReminder();
    return "disabled";
  }
  if (!parsed) {
    await cancelStoredReminder();
    return "invalidTime";
  }

  try {
    if (!(await ensurePermission())) {
      await cancelStoredReminder();
      return "permissionDenied";
    }
    await configureAndroidChannel(settings.language);
    await cancelStoredReminder();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: settings.language === "zh" ? "Bloom 日记" : "Bloom diary",
        body:
          settings.language === "zh"
            ? "留一点时间，记录今天的心情。"
            : "Take a moment to write today’s diary.",
        data: { kind: "daily-diary-reminder" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: parsed.hour,
        minute: parsed.minute,
        ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL_ID } : {}),
      },
    });
    await AsyncStorage.setItem(REMINDER_ID_KEY, identifier);
    return "scheduled";
  } catch {
    return "error";
  }
}

// Settings can change several times while the time field is being edited. Queue
// native schedule operations so two requests cannot leave duplicate reminders.
let syncQueue: Promise<ReminderSyncResult> = Promise.resolve("disabled");

export function syncDailyReminder(
  settings: Pick<LocalSettings, "language" | "remindersEnabled" | "reminderTime">,
): Promise<ReminderSyncResult> {
  const run = () => syncDailyReminderInternal(settings);
  syncQueue = syncQueue.then(run, run);
  return syncQueue;
}
