import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { Cabin, Booking, DashboardStats, AnalyticsFilter, AnalyticsData, AppSettings } from '@/types';
import { Storage } from '@/lib/storage';
import { NotificationManager } from '@/lib/notifications';
import { addDays, isAfter, isBefore, parseISO, differenceInDays } from 'date-fns';

export const [BookingProvider, useBookingContext] = createContextHook(() => {
  const queryClient = useQueryClient();

  const cabinsQuery = useQuery({
    queryKey: ['cabins'],
    queryFn: async () => {
      await Storage.initializeDemoData();
      return Storage.getCabins();
    },
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const bookingsQuery = useQuery({
    queryKey: ['bookings'],
    queryFn: () => Storage.getBookings(),
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const remindersQuery = useQuery({
    queryKey: ['reminders'],
    queryFn: () => Storage.getReminders(),
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => Storage.getSettings(),
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const saveCabinMutation = useMutation({
    mutationFn: async (cabin: Cabin) => {
      await Storage.saveCabin(cabin);
      return cabin;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cabins'] });
    },
  });

  const deleteCabinMutation = useMutation({
    mutationFn: async (id: string) => {
      await Storage.deleteCabin(id);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cabins'] });
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const saveBookingMutation = useMutation({
    mutationFn: async (booking: Booking) => {
      await Storage.saveBooking(booking);
      
      const settings = await Storage.getSettings();
      if (settings.notificationsEnabled && booking.status === 'CONFIRMED') {
        await NotificationManager.scheduleBookingReminders(booking, settings);
      }
      
      return booking;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Booking['status'] }) => {
      const bookings = await Storage.getBookings();
      const booking = bookings.find(b => b.id === id);
      if (!booking) throw new Error('Бронирование не найдено');
      
      const updated = { ...booking, status };
      await Storage.saveBooking(updated);
      
      if (status === 'CANCELLED') {
        await NotificationManager.cancelBookingReminders(id);
        await Storage.deleteRemindersByBookingId(id);
      }
      
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      await NotificationManager.cancelBookingReminders(id);
      await Storage.deleteRemindersByBookingId(id);
      await Storage.deleteBooking(id);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: AppSettings) => {
      await Storage.saveSettings(settings);
      return settings;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const getDashboardStats = useCallback((): DashboardStats => {
    const cabins = cabinsQuery.data || [];
    const bookings = bookingsQuery.data || [];
    const now = new Date();

    const activeBookings = bookings.filter(b => 
      b.status === 'CONFIRMED' && isAfter(parseISO(b.checkOutDate), now)
    );

    const upcomingCheckIns = bookings.filter(b =>
      b.status === 'CONFIRMED' && 
      isAfter(parseISO(b.checkInDate), now) &&
      isBefore(parseISO(b.checkInDate), addDays(now, 7))
    );

    const totalRevenue = bookings
      .filter(b => b.status === 'CONFIRMED')
      .reduce((sum, b) => sum + b.totalPrice, 0);

    return {
      totalCabins: cabins.length,
      activeBookings: activeBookings.length,
      upcomingCheckIns: upcomingCheckIns.length,
      totalRevenue,
    };
  }, [cabinsQuery.data, bookingsQuery.data]);

  const getCabinBookings = useCallback((cabinId: string): Booking[] => {
    const bookings = bookingsQuery.data || [];
    return bookings.filter(b => b.cabinId === cabinId && b.status !== 'CANCELLED');
  }, [bookingsQuery.data]);

  const isDateRangeAvailable = useCallback((
    cabinId: string, 
    checkIn: string, 
    checkOut: string, 
    excludeBookingId?: string
  ): boolean => {
    const bookings = bookingsQuery.data || [];
    const checkInDate = parseISO(checkIn);
    const checkOutDate = parseISO(checkOut);

    const cabinBookings = bookings.filter(b => 
      b.cabinId === cabinId && 
      b.status !== 'CANCELLED' &&
      b.id !== excludeBookingId
    );

    return !cabinBookings.some(booking => {
      const bookingStart = parseISO(booking.checkInDate);
      const bookingEnd = parseISO(booking.checkOutDate);
      
      return (
        isBefore(checkInDate, bookingEnd) &&
        isAfter(checkOutDate, bookingStart)
      );
    });
  }, [bookingsQuery.data]);

  const calculatePrice = useCallback((
    cabinId: string, 
    checkIn: string, 
    checkOut: string,
    guestCount?: number
  ): number => {
    const cabins = cabinsQuery.data || [];
    const cabin = cabins.find(c => c.id === cabinId);
    if (!cabin) return 0;

    const start = parseISO(checkIn);
    const end = parseISO(checkOut);
    const nights = differenceInDays(end, start);
    
    if (guestCount && cabin.prices && cabin.prices.length > 0) {
      const sortedPrices = [...cabin.prices].sort((a, b) => a.guestCount - b.guestCount);
      const applicablePrice = sortedPrices.find(p => p.guestCount >= guestCount);
      if (applicablePrice) {
        return nights * applicablePrice.pricePerNight;
      }
    }
    
    return nights * cabin.pricePerNight;
  }, [cabinsQuery.data]);

  const getPriceForGuests = useCallback((cabinId: string, guestCount: number): number => {
    const cabins = cabinsQuery.data || [];
    const cabin = cabins.find(c => c.id === cabinId);
    if (!cabin) return 0;
    
    if (cabin.prices && cabin.prices.length > 0) {
      const sortedPrices = [...cabin.prices].sort((a, b) => a.guestCount - b.guestCount);
      const applicablePrice = sortedPrices.find(p => p.guestCount >= guestCount);
      if (applicablePrice) {
        return applicablePrice.pricePerNight;
      }
    }
    
    return cabin.pricePerNight;
  }, [cabinsQuery.data]);

  const getAnalyticsData = useCallback(async (filter: AnalyticsFilter): Promise<AnalyticsData> => {
    return Storage.getAnalyticsData(filter);
  }, []);

  const exportToExcel = useCallback(async () => {
    return Storage.exportToExcel();
  }, []);

  const exportBackup = useCallback(async () => {
    return Storage.exportBackup();
  }, []);

  const importBackup = useCallback(async (jsonString: string) => {
    const result = await Storage.importBackup(jsonString);
    if (result.success) {
      void queryClient.invalidateQueries({ queryKey: ['cabins'] });
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['reminders'] });
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
    return result;
  }, [queryClient]);

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['cabins'] });
    void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    void queryClient.invalidateQueries({ queryKey: ['reminders'] });
    void queryClient.invalidateQueries({ queryKey: ['settings'] });
  }, [queryClient]);

  return useMemo(() => ({
    cabins: cabinsQuery.data || [],
    bookings: bookingsQuery.data || [],
    reminders: remindersQuery.data || [],
    settings: settingsQuery.data || { notificationsEnabled: true, darkMode: false, notificationDays: [3, 1] },
    isLoading: cabinsQuery.isLoading || bookingsQuery.isLoading,
    
    saveCabin: saveCabinMutation.mutate,
    deleteCabin: deleteCabinMutation.mutate,
    saveBooking: saveBookingMutation.mutate,
    updateBookingStatus: updateBookingStatusMutation.mutate,
    deleteBooking: deleteBookingMutation.mutate,
    saveSettings: saveSettingsMutation.mutate,
    
    getDashboardStats,
    getCabinBookings,
    isDateRangeAvailable,
    calculatePrice,
    getPriceForGuests,
    getAnalyticsData,
    exportToExcel,
    exportBackup,
    importBackup,
    refresh,
  }), [
    cabinsQuery.data,
    cabinsQuery.isLoading,
    bookingsQuery.data,
    bookingsQuery.isLoading,
    remindersQuery.data,
    settingsQuery.data,
    saveCabinMutation.mutate,
    deleteCabinMutation.mutate,
    saveBookingMutation.mutate,
    updateBookingStatusMutation.mutate,
    deleteBookingMutation.mutate,
    saveSettingsMutation.mutate,
    getDashboardStats,
    getCabinBookings,
    isDateRangeAvailable,
    calculatePrice,
    getPriceForGuests,
    getAnalyticsData,
    exportToExcel,
    exportBackup,
    importBackup,
    refresh,
  ]);
});
