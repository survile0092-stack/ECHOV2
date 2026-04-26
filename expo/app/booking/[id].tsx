import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import {
  Calendar,
  Phone,
  User,
  Banknote,
  FileText,
  CheckCircle,
  XCircle,
  Trash2,
  Users,
  Moon,
  CreditCard,
  Wallet,
  Edit3,
} from "lucide-react-native";
import { useBookingContext } from "@/context/BookingContext";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Подтверждено",
  PENDING: "Ожидает",
  CANCELLED: "Отменено",
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  console.log("[BookingDetailScreen] render", id);
  const router = useRouter();
  const { bookings, updateBookingStatus, deleteBooking } = useBookingContext();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const booking = useMemo(() => {
    return bookings.find((b) => b.id === id);
  }, [bookings, id]);

  const handleConfirm = useCallback(() => {
    if (!booking) return;
    updateBookingStatus({ id: booking.id, status: "CONFIRMED" });
  }, [booking, updateBookingStatus]);

  const handleCancel = useCallback(() => {
    if (!booking) return;
    Alert.alert(
      "Отменить бронирование",
      "Вы уверены, что хотите отменить это бронирование?",
      [
        { text: "Нет", style: "cancel" },
        {
          text: "Да, отменить",
          style: "destructive",
          onPress: () => updateBookingStatus({ id: booking.id, status: "CANCELLED" }),
        },
      ]
    );
  }, [booking, updateBookingStatus]);

  const handleDelete = useCallback(() => {
    if (!booking) return;
    Alert.alert(
      "Удалить бронирование",
      "Вы уверены, что хотите навсегда удалить это бронирование?",
      [
        { text: "Нет", style: "cancel" },
        {
          text: "Да, удалить",
          style: "destructive",
          onPress: () => {
            deleteBooking(booking.id);
            router.back();
          },
        },
      ]
    );
  }, [booking, deleteBooking, router]);

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: "Не найдено" }} />
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>{"Бронирование не найдено"}</Text>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>{"Назад"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

  const nights = Math.ceil(
    (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const prepaymentAmount = booking.prepayment ?? 0;
  const remainingAmount = booking.remaining ?? booking.totalPrice;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: `Бронь #${booking.id.slice(-6)}`,
        }}
      />
      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {STATUS_LABELS[booking.status] || booking.status}
            </Text>
          </View>
          <Text style={styles.bookingId}>{"Бронь"} #{booking.id.slice(-6)}</Text>
        </View>

        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.cardTitle}>{"Информация о госте"}</Text>
          <InfoRow
            icon={<User size={20} color={Colors.primary} />}
            label={"Имя гостя"}
            value={booking.guestName}
          />
          {booking.guestPhone ? (
            <InfoRow
              icon={<Phone size={20} color={Colors.primary} />}
              label={"Телефон"}
              value={booking.guestPhone}
            />
          ) : null}
          <InfoRow
            icon={<Users size={20} color={Colors.primary} />}
            label={"Количество гостей"}
            value={`${booking.guestCount || 2} чел.`}
          />
        </View>

        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.cardTitle}>{"Домик"}</Text>
          <View style={styles.cabinRow}>
            <View style={styles.cabinAvatar}>
              <Text style={styles.cabinAvatarText}>
                {booking.cabinName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.cabinInfo}>
              <Text style={styles.cabinLabel}>{"Название"}</Text>
              <Text style={styles.cabinValue}>{booking.cabinName}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.cardTitle}>{"Даты"}</Text>
          <InfoRow
            icon={<Calendar size={20} color={Colors.accent} />}
            label={"Заезд"}
            value={format(parseISO(booking.checkInDate), "dd MMM yyyy", { locale: ru })}
          />
          <InfoRow
            icon={<Calendar size={20} color={Colors.error} />}
            label={"Выезд"}
            value={format(parseISO(booking.checkOutDate), "dd MMM yyyy", { locale: ru })}
          />
          <View style={styles.nightsBadge}>
            <Moon size={14} color={Colors.primary} />
            <Text style={styles.nightsText}>
              {nights} {getNightsWord(nights)}
            </Text>
          </View>
        </View>

        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.cardTitle}>{"Оплата"}</Text>
          <View style={styles.paymentBlock}>
            <View style={styles.paymentMainRow}>
              <Banknote size={20} color={Colors.primary} />
              <View style={styles.priceInfo}>
                <Text style={styles.totalPrice}>
                  {booking.totalPrice.toLocaleString()}{"₽"}
                </Text>
                {booking.customPrice && (
                  <Text style={styles.customPriceLabel}>{"Указана вручную"}</Text>
                )}
              </View>
            </View>

            <View style={styles.paymentDivider} />

            <View style={styles.paymentDetailsGrid}>
              <View style={styles.paymentDetailItem}>
                <View style={styles.paymentDetailHeader}>
                  <CreditCard size={16} color={Colors.accent} />
                  <Text style={styles.paymentDetailLabel}>{"Предоплата"}</Text>
                </View>
                <Text style={[styles.paymentDetailValue, { color: Colors.accent }]}>
                  {prepaymentAmount.toLocaleString()}{"₽"}
                </Text>
              </View>
              <View style={styles.paymentDetailItem}>
                <View style={styles.paymentDetailHeader}>
                  <Wallet size={16} color={remainingAmount > 0 ? Colors.warning : Colors.accent} />
                  <Text style={styles.paymentDetailLabel}>{"Остаток"}</Text>
                </View>
                <Text style={[styles.paymentDetailValue, { color: remainingAmount > 0 ? Colors.warning : Colors.accent }]}>
                  {remainingAmount.toLocaleString()}{"₽"}
                </Text>
              </View>
            </View>

            <View style={styles.paymentSummaryBar}>
              <Text style={styles.paymentSummaryLabel}>{"Общая сумма"}</Text>
              <Text style={styles.paymentSummaryValue}>
                {booking.totalPrice.toLocaleString()}{"₽"}
              </Text>
            </View>
          </View>
        </View>

        {booking.notes ? (
          <View style={[styles.card, Shadows.sm]}>
            <Text style={styles.cardTitle}>{"Примечания"}</Text>
            <View style={styles.notesRow}>
              <FileText size={20} color={Colors.primary} />
              <Text style={styles.notesText}>{booking.notes}</Text>
            </View>
          </View>
        ) : null}

        {booking.status !== "CANCELLED" && (
          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => router.push(`/booking/edit?id=${booking.id}`)}
              activeOpacity={0.85}
              testID="edit-booking"
            >
              <Edit3 size={20} color={Colors.onPrimary} />
              <Text style={styles.actionButtonText}>{"Редактировать бронь"}</Text>
            </TouchableOpacity>
            {booking.status === "PENDING" && (
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={handleConfirm}
                activeOpacity={0.85}
                testID="confirm-booking"
              >
                <CheckCircle size={20} color={Colors.onPrimary} />
                <Text style={styles.actionButtonText}>{"Подтвердить бронь"}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              activeOpacity={0.85}
              testID="cancel-booking"
            >
              <XCircle size={20} color={Colors.error} />
              <Text style={styles.cancelButtonText}>{"Отменить бронь"}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.deleteLink}
          onPress={handleDelete}
          activeOpacity={0.6}
          testID="delete-booking"
        >
          <Trash2 size={18} color={Colors.error} />
          <Text style={styles.deleteText}>{"Удалить бронирование"}</Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.xxl }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      {icon}
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function getNightsWord(n: number): string {
  if (n === 1) return "ночь";
  if (n >= 2 && n <= 4) return "ночи";
  return "ночей";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
    padding: Spacing.lg,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  notFoundText: {
    ...Typography.h3,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.lg,
  },
  backLink: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  backLinkText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...Typography.bodySmall,
    fontWeight: "700" as const,
    textTransform: "uppercase",
  },
  bookingId: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    ...Typography.h4,
    color: Colors.onSurface,
    marginBottom: Spacing.md,
    fontSize: 15,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },
  infoValue: {
    ...Typography.body,
    color: Colors.onSurface,
    fontWeight: "600" as const,
    marginTop: 1,
  },
  cabinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  cabinAvatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  cabinAvatarText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.onPrimary,
  },
  cabinInfo: {
    flex: 1,
  },
  cabinLabel: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },
  cabinValue: {
    ...Typography.body,
    color: Colors.onSurface,
    fontWeight: "600" as const,
    marginTop: 1,
  },
  nightsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: `${Colors.primary}12`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
  },
  nightsText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  paymentBlock: {
    gap: Spacing.md,
  },
  paymentMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  priceInfo: {
    flex: 1,
  },
  totalPrice: {
    ...Typography.h2,
    color: Colors.primary,
  },
  customPriceLabel: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    fontStyle: "italic",
    marginTop: 2,
  },
  paymentDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  paymentDetailsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  paymentDetailItem: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  paymentDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  paymentDetailLabel: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },
  paymentDetailValue: {
    ...Typography.h3,
    fontWeight: "700" as const,
  },
  paymentSummaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: `${Colors.primary}10`,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  paymentSummaryLabel: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    fontWeight: "600" as const,
  },
  paymentSummaryValue: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: "700" as const,
  },
  notesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  notesText: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
    flex: 1,
  },
  actionsCard: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  confirmButton: {
    backgroundColor: Colors.confirmed,
  },
  cancelButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.error,
  },
  actionButtonText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
  cancelButtonText: {
    ...Typography.button,
    color: Colors.error,
  },
  deleteLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  deleteText: {
    ...Typography.body,
    color: Colors.error,
  },
});
