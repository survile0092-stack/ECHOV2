import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
  Animated,
  PanResponder,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Calendar, ChevronDown, Save, Moon, CreditCard } from "lucide-react-native";
import { useBookingContext } from "@/context/BookingContext";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { Calendar as RNCalendar, DateData, LocaleConfig } from "react-native-calendars";
import { format, parseISO, isBefore, differenceInDays } from "date-fns";
import { ru } from "date-fns/locale";
import type { Booking } from "@/types";

LocaleConfig.locales.ru = {
  monthNames: [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ],
  monthNamesShort: [
    "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
    "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
  ],
  dayNames: [
    "Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота",
  ],
  dayNamesShort: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  today: "Сегодня",
};
LocaleConfig.defaultLocale = "ru";

interface MarkedDates {
  [date: string]: {
    selected?: boolean;
    selectedColor?: string;
    disabled?: boolean;
    disabledTouchEvent?: boolean;
    startingDay?: boolean;
    endingDay?: boolean;
    color?: string;
    textColor?: string;
  };
}

export default function EditBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  console.log("[EditBookingScreen] render", id);
  const router = useRouter();
  const { cabins, bookings, saveBooking, isDateRangeAvailable, calculatePrice, getPriceForGuests } =
    useBookingContext();

  const existingBooking = useMemo(() => {
    return bookings.find((b) => b.id === id);
  }, [bookings, id]);

  const [selectedCabinId, setSelectedCabinId] = useState<string>(existingBooking?.cabinId || "");
  const [guestName, setGuestName] = useState(existingBooking?.guestName || "");
  const [guestPhone, setGuestPhone] = useState(existingBooking?.guestPhone || "");
  const [guestCount, setGuestCount] = useState(existingBooking?.guestCount?.toString() || "1");
  const [startDate, setStartDate] = useState<string | null>(existingBooking?.checkInDate || null);
  const [endDate, setEndDate] = useState<string | null>(existingBooking?.checkOutDate || null);
  const [notes, setNotes] = useState(existingBooking?.notes || "");
  const [showCabinPicker, setShowCabinPicker] = useState(false);
  const [useCustomPrice, setUseCustomPrice] = useState(existingBooking?.customPrice || false);
  const [customPrice, setCustomPrice] = useState(
    existingBooking?.customPrice ? existingBooking.totalPrice.toString() : ""
  );
  const [prepayment, setPrepayment] = useState(
    existingBooking?.prepayment ? existingBooking.prepayment.toString() : ""
  );

  useEffect(() => {
    if (!existingBooking) {
      return;
    }

    console.log("[EditBookingScreen] syncing form state from booking", existingBooking.id);
    setSelectedCabinId(existingBooking.cabinId);
    setGuestName(existingBooking.guestName);
    setGuestPhone(existingBooking.guestPhone);
    setGuestCount(existingBooking.guestCount.toString());
    setStartDate(existingBooking.checkInDate);
    setEndDate(existingBooking.checkOutDate);
    setNotes(existingBooking.notes);
    setUseCustomPrice(existingBooking.customPrice);
    setCustomPrice(existingBooking.customPrice ? existingBooking.totalPrice.toString() : "");
    setPrepayment(existingBooking.prepayment ? existingBooking.prepayment.toString() : "");
  }, [existingBooking]);

  const [tabVisible, setTabVisible] = useState<boolean>(true);
  const [tabPlaced, setTabPlaced] = useState<boolean>(false);
  const tabPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const tabOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const handlePan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const handleOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const tapCountRef = useRef<number>(0);

  const handleTripleTap = useCallback(() => {
    tapCountRef.current += 1;
    console.log("[EditBookingScreen] tab tap", tapCountRef.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      setTabVisible(false);
      setTabPlaced(false);
      tabPan.setValue({ x: 0, y: 0 });
      tabOffset.current = { x: 0, y: 0 };
      handlePan.setValue({ x: 0, y: 0 });
      handleOffset.current = { x: 0, y: 0 };
    }
  }, [tabPan, handlePan]);

  const tabPanResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4,
      onPanResponderGrant: () => {
        tabPan.setOffset({ x: tabOffset.current.x, y: tabOffset.current.y });
        tabPan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: tabPan.x, dy: tabPan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gs) => {
        tabPan.flattenOffset();
        if (Math.abs(gs.dx) < 5 && Math.abs(gs.dy) < 5) {
          handleTripleTap();
        } else {
          tabOffset.current = {
            x: tabOffset.current.x + gs.dx,
            y: tabOffset.current.y + gs.dy,
          };
        }
      },
      onPanResponderTerminate: () => {
        tabPan.flattenOffset();
      },
    }), [tabPan, handleTripleTap]);

  const handlePanResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4,
      onPanResponderGrant: () => {
        handlePan.setOffset({ x: handleOffset.current.x, y: handleOffset.current.y });
        handlePan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: handlePan.x, dy: handlePan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gs) => {
        handlePan.flattenOffset();
        if (Math.abs(gs.dx) < 5 && Math.abs(gs.dy) < 5) {
          tabOffset.current = { x: handleOffset.current.x, y: handleOffset.current.y };
          tabPan.setValue({ x: handleOffset.current.x, y: handleOffset.current.y });
          setTabPlaced(true);
          setTabVisible(true);
        } else {
          handleOffset.current = {
            x: handleOffset.current.x + gs.dx,
            y: handleOffset.current.y + gs.dy,
          };
        }
      },
      onPanResponderTerminate: () => {
        handlePan.flattenOffset();
      },
    }), [handlePan, tabPan]);

  const selectedCabinData = useMemo(() => {
    return cabins.find((c) => c.id === selectedCabinId);
  }, [cabins, selectedCabinId]);

  const calculatedPrice = useMemo(() => {
    if (!selectedCabinId || !startDate || !endDate) return 0;
    return calculatePrice(selectedCabinId, startDate, endDate, parseInt(guestCount) || 1);
  }, [selectedCabinId, startDate, endDate, guestCount, calculatePrice]);

  const pricePerNight = useMemo(() => {
    if (!selectedCabinId) return 0;
    return getPriceForGuests(selectedCabinId, parseInt(guestCount) || 1);
  }, [selectedCabinId, guestCount, getPriceForGuests]);

  const totalPrice = useMemo(() => {
    return useCustomPrice && customPrice ? parseInt(customPrice) || 0 : calculatedPrice;
  }, [useCustomPrice, customPrice, calculatedPrice]);

  const prepaymentAmount = useMemo(() => {
    return parseInt(prepayment) || 0;
  }, [prepayment]);

  const remainingAmount = useMemo(() => {
    return Math.max(totalPrice - prepaymentAmount, 0);
  }, [totalPrice, prepaymentAmount]);

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return differenceInDays(parseISO(endDate), parseISO(startDate));
  }, [startDate, endDate]);

  const handleGuestCountChange = useCallback((text: string) => {
    const num = parseInt(text);
    if (text === "") {
      setGuestCount("");
      return;
    }
    if (!isNaN(num) && num >= 1) {
      setGuestCount(text);
    }
  }, []);

  const isCheckoutDate = useCallback(
    (dateString: string): string | null => {
      if (!selectedCabinId) return null;
      const cabinBookings = bookings.filter(
        (b) => b.cabinId === selectedCabinId && b.status !== "CANCELLED" && b.id !== id
      );
      const found = cabinBookings.find((booking) => booking.checkOutDate === dateString);
      return found ? found.guestName : null;
    },
    [selectedCabinId, bookings, id]
  );

  const isCheckInDate = useCallback(
    (dateString: string): string | null => {
      if (!selectedCabinId) return null;
      const cabinBookings = bookings.filter(
        (b) => b.cabinId === selectedCabinId && b.status !== "CANCELLED" && b.id !== id
      );
      const found = cabinBookings.find((booking) => booking.checkInDate === dateString);
      return found ? found.guestName : null;
    },
    [selectedCabinId, bookings, id]
  );

  const isDateBooked = useCallback(
    (dateString: string): boolean => {
      if (!selectedCabinId) return false;
      const cabinBookings = bookings.filter(
        (b) => b.cabinId === selectedCabinId && b.status !== "CANCELLED" && b.id !== id
      );
      const dateTime = parseISO(dateString).getTime();
      return cabinBookings.some((booking) => {
        const bStartTime = parseISO(booking.checkInDate).getTime();
        const bEndTime = parseISO(booking.checkOutDate).getTime();
        return dateTime >= bStartTime && dateTime < bEndTime;
      });
    },
    [selectedCabinId, bookings, id]
  );

  const handleDayPress = useCallback(
    (day: DateData) => {
      const dateString = day.dateString;
      const date = parseISO(dateString);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const minAllowed = new Date(2025, 0, 1);
      if (isBefore(date, minAllowed)) {
        Alert.alert("Неверная дата", "Нельзя выбрать дату ранее 1 января 2025 года");
        return;
      }

      const checkoutGuest = isCheckoutDate(dateString);
      const checkInGuest = isCheckInDate(dateString);
      const booked = isDateBooked(dateString);
      const isSelectingCheckOut = Boolean(startDate && !endDate);
      const canUseBookedDate = Boolean(
        (!isSelectingCheckOut && checkoutGuest) || (isSelectingCheckOut && checkInGuest)
      );

      if (booked && !canUseBookedDate) {
        Alert.alert("Дата занята", "Эта дата уже забронирована в данном домике");
        return;
      }

      if (!startDate || (startDate && endDate)) {
        setStartDate(dateString);
        setEndDate(null);
        if (checkoutGuest) {
          Alert.alert("Информация", `${format(parseISO(dateString), "dd MMM yyyy", { locale: ru })} — дата выезда гостя: ${checkoutGuest}. Вы можете использовать её как дату заезда.`);
        }
        return;
      }

      const currentStartDate = startDate;
      const isSameAsStartDate = dateString === currentStartDate;
      const isBeforeStartDate = isBefore(date, parseISO(currentStartDate));

      if (isSameAsStartDate) {
        Alert.alert("Неверная дата", "Дата выезда должна быть позже даты заезда");
        return;
      }

      if (isBeforeStartDate) {
        const isNewCheckInAllowed = isDateRangeAvailable(selectedCabinId, dateString, currentStartDate, id);

        if (isNewCheckInAllowed) {
          setStartDate(dateString);
          setEndDate(null);
          return;
        }

        Alert.alert(
          "Даты недоступны",
          "Нельзя выбрать дату заезда, если период до текущей даты выезда уже занят"
        );
        return;
      }

      const available = isDateRangeAvailable(selectedCabinId, currentStartDate, dateString, id);
      if (available) {
        setEndDate(dateString);
        if (checkInGuest) {
          Alert.alert("Информация", `${format(parseISO(dateString), "dd MMM yyyy", { locale: ru })} — дата заезда гостя: ${checkInGuest}. Вы можете использовать её как дату выезда.`);
        }
      } else {
        Alert.alert(
          "Даты недоступны",
          "Некоторые даты в этом диапазоне уже забронированы"
        );
      }
    },
    [startDate, endDate, selectedCabinId, isDateRangeAvailable, isDateBooked, isCheckoutDate, isCheckInDate, id]
  );

  const markedDates = useMemo<MarkedDates>(() => {
    const marks: MarkedDates = {};
    if (!selectedCabinId) return marks;

    const cabinBookings = bookings.filter(
      (b) => b.cabinId === selectedCabinId && b.status !== "CANCELLED" && b.id !== id
    );

    const checkoutDates = new Set<string>();
    cabinBookings.forEach((booking) => {
      checkoutDates.add(booking.checkOutDate);
    });

    cabinBookings.forEach((booking) => {
      const bStart = parseISO(booking.checkInDate);
      const bEnd = parseISO(booking.checkOutDate);
      const current = new Date(bStart);
      while (current.getTime() < bEnd.getTime()) {
        const dateStr = format(current, "yyyy-MM-dd");
        if (checkoutDates.has(dateStr)) {
          marks[dateStr] = {
            disabled: false,
            disabledTouchEvent: false,
            color: Colors.warning + "25",
            textColor: Colors.warning,
            startingDay: true,
            endingDay: true,
          };
        } else {
          marks[dateStr] = {
            disabled: true,
            disabledTouchEvent: true,
            color: Colors.error + "30",
            textColor: Colors.error,
          };
        }
        current.setDate(current.getDate() + 1);
      }
    });

    checkoutDates.forEach((checkoutStr) => {
      const isAlsoBooked = cabinBookings.some((booking) => {
        const bStart = parseISO(booking.checkInDate);
        const bEnd = parseISO(booking.checkOutDate);
        const dt = parseISO(checkoutStr).getTime();
        return dt >= bStart.getTime() && dt < bEnd.getTime();
      });
      if (!isAlsoBooked) {
        marks[checkoutStr] = {
          disabled: false,
          disabledTouchEvent: false,
          color: Colors.warning + "25",
          textColor: Colors.warning,
          startingDay: true,
          endingDay: true,
        };
      }
    });

    if (startDate) {
      marks[startDate] = {
        selected: true,
        startingDay: true,
        color: Colors.primary,
        textColor: Colors.onPrimary,
      };
    }

    if (endDate) {
      marks[endDate] = {
        selected: true,
        endingDay: true,
        color: Colors.primary,
        textColor: Colors.onPrimary,
      };

      const current = parseISO(startDate!);
      current.setDate(current.getDate() + 1);
      const end = parseISO(endDate);
      while (isBefore(current, end)) {
        const dateStr = format(current, "yyyy-MM-dd");
        marks[dateStr] = {
          selected: true,
          color: Colors.primaryLight,
          textColor: Colors.onPrimary,
        };
        current.setDate(current.getDate() + 1);
      }
    }

    return marks;
  }, [startDate, endDate, selectedCabinId, bookings, id]);

  const handleSave = useCallback(async () => {
    if (!existingBooking) {
      Alert.alert("Ошибка", "Бронирование не найдено");
      return;
    }
    if (!selectedCabinId) {
      Alert.alert("Ошибка", "Пожалуйста, выберите домик");
      return;
    }
    if (!guestName.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, введите имя гостя");
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert("Ошибка", "Пожалуйста, выберите даты заезда и выезда");
      return;
    }

    const cabin = cabins.find((c) => c.id === selectedCabinId);
    if (!cabin) {
      Alert.alert("Ошибка", "Домик не найден");
      return;
    }

    const guestCountNum = parseInt(guestCount) || 1;
    if (guestCountNum < 1) {
      Alert.alert("Ошибка", "Минимальное количество гостей: 1");
      return;
    }
    if (guestCountNum > cabin.capacity) {
      Alert.alert(
        "Ошибка",
        `Максимальное количество гостей для этого домика: ${cabin.capacity}`
      );
      return;
    }

    if (prepaymentAmount > totalPrice) {
      Alert.alert("Ошибка", "Предоплата не может превышать общую сумму");
      return;
    }

    const booking: Booking = {
      id: existingBooking.id,
      cabinId: selectedCabinId,
      cabinName: cabin.name,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      guestCount: guestCountNum,
      checkInDate: startDate,
      checkOutDate: endDate,
      totalPrice,
      prepayment: prepaymentAmount,
      remaining: remainingAmount,
      customPrice: useCustomPrice,
      status: existingBooking.status,
      notes: notes.trim(),
      createdAt: existingBooking.createdAt,
    };

    try {
      saveBooking(booking, {
        onSuccess: () => {
          Alert.alert("Успех", "Бронирование успешно обновлено", [
            { text: "OK", onPress: () => router.back() },
          ]);
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Не удалось обновить бронирование";
          console.log("[EditBookingScreen] failed to save booking", error);
          Alert.alert("Ошибка", message);
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось обновить бронирование";
      console.log("[EditBookingScreen] unexpected save error", error);
      Alert.alert("Ошибка", message);
    }
  }, [
    existingBooking, selectedCabinId, guestName, guestPhone, guestCount,
    startDate, endDate, totalPrice, prepaymentAmount, remainingAmount,
    useCustomPrice, notes, cabins, saveBooking, router,
  ]);

  if (!existingBooking) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: "Редактирование" }} />
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>{"Бронирование не найдено"}</Text>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>{"Назад"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isFormValid = Boolean(selectedCabinId && startDate && endDate && guestName.trim());

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Редактировать бронь" }} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{"Выберите домик"}</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCabinPicker(!showCabinPicker)}
              activeOpacity={0.7}
              testID="cabin-picker"
            >
              <Text style={[styles.pickerButtonText, !selectedCabinData && { color: Colors.onSurfaceVariant }]}>
                {selectedCabinData?.name || "Выберите домик..."}
              </Text>
              <ChevronDown size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>

            {showCabinPicker && (
              <View style={[styles.cabinList, Shadows.sm]}>
                {cabins.map((cabin) => (
                  <TouchableOpacity
                    key={cabin.id}
                    style={[
                      styles.cabinOption,
                      selectedCabinId === cabin.id && styles.cabinOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedCabinId(cabin.id);
                      setShowCabinPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cabinOptionLeft}>
                      <View style={[styles.cabinOptionDot, selectedCabinId === cabin.id && styles.cabinOptionDotActive]} />
                      <View>
                        <Text
                          style={[
                            styles.cabinOptionText,
                            selectedCabinId === cabin.id && styles.cabinOptionTextActive,
                          ]}
                        >
                          {cabin.name}
                        </Text>
                        <Text style={styles.cabinOptionPrice}>
                          {"от"} {cabin.pricePerNight}{"₽"}/{"ночь"} {"·"} {"до"} {cabin.capacity} {"гостей"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {selectedCabinId ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{"Количество гостей"}</Text>
                <TextInput
                  style={styles.input}
                  value={guestCount}
                  onChangeText={handleGuestCountChange}
                  placeholder={"Минимум 1 гость"}
                  placeholderTextColor={Colors.onSurfaceVariant}
                  keyboardType="number-pad"
                  maxLength={2}
                  testID="guest-count-input"
                />
                {selectedCabinData && (
                  <Text style={styles.helperText}>
                    {"от 1 до"} {selectedCabinData.capacity} {"гостей"}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{"Выберите даты"}</Text>
                <View style={[styles.calendarContainer, Shadows.sm]}>
                  <RNCalendar
                    onDayPress={handleDayPress}
                    markedDates={markedDates}
                    markingType="period"
                    minDate="2025-01-01"
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
                {tabVisible ? (
                  <Animated.View
                    {...tabPanResponder.panHandlers}
                    style={[
                      styles.dateSummary,
                      tabPlaced && styles.dateSummaryPlaced,
                      { transform: [{ translateX: tabPan.x }, { translateY: tabPan.y }] },
                    ]}
                    testID="date-summary-tab"
                  >
                    <View style={styles.dragHint} />
                    <View style={styles.dateItem}>
                      <Calendar size={15} color={Colors.accent} />
                      <Text style={styles.dateText}>
                        {"Заезд: "}{startDate ? format(parseISO(startDate), "dd MMM yyyy", { locale: ru }) : "—"}
                      </Text>
                    </View>
                    <View style={styles.dateItem}>
                      <Calendar size={15} color={Colors.error} />
                      <Text style={styles.dateText}>
                        {"Выезд: "}{endDate ? format(parseISO(endDate), "dd MMM yyyy", { locale: ru }) : "—"}
                      </Text>
                    </View>
                  </Animated.View>
                ) : (
                  <Animated.View
                    {...handlePanResponder.panHandlers}
                    style={[
                      styles.tabHandle,
                      { transform: [{ translateX: handlePan.x }, { translateY: handlePan.y }] },
                    ]}
                    testID="date-summary-handle"
                  >
                    <Calendar size={14} color={Colors.primary} />
                    <Text style={styles.tabHandleText}>{"Поставить язычок"}</Text>
                  </Animated.View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{"Имя гостя"}</Text>
                <TextInput
                  style={styles.input}
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder={"Введите имя гостя"}
                  placeholderTextColor={Colors.onSurfaceVariant}
                  testID="guest-name-input"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{"Телефон"}</Text>
                <TextInput
                  style={styles.input}
                  value={guestPhone}
                  onChangeText={setGuestPhone}
                  placeholder={"Введите номер телефона"}
                  placeholderTextColor={Colors.onSurfaceVariant}
                  keyboardType="phone-pad"
                  testID="guest-phone-input"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{"Примечания"}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={"Дополнительные примечания..."}
                  placeholderTextColor={Colors.onSurfaceVariant}
                  multiline
                  numberOfLines={3}
                  testID="notes-input"
                />
              </View>

              <View style={styles.customPriceContainer}>
                <View style={styles.customPriceRow}>
                  <Text style={styles.label}>{"Указать свою сумму"}</Text>
                  <Switch
                    value={useCustomPrice}
                    onValueChange={setUseCustomPrice}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={useCustomPrice ? Colors.surface : Colors.onSurfaceVariant}
                  />
                </View>
                {useCustomPrice && (
                  <TextInput
                    style={[styles.input, { marginTop: Spacing.sm }]}
                    value={customPrice}
                    onChangeText={setCustomPrice}
                    placeholder={"Введите сумму бронирования"}
                    keyboardType="number-pad"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    testID="custom-price-input"
                  />
                )}
              </View>

              <View style={[styles.paymentCard, Shadows.sm]}>
                <View style={styles.paymentCardHeader}>
                  <CreditCard size={18} color={Colors.primary} />
                  <Text style={styles.paymentCardTitle}>{"Оплата"}</Text>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{"Предоплата (₽)"}</Text>
                  <TextInput
                    style={styles.input}
                    value={prepayment}
                    onChangeText={setPrepayment}
                    placeholder={"0"}
                    placeholderTextColor={Colors.onSurfaceVariant}
                    keyboardType="number-pad"
                    testID="prepayment-input"
                  />
                </View>
                <View style={styles.paymentSummary}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>{"Предоплата"}</Text>
                    <Text style={styles.paymentValue}>{prepaymentAmount.toLocaleString()}{"₽"}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>{"Остаток к оплате"}</Text>
                    <Text style={[styles.paymentValue, remainingAmount > 0 && { color: Colors.warning }]}>
                      {remainingAmount.toLocaleString()}{"₽"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.priceCard, Shadows.sm]}>
                <View style={styles.priceRow}>
                  <View style={styles.priceRowLeft}>
                    <Moon size={16} color={Colors.onSurfaceVariant} />
                    <Text style={styles.priceLabel}>{"Ночей"}</Text>
                  </View>
                  <Text style={styles.priceValue}>{nights}</Text>
                </View>
                {!useCustomPrice && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>{"Цена за ночь"}</Text>
                    <Text style={styles.priceValue}>{pricePerNight}{"₽"}</Text>
                  </View>
                )}
                <View style={[styles.priceRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>{"Итого"}</Text>
                  <Text style={styles.totalAmount}>{totalPrice.toLocaleString()}{"₽"}</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, !isFormValid && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!isFormValid}
          activeOpacity={0.85}
          testID="save-booking-button"
        >
          <Save size={20} color={Colors.onPrimary} />
          <Text style={styles.saveButtonText}>{"Сохранить изменения"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: Spacing.lg,
    gap: Spacing.lg,
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
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
    fontWeight: "600" as const,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerButtonText: {
    ...Typography.body,
    color: Colors.onSurface,
  },
  cabinList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  cabinOption: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cabinOptionActive: {
    backgroundColor: `${Colors.primary}12`,
  },
  cabinOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cabinOptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  cabinOptionDotActive: {
    backgroundColor: Colors.primary,
  },
  cabinOptionText: {
    ...Typography.body,
    color: Colors.onSurface,
  },
  cabinOptionTextActive: {
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  cabinOptionPrice: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  helperText: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },
  calendarContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  dateSummary: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    flexWrap: "wrap",
  },
  dateSummaryPlaced: {
    borderWidth: 1,
    borderColor: Colors.primary + "40",
  },
  dragHint: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginRight: Spacing.xs,
  },
  tabHandle: {
    marginTop: Spacing.md,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full ?? 999,
    backgroundColor: Colors.primary + "15",
    borderWidth: 1,
    borderColor: Colors.primary + "40",
    borderStyle: "dashed",
  },
  tabHandleText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  dateText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  customPriceContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  paymentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  paymentCardTitle: {
    ...Typography.h4,
    color: Colors.onSurface,
    fontSize: 15,
  },
  paymentSummary: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentLabel: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  paymentValue: {
    ...Typography.body,
    color: Colors.onSurface,
    fontWeight: "600" as const,
  },
  priceCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  priceRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  priceLabel: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
  },
  priceValue: {
    ...Typography.body,
    color: Colors.onSurface,
    fontWeight: "500" as const,
  },
  totalRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: 0,
  },
  totalLabel: {
    ...Typography.h3,
    color: Colors.onSurface,
  },
  totalAmount: {
    ...Typography.h2,
    color: Colors.primary,
  },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
});
