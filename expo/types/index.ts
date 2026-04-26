export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface CabinPrice {
  id: string;
  guestCount: number;
  pricePerNight: number;
}

export interface Cabin {
  id: string;
  name: string;
  description: string;
  capacity: number;
  pricePerNight: number;
  prices: CabinPrice[];
  amenities: string[];
  photoUris: string[];
  isAvailable: boolean;
  createdAt: number;
}

export interface Booking {
  id: string;
  cabinId: string;
  cabinName: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  prepayment: number;
  remaining: number;
  customPrice: boolean;
  status: BookingStatus;
  notes: string;
  createdAt: number;
}

export interface Reminder {
  id: string;
  bookingId: string;
  reminderDate: string;
  message: string;
  isTriggered: boolean;
}

export interface DashboardStats {
  totalCabins: number;
  activeBookings: number;
  upcomingCheckIns: number;
  totalRevenue: number;
}

export interface AnalyticsFilter {
  type: 'month' | 'period' | 'year';
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}

export interface AnalyticsData {
  totalRevenue: number;
  totalBookings: number;
  totalGuests: number;
  averageBookingValue: number;
  occupancyRate: number;
  monthlyData: MonthlyAnalytics[];
  cabinPerformance: CabinPerformance[];
}

export interface MonthlyAnalytics {
  month: string;
  year: number;
  revenue: number;
  bookings: number;
  guests: number;
}

export interface CabinPerformance {
  cabinId: string;
  cabinName: string;
  revenue: number;
  bookings: number;
  occupancyRate: number;
}

export interface AppSettings {
  notificationsEnabled: boolean;
  darkMode: boolean;
  notificationDays: number[];
}

export interface AppBackup {
  version: string;
  exportDate: string;
  cabins: Cabin[];
  bookings: Booking[];
  reminders: Reminder[];
  settings: AppSettings;
}

export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };
