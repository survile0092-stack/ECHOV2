import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Plus, ChevronRight, Clock, X, Users, Phone, FileText, List, CalendarDays } from "lucide-react-native";
import { Calendar as RNCalendar, LocaleConfig } from "react-native-calendars";
import { useBookingContext } from "@/context/BookingContext";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { format, parseISO, isAfter, isBefore, getMonth, getYear } from "date-fns";
import { ru } from "date-fns/locale";
import type { Booking } from "@/types";

LocaleConfig.locales.ru = {
  monthNames: [
    "\u042F\u043D\u0432\u0430\u0440\u044C", "\u0424\u0435\u0432\u0440\u0430\u043B\u044C", "\u041C\u0430\u0440\u0442", "\u0410\u043F\u0440\u0435\u043B\u044C", "\u041C\u0430\u0439", "\u0418\u044E\u043D\u044C",
    "\u0418\u044E\u043B\u044C", "\u0410\u0432\u0433\u0443\u0441\u0442", "\u0421\u0435\u043D\u0442\u044F\u0431\u0440\u044C", "\u041E\u043A\u0442\u044F\u0431\u0440\u044C", "\u041D\u043E\u044F\u0431\u0440\u044C", "\u0414\u0435\u043A\u0430\u0431\u0440\u044C",
  ],
  monthNamesShort: [
    "\u042F\u043D\u0432", "\u0424\u0435\u0432", "\u041C\u0430\u0440", "\u0410\u043F\u0440", "\u041C\u0430\u0439", "\u0418\u044E\u043D",
    "\u0418\u044E\u043B", "\u0410\u0432\u0433", "\u0421\u0435\u043D", "\u041E\u043A\u0442", "\u041D\u043E\u044F", "\u0414\u0435\u043A",
  ],
  dayNames: [
    "\u0412\u043E\u0441\u043A\u0440\u0435\u0441\u0435\u043D\u044C\u0435", "\u041F\u043E\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u0438\u043A", "\u0412\u0442\u043E\u0440\u043D\u0438\u043A", "\u0421\u0440\u0435\u0434\u0430", "\u0427\u0435\u0442\u0432\u0435\u0440\u0433", "\u041F\u044F\u0442\u043D\u0438\u0446\u0430", "\u0421\u0443\u0431\u0431\u043E\u0442\u0430",
  ],
  dayNamesShort: ["\u0412\u0441", "\u041F\u043D", "\u0412\u0442", "\u0421\u0440", "\u0427\u0442", "\u041F\u0442", "\u0421\u0431"],
  today: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F",
};
LocaleConfig.defaultLocale = "ru";

type ViewType = "list" | "calendar";
type TabType = "upcoming" | "past" | "cancelled";

interface MarkedDates {
  [date: string]: {
    selected?: boolean;
    marked?: boolean;
    dots?: { color: string }[];
    selectedColor?: string;
    customStyles?: {
      container?: { backgroundColor: string; borderRadius: number };
      text?: { color: string };
    };
  };
}

export default function BookingsScreen() {
  const router = useRouter();
  console.log("[BookingsScreen] render");
  const { bookings } = useBookingContext();
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [viewType, setViewType] = useState<ViewType>("list");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const filteredBookings = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((booking) => {
        const checkIn = parseISO(booking.checkInDate);
        const checkOut = parseISO(booking.checkOutDate);
        switch (activeTab) {
          case "upcoming":
            return (
              booking.status !== "CANCELLED" &&
              (isAfter(checkIn, now) ||
                (isBefore(checkIn, now) && isAfter(checkOut, now)))
            );
          case "past":
            return booking.status !== "CANCELLED" && isBefore(checkOut, now);
          case "cancelled":
            return booking.status === "CANCELLED";
          default:
            return true;
        }
      })
      .sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime());
  }, [bookings, activeTab]);

  const groupedFilteredBookings = useMemo(() => {
    const groups: { key: string; label: string; bookings: Booking[] }[] = [];
    let currentKey = '';
    for (const booking of filteredBookings) {
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
  }, [filteredBookings]);

  const markedDates = useMemo<MarkedDates>(() => {
    const marks: MarkedDates = {};
    bookings.forEach((booking) => {
      if (booking.status === "CANCELLED") return;
      const checkIn = parseISO(booking.checkInDate);
      const checkOut = parseISO(booking.checkOutDate);
      const color = booking.status === "CONFIRMED" ? Colors.confirmed : Colors.pending;
      const current = new Date(checkIn);
      while (current < checkOut) {
        const dateStr = format(current, "yyyy-MM-dd");
        if (!marks[dateStr]) {
          marks[dateStr] = {
            marked: true,
            dots: [{ color }],
            customStyles: {
              container: { backgroundColor: `${color}30`, borderRadius: 8 },
              text: { color: Colors.onSurface },
            },
          };
        } else {
          marks[dateStr].dots?.push({ color });
        }
        current.setDate(current.getDate() + 1);
      }
    });
    if (selectedDate) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: Colors.primary,
        customStyles: {
          container: { backgroundColor: Colors.primary, borderRadius: 8 },
          text: { color: Colors.onPrimary },
        },
      };
    }
    return marks;
  }, [bookings, selectedDate]);

  const bookingsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return bookings.filter((booking) => {
      if (booking.status === "CANCELLED") return false;
      const checkIn = parseISO(booking.checkInDate);
      const checkOut = parseISO(booking.checkOutDate);
      const selected = parseISO(selectedDate);
      return selected >= checkIn && selected < checkOut;
    });
  }, [bookings, selectedDate]);

  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      setSelectedDate(day.dateString);
      const dayBookings = bookings.filter((booking) => {
        if (booking.status === "CANCELLED") return false;
        const checkIn = parseISO(booking.checkInDate);
        const checkOut = parseISO(booking.checkOutDate);
        const selected = parseISO(day.dateString);
        return selected >= checkIn && selected < checkOut;
      });
      if (dayBookings.length > 0) {
        setShowBookingModal(true);
      }
    },
    [bookings]
  );

  const navigateToBooking = useCallback(
    (id: string) => {
      router.push(`/booking/${id}`);
    },
    [router]
  );

  const navigateToNewBooking = useCallback(() => {
    router.push("/booking/new");
  }, [router]);

  const getStatusText = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E";
      case "PENDING":
        return "\u041E\u0436\u0438\u0434\u0430\u0435\u0442";
      case "CANCELLED":
        return "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u043E";
      default:
        return status;
    }
  };

  const tabCounts = useMemo(() => {
    const now = new Date();
    const upcoming = bookings.filter((b) => {
      const ci = parseISO(b.checkInDate);
      const co = parseISO(b.checkOutDate);
      return b.status !== "CANCELLED" && (isAfter(ci, now) || (isBefore(ci, now) && isAfter(co, now)));
    }).length;
    const past = bookings.filter(
      (b) => b.status !== "CANCELLED" && isBefore(parseISO(b.checkOutDate), now)
    ).length;
    const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
    return { upcoming, past, cancelled };
  }, [bookings]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{"\u0411\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F"}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.viewToggle, viewType === "calendar" && styles.viewToggleActive]}
            onPress={() => setViewType(viewType === "list" ? "calendar" : "list")}
            activeOpacity={0.7}
            testID="view-toggle"
          >
            {viewType === "list" ? (
              <CalendarDays size={18} color={Colors.onSurface} />
            ) : (
              <List size={18} color={Colors.onPrimary} />
            )}
            <Text style={[styles.viewToggleText, viewType === "calendar" && styles.viewToggleTextActive]}>
              {viewType === "list" ? "\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C" : "\u0421\u043F\u0438\u0441\u043E\u043A"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={navigateToNewBooking}
            activeOpacity={0.8}
            testID="add-booking-button"
          >
            <Plus size={20} color={Colors.onPrimary} />
            <Text style={styles.addButtonText}>{"\u041D\u043E\u0432\u0430\u044F \u0431\u0440\u043E\u043D\u044C"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewType === "list" ? (
        <>
          <View style={styles.tabsContainer}>
            {([
              { key: "upcoming" as const, label: "\u041F\u0440\u0435\u0434\u0441\u0442\u043E\u044F\u0449\u0438\u0435", count: tabCounts.upcoming },
              { key: "past" as const, label: "\u041F\u0440\u043E\u0448\u0435\u0434\u0448\u0438\u0435", count: tabCounts.past },
              { key: "cancelled" as const, label: "\u041E\u0442\u043C\u0435\u043D\u0451\u043D\u043D\u044B\u0435", count: tabCounts.cancelled },
            ]).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {filteredBookings.length === 0 ? (
              <View style={styles.emptyState}>
                <CalendarDays size={40} color={Colors.border} />
                <Text style={styles.emptyTitle}>{"\u041D\u0435\u0442 \u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0439"}</Text>
                <Text style={styles.emptyText}>
                  {activeTab === "upcoming"
                    ? "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043F\u0435\u0440\u0432\u0443\u044E \u0431\u0440\u043E\u043D\u044C"
                    : "\u0417\u0434\u0435\u0441\u044C \u043F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E"}
                </Text>
              </View>
            ) : (
              groupedFilteredBookings.map((group, groupIndex) => (
                <View key={group.key}>
                  {groupIndex > 0 && <View style={styles.monthSeparatorSpacing} />}
                  <View style={styles.monthSeparator}>
                    <View style={styles.monthSeparatorLine} />
                    <Text style={styles.monthSeparatorText}>{group.label}</Text>
                    <View style={styles.monthSeparatorLine} />
                  </View>
                  {group.bookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} onPress={() => navigateToBooking(booking.id)} />
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </>
      ) : (
        <ScrollView style={styles.calendarContainer} showsVerticalScrollIndicator={false}>
          <View style={[styles.calendarCard, Shadows.sm]}>
            <RNCalendar
              onDayPress={handleDayPress}
              markedDates={markedDates}
              markingType="custom"
              theme={{
                backgroundColor: Colors.surface,
                calendarBackground: Colors.surface,
                selectedDayBackgroundColor: Colors.primary,
                selectedDayTextColor: Colors.onPrimary,
                todayTextColor: Colors.primary,
                dayTextColor: Colors.onSurface,
                textDisabledColor: Colors.border,
                monthTextColor: Colors.onSurface,
                arrowColor: Colors.primary,
                textMonthFontSize: 16,
                textMonthFontWeight: "600",
              }}
            />
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.confirmed }]} />
              <Text style={styles.legendText}>{"\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E"}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.pending }]} />
              <Text style={styles.legendText}>{"\u041E\u0436\u0438\u0434\u0430\u0435\u0442"}</Text>
            </View>
          </View>

          {selectedDate && bookingsForSelectedDate.length > 0 && (
            <View style={styles.selectedDateSection}>
              <Text style={styles.selectedDateTitle}>
                {format(parseISO(selectedDate), "dd MMM yyyy", { locale: ru })}
              </Text>
              {bookingsForSelectedDate.map((booking) => (
                <TouchableOpacity
                  key={booking.id}
                  style={[styles.selectedBookingCard, Shadows.sm]}
                  onPress={() => navigateToBooking(booking.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.selectedBookingHeader}>
                    <Text style={[styles.selectedBookingGuest, booking.guestName === "Имя гостя не указано" && styles.guestNameMissing]}>{booking.guestName}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: `${
                            booking.status === "CONFIRMED" ? Colors.confirmed : Colors.pending
                          }20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              booking.status === "CONFIRMED" ? Colors.confirmed : Colors.pending,
                          },
                        ]}
                      >
                        {getStatusText(booking.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.selectedBookingCabin}>{booking.cabinName}</Text>
                  <Text style={styles.selectedBookingDates}>
                    {format(parseISO(booking.checkInDate), "dd MMM yyyy", { locale: ru })} -{" "}
                    {format(parseISO(booking.checkOutDate), "dd MMM yyyy", { locale: ru })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}

      <Modal
        visible={showBookingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDate ? format(parseISO(selectedDate), "dd MMM yyyy", { locale: ru }) : "\u0411\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F"}
              </Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowBookingModal(false)}
                hitSlop={8}
              >
                <X size={22} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {bookingsForSelectedDate.length === 0 ? (
                <Text style={styles.modalEmpty}>{"\u041D\u0435\u0442 \u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0439 \u043D\u0430 \u044D\u0442\u0443 \u0434\u0430\u0442\u0443"}</Text>
              ) : (
                bookingsForSelectedDate.map((booking) => (
                  <TouchableOpacity
                    key={booking.id}
                    style={[styles.modalBookingCard, Shadows.sm]}
                    onPress={() => {
                      setShowBookingModal(false);
                      navigateToBooking(booking.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalBookingHeader}>
                      <Text style={[styles.modalBookingGuest, booking.guestName === "Имя гостя не указано" && styles.guestNameMissing]}>{booking.guestName}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: `${
                              booking.status === "CONFIRMED" ? Colors.confirmed : Colors.pending
                            }20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color:
                                booking.status === "CONFIRMED"
                                  ? Colors.confirmed
                                  : Colors.pending,
                            },
                          ]}
                        >
                          {getStatusText(booking.status)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.modalBookingCabin}>{booking.cabinName}</Text>

                    <View style={styles.modalBookingDetails}>
                      <View style={styles.modalBookingDetail}>
                        <Users size={14} color={Colors.onSurfaceVariant} />
                        <Text style={styles.modalBookingDetailText}>
                          {booking.guestCount || 1} {"\u0433\u043E\u0441\u0442\u0435\u0439"}
                        </Text>
                      </View>
                      {booking.guestPhone ? (
                        <View style={styles.modalBookingDetail}>
                          <Phone size={14} color={Colors.onSurfaceVariant} />
                          <Text style={styles.modalBookingDetailText}>{booking.guestPhone}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.modalBookingDates}>
                      <Clock size={14} color={Colors.onSurfaceVariant} />
                      <Text style={styles.modalBookingDatesText}>
                        {format(parseISO(booking.checkInDate), "dd MMM yyyy", { locale: ru })} -{" "}
                        {format(parseISO(booking.checkOutDate), "dd MMM yyyy", { locale: ru })}
                      </Text>
                    </View>

                    {booking.notes ? (
                      <View style={styles.modalBookingNotes}>
                        <FileText size={14} color={Colors.onSurfaceVariant} />
                        <Text style={styles.modalBookingNotesText} numberOfLines={2}>
                          {booking.notes}
                        </Text>
                      </View>
                    ) : null}

                    <Text style={styles.modalBookingPrice}>
                      {booking.totalPrice.toLocaleString()} {"\u20BD"}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const BookingCard = React.memo(function BookingCard({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress: () => void;
}) {
  const getStatusColor = () => {
    switch (booking.status) {
      case "CONFIRMED":
        return Colors.confirmed;
      case "PENDING":
        return Colors.pending;
      case "CANCELLED":
        return Colors.cancelled;
      default:
        return Colors.onSurfaceVariant;
    }
  };

  const getStatusLabel = () => {
    switch (booking.status) {
      case "CONFIRMED":
        return "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E";
      case "PENDING":
        return "\u041E\u0436\u0438\u0434\u0430\u0435\u0442";
      case "CANCELLED":
        return "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u043E";
      default:
        return booking.status;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.bookingCard, Shadows.md]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`booking-card-${booking.id}`}
    >
      <View style={styles.bookingCardTop}>
        <View style={styles.bookingCardLeft}>
          <View style={[styles.bookingIndicator, { backgroundColor: getStatusColor() }]} />
          <View>
            <Text style={[styles.guestName, booking.guestName === "Имя гостя не указано" && styles.guestNameMissing]}>{booking.guestName}</Text>
            <Text style={styles.cabinName}>{booking.cabinName}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusLabel()}</Text>
        </View>
      </View>

      <View style={styles.bookingDates}>
        <View style={styles.dateRow}>
          <Clock size={14} color={Colors.onSurfaceVariant} />
          <Text style={styles.dateText}>
            {format(parseISO(booking.checkInDate), "dd MMM yyyy", { locale: ru })} {"\u2192"}{" "}
            {format(parseISO(booking.checkOutDate), "dd MMM yyyy", { locale: ru })}
          </Text>
        </View>
      </View>

      <View style={styles.bookingFooter}>
        <Text style={styles.price}>{booking.totalPrice.toLocaleString()}{"\u20BD"}</Text>
        <ChevronRight size={20} color={Colors.onSurfaceVariant} />
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTop: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    color: Colors.primary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  viewToggle: {
    flex: 1,
    height: 42,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  viewToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  viewToggleText: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    fontWeight: "500" as const,
  },
  viewToggleTextActive: {
    color: Colors.onPrimary,
  },
  addButton: {
    flex: 1,
    height: 42,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  addButtonText: {
    ...Typography.bodySmall,
    color: Colors.onPrimary,
    fontWeight: "600" as const,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
    fontSize: 13,
  },
  tabTextActive: {
    color: Colors.onPrimary,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  tabBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.onSurfaceVariant,
  },
  tabBadgeTextActive: {
    color: Colors.onPrimary,
  },
  list: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  bookingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bookingCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  bookingCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  bookingIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  guestName: {
    ...Typography.h4,
    color: Colors.onSurface,
    fontSize: 15,
  },
  guestNameMissing: {
    backgroundColor: "#FFF3B0",
    color: "#7A5A00",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  cabinName: {
    ...Typography.bodySmall,
    color: Colors.primary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    ...Typography.caption,
    textTransform: "uppercase",
    fontWeight: "600" as const,
    fontSize: 10,
  },
  bookingDates: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  dateText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  price: {
    ...Typography.h3,
    color: Colors.onSurface,
  },
  emptyState: {
    padding: Spacing.xxl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.onSurface,
    marginTop: Spacing.sm,
  },
  emptyText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  calendarContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  calendarCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  selectedDateSection: {
    paddingHorizontal: Spacing.sm,
  },
  selectedDateTitle: {
    ...Typography.h4,
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  selectedBookingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  selectedBookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  selectedBookingGuest: {
    ...Typography.body,
    fontWeight: "600" as const,
    color: Colors.onSurface,
  },
  selectedBookingCabin: {
    ...Typography.bodySmall,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  selectedBookingDates: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "80%",
    paddingBottom: Spacing.xl,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.onSurface,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: Spacing.lg,
  },
  modalEmpty: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
  modalBookingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  modalBookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  modalBookingGuest: {
    ...Typography.h4,
    color: Colors.onSurface,
  },
  modalBookingCabin: {
    ...Typography.body,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  modalBookingDetails: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  modalBookingDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  modalBookingDetailText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  modalBookingDates: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  modalBookingDatesText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  modalBookingNotes: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  modalBookingNotesText: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    flex: 1,
  },
  modalBookingPrice: {
    ...Typography.h3,
    color: Colors.primary,
    textAlign: "right",
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
