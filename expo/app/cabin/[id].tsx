import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Animated,
  ScrollView,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import {
  Users,
  Banknote,
  Calendar,
  Edit3,
  Trash2,
  Plus,
  ChevronRight,
  MapPin,
} from "lucide-react-native";
import { Image } from "expo-image";
import { useBookingContext } from "@/context/BookingContext";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import type { Booking } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function CabinDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  console.log("[CabinDetailScreen] render", id);
  const router = useRouter();
  const { cabins, getCabinBookings, deleteCabin } = useBookingContext();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const cabin = useMemo(() => {
    return cabins.find((c) => c.id === id);
  }, [cabins, id]);

  const bookings = useMemo(() => {
    if (!id) return [];
    return getCabinBookings(id);
  }, [getCabinBookings, id]);

  const handleEdit = useCallback(() => {
    router.push(`/cabin/edit?id=${id}`);
  }, [router, id]);

  const handleDelete = useCallback(() => {
    if (!cabin) return;
    Alert.alert(
      "Удалить домик",
      `Вы уверены, что хотите удалить "${cabin.name}"?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => {
            deleteCabin(cabin.id);
            router.back();
          },
        },
      ]
    );
  }, [cabin, deleteCabin, router]);

  const handleNewBooking = useCallback(() => {
    router.push(`/booking/new?cabinId=${id}`);
  }, [router, id]);

  const handlePhotoScroll = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / SCREEN_WIDTH);
    setActivePhotoIndex(index);
  }, []);

  if (!cabin) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: "Не найдено" }} />
        <View style={styles.notFoundContainer}>
          <MapPin size={48} color={Colors.border} />
          <Text style={styles.notFoundText}>{"Домик не найден"}</Text>
          <TouchableOpacity style={styles.notFoundButton} onPress={() => router.back()}>
            <Text style={styles.notFoundButtonText}>{"Назад"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hasPhotos = cabin.photoUris && cabin.photoUris.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: cabin.name }} />
      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          {hasPhotos ? (
            <View>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handlePhotoScroll}
                style={styles.photoCarousel}
              >
                {cabin.photoUris.map((uri, index) => (
                  <Image
                    key={`${uri}-${index}`}
                    source={{ uri }}
                    style={styles.heroPhoto}
                    contentFit="cover"
                  />
                ))}
              </ScrollView>
              {cabin.photoUris.length > 1 && (
                <View style={styles.photoDots}>
                  {cabin.photoUris.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.photoDot,
                        index === activePhotoIndex && styles.photoDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
              <View style={styles.photoCounter}>
                <Text style={styles.photoCounterText}>
                  {activePhotoIndex + 1}/{cabin.photoUris.length}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.heroGradient}>
              <Text style={styles.heroInitial}>
                {cabin.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.heroBadge}>
            <View style={[styles.availabilityDot, { backgroundColor: cabin.isAvailable ? Colors.confirmed : Colors.cancelled }]} />
            <Text style={styles.heroBadgeText}>
              {cabin.isAvailable ? "Свободен" : "Занят"}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.headerSection}>
            <Text style={styles.name}>{cabin.name}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Users size={14} color={Colors.primary} />
                <Text style={styles.metaChipText}>{"до"} {cabin.capacity} {"гостей"}</Text>
              </View>
              <View style={styles.metaChip}>
                <Banknote size={14} color={Colors.primary} />
                <Text style={styles.metaChipText}>{"от"} {cabin.pricePerNight}{"₽"}/{"ночь"}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.description}>{cabin.description}</Text>

          {cabin.prices && cabin.prices.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"Цены"}</Text>
              <View style={[styles.pricesList, Shadows.sm]}>
                {cabin.prices.map((price, index) => (
                  <View
                    key={price.id}
                    style={[
                      styles.priceItem,
                      index < cabin.prices.length - 1 && styles.priceItemBorder,
                    ]}
                  >
                    <Text style={styles.priceGuests}>
                      {"До"} {price.guestCount} {getGuestsWord(price.guestCount)}
                    </Text>
                    <Text style={styles.priceValue}>{price.pricePerNight}{"₽"}/{"ночь"}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{"Удобства"}</Text>
            <View style={styles.amenitiesGrid}>
              {cabin.amenities.map((amenity, index) => (
                <View key={index} style={styles.amenityChip}>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
              {cabin.amenities.length === 0 && (
                <Text style={styles.noAmenities}>{"Удобства не указаны"}</Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{"Бронирования"}</Text>
              <TouchableOpacity onPress={handleNewBooking} hitSlop={8}>
                <Plus size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {bookings.length === 0 ? (
              <View style={styles.emptyBookings}>
                <Calendar size={28} color={Colors.border} />
                <Text style={styles.emptyText}>{"Пока нет броней"}</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={handleNewBooking} activeOpacity={0.85}>
                  <Text style={styles.emptyButtonText}>{"Создать бронь"}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              bookings.map((booking) => (
                <BookingItem
                  key={booking.id}
                  booking={booking}
                  onPress={() => router.push(`/booking/${booking.id}`)}
                />
              ))
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEdit}
              activeOpacity={0.7}
              testID="edit-cabin"
            >
              <Edit3 size={18} color={Colors.primary} />
              <Text style={styles.editButtonText}>{"Редактировать"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
              activeOpacity={0.7}
              testID="delete-cabin"
            >
              <Trash2 size={18} color={Colors.error} />
              <Text style={styles.deleteButtonText}>{"Удалить"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={handleNewBooking}
          activeOpacity={0.85}
          testID="book-cabin"
        >
          <Plus size={20} color={Colors.onPrimary} />
          <Text style={styles.bookButtonText}>{"Забронировать"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function getGuestsWord(count: number): string {
  if (count === 1) return "гостя";
  return "гостей";
}

const BookingItem = React.memo(function BookingItem({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.bookingItem, Shadows.sm]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`cabin-booking-${booking.id}`}
    >
      <View style={styles.bookingItemLeft}>
        <View style={styles.bookingAvatar}>
          <Text style={styles.bookingAvatarText}>{booking.guestName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingGuest} numberOfLines={1}>{booking.guestName}</Text>
          <View style={styles.bookingDates}>
            <Calendar size={12} color={Colors.onSurfaceVariant} />
            <Text style={styles.bookingDateText}>
              {format(parseISO(booking.checkInDate), "dd MMM yyyy", { locale: ru })} {"—"}{" "}
              {format(parseISO(booking.checkOutDate), "dd MMM yyyy", { locale: ru })}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.bookingItemRight}>
        <Text style={styles.bookingPriceText}>{booking.totalPrice.toLocaleString()}{"₽"}</Text>
        <ChevronRight size={16} color={Colors.onSurfaceVariant} />
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
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  notFoundText: {
    ...Typography.h3,
    color: Colors.onSurfaceVariant,
  },
  notFoundButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  notFoundButtonText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
  heroSection: {
    position: "relative",
  },
  photoCarousel: {
    width: SCREEN_WIDTH,
    height: 220,
  },
  heroPhoto: {
    width: SCREEN_WIDTH,
    height: 220,
  },
  photoDots: {
    position: "absolute",
    bottom: 44,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  photoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  photoDotActive: {
    backgroundColor: "#fff",
    width: 20,
  },
  photoCounter: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  photoCounterText: {
    ...Typography.caption,
    color: "#fff",
    fontWeight: "600" as const,
  },
  heroGradient: {
    width: "100%",
    height: 200,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  heroInitial: {
    fontSize: 64,
    fontWeight: "700" as const,
    color: Colors.onPrimary,
    opacity: 0.6,
  },
  heroBadge: {
    position: "absolute",
    bottom: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroBadgeText: {
    ...Typography.caption,
    fontWeight: "600" as const,
    color: Colors.onSurface,
  },
  content: {
    padding: Spacing.lg,
  },
  headerSection: {
    marginBottom: Spacing.md,
  },
  name: {
    ...Typography.h1,
    color: Colors.onSurface,
    fontSize: 26,
  },
  metaRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: `${Colors.primary}12`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  metaChipText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: "500" as const,
  },
  description: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  section: {
    marginTop: Spacing.lg,
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
    fontSize: 18,
  },
  pricesList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  priceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
  },
  priceItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  priceGuests: {
    ...Typography.body,
    color: Colors.onSurface,
  },
  priceValue: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  amenityChip: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  amenityText: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
  },
  noAmenities: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  emptyBookings: {
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
  emptyButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  emptyButtonText: {
    ...Typography.bodySmall,
    color: Colors.onPrimary,
    fontWeight: "600" as const,
  },
  bookingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  bookingItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  bookingAvatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  bookingAvatarText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.onPrimary,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingGuest: {
    ...Typography.body,
    color: Colors.onSurface,
    fontWeight: "600" as const,
    fontSize: 14,
  },
  bookingDates: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 2,
  },
  bookingDateText: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },
  bookingItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  bookingPriceText: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    fontWeight: "600" as const,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  editButton: {
    borderColor: Colors.primary,
  },
  editButtonText: {
    ...Typography.button,
    color: Colors.primary,
  },
  deleteButton: {
    borderColor: Colors.error,
  },
  deleteButtonText: {
    ...Typography.button,
    color: Colors.error,
  },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bookButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  bookButtonText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
});
