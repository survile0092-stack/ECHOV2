import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import { File as FSFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Cabin, Booking, Reminder, AppSettings, AnalyticsFilter, AnalyticsData, MonthlyAnalytics, CabinPerformance, AppBackup } from '@/types';
import { parseISO, isWithinInterval, format, getYear, getMonth, isBefore, isAfter, differenceInDays, getDaysInMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

const STORAGE_KEYS = {
  CABINS: 'cabins',
  BOOKINGS: 'bookings',
  REMINDERS: 'reminders',
  SETTINGS: 'settings',
  INITIALIZED: 'initialized',
} as const;

const demoCabins: Cabin[] = [
  {
    id: 'cabin-1',
    name: 'Лесная усадьба',
    description: 'Уютный деревянный домик в сосновом лесу с камином и террасой. Идеально для семейного отдыха.',
    capacity: 6,
    pricePerNight: 4500,
    prices: [
      { id: 'p1-1', guestCount: 1, pricePerNight: 3500 },
      { id: 'p1-2', guestCount: 2, pricePerNight: 4500 },
      { id: 'p1-3', guestCount: 4, pricePerNight: 5500 },
      { id: 'p1-4', guestCount: 6, pricePerNight: 6500 },
    ],
    amenities: ['Камин', 'Wi-Fi', 'Кухня', 'Терраса', 'Барбекю', 'Парковка'],
    photoUris: [],
    isAvailable: true,
    createdAt: Date.now(),
  },
  {
    id: 'cabin-2',
    name: 'Горный приют',
    description: 'Компактный домик у подножия гор с панорамными окнами и видом на вершины.',
    capacity: 4,
    pricePerNight: 3800,
    prices: [
      { id: 'p2-1', guestCount: 1, pricePerNight: 2800 },
      { id: 'p2-2', guestCount: 2, pricePerNight: 3800 },
      { id: 'p2-3', guestCount: 4, pricePerNight: 4800 },
    ],
    amenities: ['Панорамные окна', 'Wi-Fi', 'Кухня', 'Отопление', 'Велосипеды'],
    photoUris: [],
    isAvailable: true,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'cabin-3',
    name: 'Домик у озера',
    description: 'Романтичный домик на берегу озера с частным пирсом и лодкой.',
    capacity: 2,
    pricePerNight: 5500,
    prices: [
      { id: 'p3-1', guestCount: 1, pricePerNight: 4500 },
      { id: 'p3-2', guestCount: 2, pricePerNight: 5500 },
    ],
    amenities: ['Вид на озеро', 'Спа-ванна', 'Камин', 'Завтрак включён', 'Wi-Fi'],
    photoUris: [],
    isAvailable: true,
    createdAt: Date.now() - 172800000,
  },
  {
    id: 'cabin-4',
    name: 'Лесной сруб',
    description: 'Традиционный сруб с современным интерьером, окружённый дикой природой.',
    capacity: 8,
    pricePerNight: 6200,
    prices: [
      { id: 'p4-1', guestCount: 2, pricePerNight: 5000 },
      { id: 'p4-2', guestCount: 4, pricePerNight: 6200 },
      { id: 'p4-3', guestCount: 6, pricePerNight: 7500 },
      { id: 'p4-4', guestCount: 8, pricePerNight: 8500 },
    ],
    amenities: ['Камин', 'Сауна', 'Wi-Fi', 'Кухня', 'Барбекю', 'Игровая комната'],
    photoUris: [],
    isAvailable: true,
    createdAt: Date.now() - 259200000,
  },
  {
    id: 'cabin-5',
    name: 'Мечтательная поляна',
    description: 'Уединённый домик на опушке леса с огромным окном для наблюдения за звёздами.',
    capacity: 3,
    pricePerNight: 3200,
    prices: [
      { id: 'p5-1', guestCount: 1, pricePerNight: 2500 },
      { id: 'p5-2', guestCount: 2, pricePerNight: 3200 },
      { id: 'p5-3', guestCount: 3, pricePerNight: 3800 },
    ],
    amenities: ['Окно для звёзд', 'Wi-Fi', 'Кухня', 'Йога-дека', 'Гамак'],
    photoUris: [],
    isAvailable: true,
    createdAt: Date.now() - 345600000,
  },
];

export class Storage {
  private static validateBooking(booking: Booking, bookings: Booking[]): void {
    const checkInDate = parseISO(booking.checkInDate);
    const checkOutDate = parseISO(booking.checkOutDate);

    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
      console.log('[Storage.validateBooking] invalid booking dates', booking);
      throw new Error('Некорректные даты бронирования');
    }

    if (isAfter(checkInDate, checkOutDate) || checkInDate.getTime() === checkOutDate.getTime()) {
      console.log('[Storage.validateBooking] invalid date range', booking);
      throw new Error('Дата выезда должна быть позже даты заезда');
    }

    const overlappingBooking = bookings.find((existingBooking) => {
      if (
        existingBooking.id === booking.id ||
        existingBooking.cabinId !== booking.cabinId ||
        existingBooking.status === 'CANCELLED'
      ) {
        return false;
      }

      const existingCheckInDate = parseISO(existingBooking.checkInDate);
      const existingCheckOutDate = parseISO(existingBooking.checkOutDate);

      const overlaps = isBefore(checkInDate, existingCheckOutDate) && isAfter(checkOutDate, existingCheckInDate);

      return overlaps;
    });

    if (overlappingBooking) {
      console.log('[Storage.validateBooking] overlapping booking detected', {
        booking,
        overlappingBooking,
      });
      throw new Error(
        `Выбранные даты пересекаются с бронированием ${overlappingBooking.guestName} (${overlappingBooking.checkInDate} — ${overlappingBooking.checkOutDate})`
      );
    }
  }

  static async initializeDemoData(): Promise<void> {
    const initialized = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (initialized) return;

    await AsyncStorage.setItem(STORAGE_KEYS.CABINS, JSON.stringify(demoCabins));
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([]));
    await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify([]));
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
      notificationsEnabled: true,
      darkMode: false,
      notificationDays: [3, 1],
    }));
    await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  static async getCabins(): Promise<Cabin[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CABINS);
    if (!data) return [];
    const cabins: Cabin[] = JSON.parse(data);
    return cabins.map(cabin => ({
      ...cabin,
      prices: cabin.prices || [{ id: `p-${cabin.id}-1`, guestCount: cabin.capacity, pricePerNight: cabin.pricePerNight }],
    }));
  }

  static async saveCabin(cabin: Cabin): Promise<void> {
    const cabins = await this.getCabins();
    const existingIndex = cabins.findIndex(c => c.id === cabin.id);
    
    if (existingIndex >= 0) {
      cabins[existingIndex] = cabin;
    } else {
      cabins.push(cabin);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.CABINS, JSON.stringify(cabins));
  }

  static async deleteCabin(id: string): Promise<void> {
    const cabins = await this.getCabins();
    const filtered = cabins.filter(c => c.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.CABINS, JSON.stringify(filtered));
  }

  static async getBookings(): Promise<Booking[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BOOKINGS);
    return data ? JSON.parse(data) : [];
  }

  static async saveBooking(booking: Booking): Promise<void> {
    const bookings = await this.getBookings();
    this.validateBooking(booking, bookings);
    const existingIndex = bookings.findIndex(b => b.id === booking.id);
    
    if (existingIndex >= 0) {
      bookings[existingIndex] = booking;
    } else {
      bookings.push(booking);
    }

    console.log('[Storage.saveBooking] saving booking', {
      id: booking.id,
      cabinId: booking.cabinId,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
    });
    
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  }

  static async deleteBooking(id: string): Promise<void> {
    const bookings = await this.getBookings();
    const filtered = bookings.filter(b => b.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(filtered));
  }

  static async getReminders(): Promise<Reminder[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
    return data ? JSON.parse(data) : [];
  }

  static async saveReminder(reminder: Reminder): Promise<void> {
    const reminders = await this.getReminders();
    const existingIndex = reminders.findIndex(r => r.id === reminder.id);
    
    if (existingIndex >= 0) {
      reminders[existingIndex] = reminder;
    } else {
      reminders.push(reminder);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
  }

  static async deleteRemindersByBookingId(bookingId: string): Promise<void> {
    const reminders = await this.getReminders();
    const filtered = reminders.filter(r => r.bookingId !== bookingId);
    await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(filtered));
  }

  static async getSettings(): Promise<AppSettings> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    const defaultSettings: AppSettings = { 
      notificationsEnabled: true, 
      darkMode: false,
      notificationDays: [3, 1],
    };
    if (!data) return defaultSettings;
    const parsed = JSON.parse(data);
    return {
      ...defaultSettings,
      ...parsed,
      notificationDays: parsed.notificationDays || [3, 1],
    };
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  static async getAnalyticsData(filter: AnalyticsFilter): Promise<AnalyticsData> {
    const bookings = await this.getBookings();
    const cabins = await this.getCabins();

    const filteredBookings = bookings.filter(booking => {
      if (booking.status !== 'CONFIRMED') return false;
      const checkIn = parseISO(booking.checkInDate);

      switch (filter.type) {
        case 'month':
          if (filter.year && filter.month !== undefined) {
            return getYear(checkIn) === filter.year && getMonth(checkIn) === filter.month;
          }
          return false;
        case 'period':
          if (filter.startDate && filter.endDate) {
            return isWithinInterval(checkIn, {
              start: parseISO(filter.startDate),
              end: parseISO(filter.endDate),
            });
          }
          return false;
        case 'year':
          if (filter.year) {
            return getYear(checkIn) === filter.year;
          }
          return false;
        default:
          return true;
      }
    });

    const totalRevenue = filteredBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalBookings = filteredBookings.length;
    const totalGuests = filteredBookings.reduce((sum, b) => sum + (b.guestCount || 1), 0);
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const monthlyMap = new Map<string, MonthlyAnalytics>();
    filteredBookings.forEach(booking => {
      const checkIn = parseISO(booking.checkInDate);
      const key = `${getYear(checkIn)}-${getMonth(checkIn)}`;
      const existing = monthlyMap.get(key);
      if (existing) {
        existing.revenue += booking.totalPrice;
        existing.bookings += 1;
        existing.guests += booking.guestCount || 1;
      } else {
        monthlyMap.set(key, {
          month: format(checkIn, 'MMM', { locale: ru }),
          year: getYear(checkIn),
          revenue: booking.totalPrice,
          bookings: 1,
          guests: booking.guestCount || 1,
        });
      }
    });

    const cabinMap = new Map<string, CabinPerformance>();
    cabins.forEach(cabin => {
      cabinMap.set(cabin.id, {
        cabinId: cabin.id,
        cabinName: cabin.name,
        revenue: 0,
        bookings: 0,
        occupancyRate: 0,
      });
    });

    filteredBookings.forEach(booking => {
      const existing = cabinMap.get(booking.cabinId);
      if (existing) {
        existing.revenue += booking.totalPrice;
        existing.bookings += 1;
      }
    });

    const totalNightsInPeriod = filter.type === 'month' && filter.year && filter.month !== undefined
      ? getDaysInMonth(new Date(filter.year, filter.month, 1))
      : filter.type === 'year' && filter.year
      ? (filter.year % 4 === 0 && (filter.year % 100 !== 0 || filter.year % 400 === 0) ? 366 : 365)
      : filter.type === 'period' && filter.startDate && filter.endDate
      ? Math.max(differenceInDays(parseISO(filter.endDate), parseISO(filter.startDate)), 1)
      : 30;

    const cabinNights = new Map<string, number>();
    filteredBookings.forEach(booking => {
      const nights = Math.max(differenceInDays(parseISO(booking.checkOutDate), parseISO(booking.checkInDate)), 0);
      cabinNights.set(booking.cabinId, (cabinNights.get(booking.cabinId) ?? 0) + nights);
    });

    cabinMap.forEach(perf => {
      const nights = cabinNights.get(perf.cabinId) ?? 0;
      perf.occupancyRate = Math.min((nights / totalNightsInPeriod) * 100, 100);
    });

    const occupancyRate = cabins.length > 0
      ? Array.from(cabinMap.values()).reduce((sum, c) => sum + c.occupancyRate, 0) / cabins.length
      : 0;

    return {
      totalRevenue,
      totalBookings,
      totalGuests,
      averageBookingValue,
      occupancyRate,
      monthlyData: Array.from(monthlyMap.values()).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month.localeCompare(b.month);
      }),
      cabinPerformance: Array.from(cabinMap.values()).sort((a, b) => b.revenue - a.revenue),
    };
  }

  static async exportToCSV(): Promise<string> {
    const bookings = await this.getBookings();
    const cabins = await this.getCabins();
    
    const csvHeader = 'ID,Домик,Гость,Телефон,Кол-во гостей,Заезд,Выезд,Сумма,Статус,Примечания\n';
    const csvRows = bookings.map(b => {
      const cabin = cabins.find(c => c.id === b.cabinId);
      return [
        b.id,
        cabin?.name || b.cabinName,
        b.guestName,
        b.guestPhone,
        b.guestCount || 1,
        b.checkInDate,
        b.checkOutDate,
        b.totalPrice,
        b.status,
        `"${(b.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });
    
    return csvHeader + csvRows.join('\n');
  }

  static async exportToExcel(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const bookings = await this.getBookings();
      const cabins = await this.getCabins();

      if (bookings.length === 0) {
        return { success: false, error: 'Нет данных для экспорта' };
      }

      const wsData = this.buildExcelData(bookings, cabins);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const colWidths = [15, 20, 20, 15, 12, 12, 12, 12, 12, 12, 30];
      ws['!cols'] = colWidths.map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, 'Бронирования');

      if (Platform.OS === 'web') {
        const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `bookings_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        link.click();
        URL.revokeObjectURL(link.href);
        return { success: true };
      }

      try {
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileName = `bookings_export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
        const exportFile = new FSFile(Paths.cache, fileName);

        try {
          if (exportFile.exists) {
            exportFile.delete();
          }
        } catch (e) {
          console.log('File cleanup warning:', e);
        }

        const base64String = wbout as string;
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        exportFile.create({ overwrite: true });
        exportFile.write(bytes);

        console.log('Excel file created at:', exportFile.uri);

        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          return { success: false, error: 'Функция «Поделиться» недоступна на этом устройстве' };
        }

        await Sharing.shareAsync(exportFile.uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Экспорт бронирований',
        });

        return { success: true, filePath: exportFile.uri };
      } catch (nativeError) {
        console.log('Native export error:', nativeError);
        return { success: false, error: 'Не удалось экспортировать: ' + (nativeError instanceof Error ? nativeError.message : 'неизвестная ошибка') };
      }
    } catch (error) {
      console.log('Export error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка при экспорте' };
    }
  }

  static async exportBackup(): Promise<{ success: boolean; error?: string }> {
    try {
      const cabins = await this.getCabins();
      const bookings = await this.getBookings();
      const reminders = await this.getReminders();
      const settings = await this.getSettings();

      const backup: AppBackup = {
        version: '1.1.0',
        exportDate: new Date().toISOString(),
        cabins,
        bookings,
        reminders,
        settings,
      };

      const jsonString = JSON.stringify(backup, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cabin_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
        return { success: true };
      }

      const fileName = `cabin_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
      const exportFile = new FSFile(Paths.cache, fileName);
      try {
        if (exportFile.exists) {
          exportFile.delete();
        }
      } catch (e) {
        console.log('File cleanup warning:', e);
      }
      exportFile.create({ overwrite: true });
      exportFile.write(jsonString);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        return { success: false, error: 'Функция «Поделиться» недоступна на этом устройстве' };
      }

      await Sharing.shareAsync(exportFile.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Экспорт данных приложения',
      });

      return { success: true };
    } catch (error) {
      console.log('Backup export error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' };
    }
  }

  static async importBackup(jsonString: string): Promise<{ success: boolean; error?: string; counts?: { cabins: number; bookings: number } }> {
    try {
      const data = JSON.parse(jsonString) as AppBackup;

      if (!data.cabins || !data.bookings || !data.settings) {
        return { success: false, error: 'Неверный формат файла резервной копии' };
      }

      if (!Array.isArray(data.cabins) || !Array.isArray(data.bookings)) {
        return { success: false, error: 'Данные повреждены или имеют неверный формат' };
      }

      await AsyncStorage.setItem(STORAGE_KEYS.CABINS, JSON.stringify(data.cabins));
      await AsyncStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(data.bookings));
      await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(data.reminders || []));
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));

      console.log(`Import successful: ${data.cabins.length} cabins, ${data.bookings.length} bookings`);

      return {
        success: true,
        counts: { cabins: data.cabins.length, bookings: data.bookings.length },
      };
    } catch (error) {
      console.log('Backup import error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Ошибка при чтении файла' };
    }
  }

  private static buildExcelData(bookings: Booking[], cabins: Cabin[]): (string | number)[][] {
    return [
      ['ID', 'Домик', 'Гость', 'Телефон', 'Кол-во гостей', 'Заезд', 'Выезд', 'Сумма (₽)', 'Предоплата (₽)', 'Остаток (₽)', 'Статус', 'Примечания'],
      ...bookings.map(b => {
        const cabin = cabins.find(c => c.id === b.cabinId);
        return [
          b.id,
          cabin?.name || b.cabinName,
          b.guestName,
          b.guestPhone,
          b.guestCount || 2,
          b.checkInDate,
          b.checkOutDate,
          b.totalPrice,
          b.prepayment ?? 0,
          b.remaining ?? b.totalPrice,
          b.status === 'CONFIRMED' ? 'Подтверждено' : b.status === 'CANCELLED' ? 'Отменено' : 'Ожидает',
          b.notes || '',
        ];
      })
    ];
  }
}
