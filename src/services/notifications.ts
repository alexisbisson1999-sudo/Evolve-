import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getProgram } from '../../content';
import { addDays, parseISODate, todayISO } from '../domain/dates';
import { resolveForDate } from '../domain/program';
import type { Settings, WorkoutLog } from '../domain/types';

const CHANNEL_ID = 'rappels';
/** Nombre de jours de rappels programmés à l'avance (iOS limite à 64 notifications en attente). */
const DAYS_AHEAD = 30;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rappels de séance',
      // eslint-disable-next-line import/namespace -- exporté par expo-notifications (faux positif)
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Programme un rappel par jour à l'heure choisie, avec le nom de la séance du jour.
 * Reprogrammé à chaque ouverture de l'app et à chaque changement de réglage :
 * la fenêtre glissante de 30 jours reste donc toujours remplie.
 */
export async function rescheduleReminders(settings: Settings, history: WorkoutLog[]): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.reminderEnabled) return;
  if (!(await ensurePermission())) return;

  const program = getProgram(settings.programId);
  const today = todayISO();
  const doneDates = new Set(history.map((h) => h.date));
  const now = Date.now();

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = addDays(today, i);
    if (doneDates.has(date)) continue;
    const when = parseISODate(date);
    when.setHours(settings.reminderHour, settings.reminderMinute, 0, 0);
    if (when.getTime() <= now + 30_000) continue;

    const s = resolveForDate(program, settings.startDate, date, { maxPushups: settings.maxPushups });
    const body = s
      ? `${s.session.name} · environ ${s.estimatedMinutes} min`
      : 'Jour de repos : profites-en pour bien récupérer.';
    await Notifications.scheduleNotificationAsync({
      content: { title: "C'est l'heure de ta séance 💪", body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
  }
}
