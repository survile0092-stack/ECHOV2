import { Platform } from 'react-native';
import { parseISO, subDays, isBefore } from 'date-fns';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Booking, AppSettings } from '@/types';

let Notifications: typeof import('expo-notifications') | null = null;

async function getNotificationsModule() {
  if (Platform.OS === 'web') return null;
  if (Notifications) return Notifications;
  try {
    Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    return Notifications;
  } catch (error) {
    console.log('Notifications: module not available:', error);
    return null;
  }
}

export class NotificationManager {
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.log('Notifications: web platform, skipping permissions');
      return false;
    }

    try {
      const mod = await getNotificationsModule();
      if (!mod) return false;

      const { status: existingStatus } = await mod.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await mod.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notifications: permission not granted');
        return false;
      }

      console.log('Notifications: permission granted');
      return true;
    } catch (error) {
      console.log('Notifications: error requesting permissions:', error);
      return false;
    }
  }

  static async scheduleBookingReminders(booking: Booking, settings: AppSettings): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const mod = await getNotificationsModule();
      if (!mod) {
        console.log('Notifications: module not available, skipping scheduling');
        return;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Notifications: no permission, skipping scheduling');
        return;
      }

      await this.cancelBookingReminders(booking.id);

      const checkInDate = parseISO(booking.checkInDate);
      const now = new Date();
      const days = Array.isArray(settings.notificationDays) ? settings.notificationDays : [];

      if (days.length === 0) {
        console.log('Notifications: notificationDays is empty, skipping scheduling');
        return;
      }

      for (const daysBefore of days) {
        const reminderDate = subDays(checkInDate, daysBefore);

        if (isBefore(reminderDate, now)) {
          console.log(`Notifications: skipping reminder ${daysBefore}d before (already past)`);
          continue;
        }

        const triggerDate = new Date(reminderDate);
        triggerDate.setHours(10, 0, 0, 0);

        const formattedDate = format(checkInDate, 'dd MMM yyyy', { locale: ru });
        const title = daysBefore === 0
          ? `Заезд сегодня — ${booking.cabinName}`
          : `Заезд через ${daysBefore} дн. — ${booking.cabinName}`;
        const body = `${booking.guestName}, заезд ${formattedDate}`;

        await mod.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { bookingId: booking.id, type: 'booking_reminder' },
            sound: true,
          },
          trigger: {
            type: mod.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
          identifier: `booking-${booking.id}-${daysBefore}`,
        });

        console.log(`Notifications: scheduled reminder for booking ${booking.id}, ${daysBefore}d before`);
      }
    } catch (error) {
      console.log('Notifications: error scheduling reminders:', error);
    }
  }

  static async cancelBookingReminders(bookingId: string): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const mod = await getNotificationsModule();
      if (!mod) return;

      const scheduled = await mod.getAllScheduledNotificationsAsync();
      const toCancel = scheduled.filter(n =>
        n.identifier.startsWith(`booking-${bookingId}-`)
      );

      for (const notification of toCancel) {
        await mod.cancelScheduledNotificationAsync(notification.identifier);
      }

      console.log(`Notifications: cancelled ${toCancel.length} reminders for booking ${bookingId}`);
    } catch (error) {
      console.log('Notifications: error cancelling reminders:', error);
    }
  }

  static async cancelAllNotifications(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const mod = await getNotificationsModule();
      if (!mod) return;

      await mod.cancelAllScheduledNotificationsAsync();
      console.log('Notifications: all notifications cancelled');
    } catch (error) {
      console.log('Notifications: error cancelling all:', error);
    }
  }

  static async getScheduledCount(): Promise<number> {
    if (Platform.OS === 'web') return 0;

    try {
      const mod = await getNotificationsModule();
      if (!mod) return 0;

      const scheduled = await mod.getAllScheduledNotificationsAsync();
      return scheduled.length;
    } catch {
      return 0;
    }
  }
}

export async function setupNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const mod = await getNotificationsModule();
    if (!mod) {
      console.log('Notifications: module not available, skipping setup');
      return;
    }

    await NotificationManager.requestPermissions();

    if (Platform.OS === 'android') {
      await mod.setNotificationChannelAsync('default', {
        name: 'Уведомления',
        importance: mod.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6D4C41',
        sound: 'default',
      });
    }

    console.log('Notifications: setup complete');
  } catch (error) {
    console.log('Notifications: setup error:', error);
  }
}
