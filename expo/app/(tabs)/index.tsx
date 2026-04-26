import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Tent,
  Calendar,
  TrendingUp,
  Plus,
  ChevronRight,
  Users,
  MapPin,
} from "lucide-react-native";
import { useBookingContext } from "@/context/BookingContext";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { format, parseISO, isAfter, getMonth, getYear } from "date-fns";
import { ru } from "date-fns/locale";
import type { Booking } from "@/types";

export default function DashboardScreen() {
  const router = useRouter();
  console.log("[DashboardScreen] render");
  const { bookings, getDashboardStats } = useBookingContext();

  const stats = getDashboardStats();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return bookings
      .filter(
        (b) => b.status === "CONFIRMED" && isAfter(parseISO(b.checkInDate), now)
      )
      .sort(
        (a, b) =>
          new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime()
      )
      .slice(0, 10);
  }, [bookings]);

  const groupedBookings = useMemo(() => {
    const groups: { key: string; label: string; bookings: Booking[] }[] = [];
    let currentKey = '';
    for (const booking of upcomingBookings) {
      const date = parseISO(booking.checkInDate);
      const month = getMonth(date);
      const year = getYear(date);
      const key = `${year}-${month}`;
      if (key !== currentKey) {
        currentKey = key;
        const label = format(date, 'LLLL yyyy', { locale: ru });
        groups.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), bookings: [] });
      }
      groups[groups.length - 1].bookings.push(booking);
    }
    return groups;
  }, [upcomingBookings]);

  const navigateToCabins = useCallback(() => {
    router.push("/cabins");
  }, [router]);

  const navigateToNewBooking = useCallback(() => {
    router.push("/booking/new");
  }, [router]);

  const navigateToBookings = useCallback(() => {
    router.push("/bookings");
  }, [router]);

  const navigateToAnalytics = useCallback(() => {
    router.push("/analytics");
  }, [router]);

  const navigateToBooking = useCallback(
    (id: string) => {
      router.push(`/booking/${id}`);
    },
    [router]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Добро пожаловать</Text>
              <Text style={styles.title}>Управление домиками</Text>
            </View>
            <View style={styles.headerIcon}>
              <MapPin size={20} color={Colors.primary} />
            </View>
          </View>
        </Animated.View>

        <View style={styles.statsGrid}>
          <StatCard
            icon={<Tent size={22} color={Colors.primary} />}
            title="Домики"
            value={stats.totalCabins}
            accent={Colors.primary}
            onPress={navigateToCabins}
          />
          <StatCard
            icon={<Calendar size={22} color={Colors.accent} />}
            title="Брони"
            value={stats.activeBookings}
            accent={Colors.accent}
            onPress={navigateToBookings}
          />
          <StatCard
            icon={<TrendingUp size={22} color={Colors.secondary} />}
            title="Выручка"
            value={`${stats.totalRevenue.toLocaleString()}\u20BD`}
            accent={Colors.secondary}
            onPress={navigateToAnalytics}
          />
          <StatCard
            icon={<Users size={22} color={Colors.info} />}
            title="На неделе"
            value={stats.upcomingCheckIns}
            accent={Colors.info}
            onPress={navigateToBookings}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Быстрые действия</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionPrimary}
              onPress={navigateToNewBooking}
              activeOpacity={0.85}
              testID="new-booking-button"
            >
              <Plus size={20} color={Colors.onPrimary} />
              <Text style={styles.actionPrimaryLabel}>Новая бронь</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionSecondary}
              onPress={navigateToCabins}
              activeOpacity={0.85}
              testID="view-cabins-button"
            >
              <Tent size={20} color={Colors.primary} />
              <Text style={styles.actionSecondaryLabel}>Домики</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ближайшие заезды</Text>
            <TouchableOpacity onPress={navigateToBookings} hitSlop={8}>
              <Text style={styles.seeAll}>Все брони</Text>
            </TouchableOpacity>
          </View>

          {upcomingBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={32} color={Colors.border} />
              <Text style={styles.emptyText}>Нет предстоящих заездов</Text>
              <TouchableOpacity onPress={navigateToNewBooking}>
                <Text style={styles.emptyAction}>Создать бронь</Text>
              </TouchableOpacity>
            </View>
          ) : (
            groupedBookings.map((group, groupIndex) => (
              <View key={group.key}>
                {groupIndex > 0 && <View style={styles.monthSeparatorSpacing} />}
                <View style={styles.monthSeparator}>
                  <View style={styles.monthSeparatorLine} />
                  <Text style={styles.monthSeparatorText}>{group.label}</Text>
                  <View style={styles.monthSeparatorLine} />
                </View>
                {group.bookings.map((booking) => (
                  <BookingPreviewCard
                    key={booking.id}
                    booking={booking}
                    onPress={() => navigateToBooking(booking.id)}
                  />
                ))}
              </View>
            ))
          )}
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  title,
  value,
  accent,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  accent: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.statCard, Shadows.md]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
      testID={`stat-${title}`}
    >
      <View style={[styles.statIconContainer, { backgroundColor: `${accent}15` }]}>
        {icon}
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

const BookingPreviewCard = React.memo(function BookingPreviewCard({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.bookingCard, Shadows.sm]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`booking-preview-${booking.id}`}
    >
      <View style={styles.bookingLeft}>
        <View style={styles.bookingAvatar}>
          <Text style={styles.bookingAvatarText}>
            {booking.guestName.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.bookingInfo}>
        <Text style={styles.bookingGuest}>{booking.guestName}</Text>
        <Text style={styles.bookingCabin}>{booking.cabinName}</Text>
        <Text style={styles.bookingDate}>
          {format(parseISO(booking.checkInDate), "dd MMM yyyy", { locale: ru })} {"\u2014"}{" "}
          {format(parseISO(booking.checkOutDate), "dd MMM yyyy", { locale: ru })}
        </Text>
      </View>
      <View style={styles.bookingRight}>
        <Text style={styles.bookingPrice}>{booking.totalPrice.toLocaleString()}{"\u20BD"}</Text>
        <ChevronRight size={18} color={Colors.onSurfaceVariant} />
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.h2,
    color: Colors.primary,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: `${Colors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flexBasis: "46%",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    overflow: "hidden" as const,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    ...Typography.h2,
    color: Colors.onSurface,
  },
  statTitle: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  seeAll: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: "600" as const,
    marginBottom: Spacing.md,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  actionPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  actionPrimaryLabel: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
  actionSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    gap: Spacing.sm,
  },
  actionSecondaryLabel: {
    ...Typography.button,
    color: Colors.primary,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
  },
  emptyAction: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: "600" as const,
    marginTop: Spacing.xs,
  },
  bookingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  bookingLeft: {
    marginRight: Spacing.md,
  },
  bookingAvatar: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  bookingAvatarText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.onPrimary,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingGuest: {
    ...Typography.h4,
    color: Colors.onSurface,
    fontSize: 15,
  },
  bookingCabin: {
    ...Typography.caption,
    color: Colors.primary,
    marginTop: 2,
  },
  bookingDate: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  bookingRight: {
    alignItems: "flex-end" as const,
    flexShrink: 0,
    gap: Spacing.xs,
  },
  bookingPrice: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    fontWeight: "600" as const,
  },
  monthSeparator: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  monthSeparatorSpacing: {
    height: Spacing.xs,
  },
  monthSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  monthSeparatorText: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    fontWeight: "600" as const,
    paddingHorizontal: Spacing.sm,
  },
});
