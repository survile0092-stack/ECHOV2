import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Plus, X, Save, Camera, ImageIcon } from "lucide-react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useBookingContext } from "@/context/BookingContext";
import { persistPickedPhoto, resolvePhotoUri } from "@/lib/photoStorage";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import type { Cabin, CabinPrice } from "@/types";

const PREDEFINED_AMENITIES = [
  "Wi-Fi",
  "Кухня",
  "Камин",
  "Барбекю",
  "Парковка",
  "Отопление",
  "Кондиционер",
  "ТВ",
  "Стиральная машина",
  "Терраса",
  "Вид на озеро",
  "Вид на горы",
  "Панорамные окна",
  "Сауна",
  "Джакузи",
];

export default function CabinEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  console.log("[CabinEditScreen] render", id);
  const router = useRouter();
  const { cabins, saveCabin } = useBookingContext();

  const existingCabin = useMemo(() => {
    if (!id) return null;
    return cabins.find((c) => c.id === id);
  }, [cabins, id]);

  const [name, setName] = useState(existingCabin?.name || "");
  const [description, setDescription] = useState(existingCabin?.description || "");
  const [capacity, setCapacity] = useState(existingCabin?.capacity.toString() || "4");
  const [basePrice, setBasePrice] = useState(
    existingCabin?.pricePerNight.toString() || "1000"
  );
  const [prices, setPrices] = useState<CabinPrice[]>(
    existingCabin?.prices || []
  );
  const [amenities, setAmenities] = useState<string[]>(existingCabin?.amenities || []);
  const [customAmenity, setCustomAmenity] = useState("");
  const [showPriceEditor, setShowPriceEditor] = useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>(existingCabin?.photoUris || []);

  const screenTitle = existingCabin ? "Редактировать" : "Новый домик";

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Ошибка", "Для загрузки фотографий необходимо предоставить доступ к галерее");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10,
      });

      if (!result.canceled && result.assets.length > 0) {
        const settled = await Promise.allSettled(
          result.assets.map((a) => persistPickedPhoto(a.uri))
        );
        const persisted = settled
          .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
          .map((r) => r.value);
        const failedCount = settled.length - persisted.length;
        if (persisted.length > 0) {
          setPhotoUris((prev) => [...prev, ...persisted]);
        }
        console.log("Photos added:", persisted.length, "failed:", failedCount);
        if (failedCount > 0) {
          Alert.alert(
            "Ошибка",
            persisted.length > 0
              ? `Часть фотографий (${failedCount}) не удалось сохранить. Попробуйте выбрать их ещё раз.`
              : "Не удалось сохранить фотографии. Попробуйте ещё раз."
          );
        }
      }
    } catch (error) {
      console.log("Image picker error:", error);
      Alert.alert("Ошибка", "Не удалось выбрать фотографии");
    }
  }, []);

  const takePhoto = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Недоступно", "Камера недоступна в веб-версии");
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Ошибка", "Для съёмки необходимо предоставить доступ к камере");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        try {
          const persisted = await persistPickedPhoto(result.assets[0].uri);
          setPhotoUris((prev) => [...prev, persisted]);
          console.log("Photo taken");
        } catch (e) {
          console.log("Photo persist error:", e);
          Alert.alert("Ошибка", "Не удалось сохранить фото. Попробуйте ещё раз.");
        }
      }
    } catch (error) {
      console.log("Camera error:", error);
      Alert.alert("Ошибка", "Не удалось сделать фотографию");
    }
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleAmenity = useCallback((amenity: string) => {
    setAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  }, []);

  const addCustomAmenity = useCallback(() => {
    if (customAmenity.trim() && !amenities.includes(customAmenity.trim())) {
      setAmenities((prev) => [...prev, customAmenity.trim()]);
      setCustomAmenity("");
    }
  }, [customAmenity, amenities]);

  const removeAmenity = useCallback((amenity: string) => {
    setAmenities((prev) => prev.filter((a) => a !== amenity));
  }, []);

  const addPriceTier = useCallback(() => {
    const newPrice: CabinPrice = {
      id: `p-${Date.now()}-${prices.length}`,
      guestCount: 0,
      pricePerNight: 0,
    };
    setPrices([...prices, newPrice]);
  }, [prices]);

  const updatePriceTier = useCallback(
    (priceId: string, guestCount: number, pricePerNight: number) => {
      setPrices(
        prices.map((p) =>
          p.id === priceId ? { ...p, guestCount, pricePerNight } : p
        )
      );
    },
    [prices]
  );

  const removePriceTier = useCallback(
    (priceId: string) => {
      if (prices.length > 1) {
        setPrices(prices.filter((p) => p.id !== priceId));
      }
    },
    [prices]
  );

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, введите название домика");
      return;
    }

    const cabinData: Cabin = {
      id: existingCabin?.id || `cabin-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || "",
      capacity: parseInt(capacity) || 1,
      pricePerNight: parseInt(basePrice) || 0,
      prices: prices.sort((a, b) => a.guestCount - b.guestCount),
      amenities,
      photoUris,
      isAvailable: true,
      createdAt: existingCabin?.createdAt || Date.now(),
    };

    saveCabin(cabinData);
    router.back();
  }, [name, description, capacity, basePrice, prices, amenities, photoUris, existingCabin, saveCabin, router]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: screenTitle }} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{"Фотографии домика"}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photosScroll}
              contentContainerStyle={styles.photosContent}
            >
              {photoUris.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.photoItem}>
                  <Image
                    source={{ uri: resolvePhotoUri(uri) }}
                    style={styles.photoImage}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.photoRemoveBtn}
                    onPress={() => removePhoto(index)}
                    hitSlop={6}
                  >
                    <X size={14} color={Colors.onPrimary} />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={pickImage}
                  activeOpacity={0.7}
                  testID="pick-photo"
                >
                  <ImageIcon size={24} color={Colors.primary} />
                  <Text style={styles.addPhotoText}>{"Галерея"}</Text>
                </TouchableOpacity>
                {Platform.OS !== "web" && (
                  <TouchableOpacity
                    style={styles.addPhotoButton}
                    onPress={takePhoto}
                    activeOpacity={0.7}
                    testID="take-photo"
                  >
                    <Camera size={24} color={Colors.primary} />
                    <Text style={styles.addPhotoText}>{"Камера"}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
            {photoUris.length > 0 && (
              <Text style={styles.helperText}>
                {"Добавлено фото:"} {photoUris.length}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{"Название домика"}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={"Введите название домика"}
              placeholderTextColor={Colors.onSurfaceVariant}
              testID="cabin-name-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{"Описание"}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={"Опишите ваш домик..."}
              placeholderTextColor={Colors.onSurfaceVariant}
              multiline
              numberOfLines={4}
              testID="cabin-description-input"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>{"Вместимость"}</Text>
              <TextInput
                style={styles.input}
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="number-pad"
                placeholder="4"
                placeholderTextColor={Colors.onSurfaceVariant}
                testID="cabin-capacity-input"
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>{"Базовая цена (₽/ночь)"}</Text>
              <TextInput
                style={styles.input}
                value={basePrice}
                onChangeText={setBasePrice}
                keyboardType="number-pad"
                placeholder="1000"
                placeholderTextColor={Colors.onSurfaceVariant}
                testID="cabin-price-input"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.priceSectionHeader}>
              <Text style={styles.label}>{"Гибкое ценообразование"}</Text>
              <TouchableOpacity onPress={() => setShowPriceEditor(!showPriceEditor)} hitSlop={8}>
                <Text style={styles.toggleText}>
                  {showPriceEditor ? "Скрыть" : "Настроить"}
                </Text>
              </TouchableOpacity>
            </View>

            {showPriceEditor && (
              <View style={[styles.pricesContainer, Shadows.sm]}>
                {prices.map((price) => (
                  <View key={price.id} style={styles.priceRow}>
                    <View style={styles.priceInputGroup}>
                      <Text style={styles.priceLabel}>{"Гостей"}</Text>
                      <TextInput
                        style={styles.priceInput}
                        value={price.guestCount === 0 ? '' : price.guestCount.toString()}
                        onChangeText={(text) => {
                          const num = text === '' ? 0 : parseInt(text) || 0;
                          updatePriceTier(price.id, num, price.pricePerNight);
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                        placeholder="0"
                        placeholderTextColor={Colors.onSurfaceVariant}
                      />
                    </View>
                    <View style={styles.priceInputGroup}>
                      <Text style={styles.priceLabel}>{"Цена (₽)"}</Text>
                      <TextInput
                        style={styles.priceInput}
                        value={price.pricePerNight === 0 ? '' : price.pricePerNight.toString()}
                        onChangeText={(text) => {
                          const num = text === '' ? 0 : parseInt(text) || 0;
                          updatePriceTier(price.id, price.guestCount, num);
                        }}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={Colors.onSurfaceVariant}
                      />
                    </View>
                    {prices.length > 1 && (
                      <TouchableOpacity
                        style={styles.removePriceButton}
                        onPress={() => removePriceTier(price.id)}
                        hitSlop={6}
                      >
                        <X size={20} color={Colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addPriceButton}
                  onPress={addPriceTier}
                  activeOpacity={0.7}
                >
                  <Plus size={18} color={Colors.primary} />
                  <Text style={styles.addPriceText}>{"Добавить ценовой диапазон"}</Text>
                </TouchableOpacity>
              </View>
            )}

            {!showPriceEditor && prices.length > 0 && (
              <View style={styles.pricesPreview}>
                {prices.slice(0, 2).map((price) => (
                  <Text key={price.id} style={styles.pricePreviewText}>
                    {"До"} {price.guestCount} {"гостей"} {"—"} {price.pricePerNight}{"₽"}/{"ночь"}
                  </Text>
                ))}
                {prices.length > 2 && (
                  <Text style={styles.pricePreviewMore}>+{prices.length - 2} {"ещё"}</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{"Удобства"}</Text>
            <View style={styles.amenitiesContainer}>
              {PREDEFINED_AMENITIES.map((amenity) => (
                <TouchableOpacity
                  key={amenity}
                  style={[
                    styles.amenityChip,
                    amenities.includes(amenity) && styles.amenityChipActive,
                  ]}
                  onPress={() => toggleAmenity(amenity)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.amenityChipText,
                      amenities.includes(amenity) && styles.amenityChipTextActive,
                    ]}
                  >
                    {amenity}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.customAmenityRow}>
              <TextInput
                style={[styles.input, styles.customAmenityInput]}
                value={customAmenity}
                onChangeText={setCustomAmenity}
                placeholder={"Добавить удобство..."}
                placeholderTextColor={Colors.onSurfaceVariant}
                onSubmitEditing={addCustomAmenity}
                testID="custom-amenity-input"
              />
              <TouchableOpacity
                style={styles.addAmenityButton}
                onPress={addCustomAmenity}
                activeOpacity={0.85}
              >
                <Plus size={20} color={Colors.onPrimary} />
              </TouchableOpacity>
            </View>

            {amenities.length > 0 && (
              <View style={styles.selectedAmenities}>
                <Text style={styles.selectedLabel}>{"Выбранные:"}</Text>
                <View style={styles.selectedChipsRow}>
                  {amenities.map((amenity) => (
                    <View key={amenity} style={styles.selectedChip}>
                      <Text style={styles.selectedChipText}>{amenity}</Text>
                      <TouchableOpacity onPress={() => removeAmenity(amenity)} hitSlop={4}>
                        <X size={14} color={Colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveActionButton}
          onPress={handleSave}
          activeOpacity={0.85}
          testID="save-cabin-button"
        >
          <Save size={20} color={Colors.onPrimary} />
          <Text style={styles.saveActionText}>
            {existingCabin ? "Сохранить изменения" : "Создать домик"}
          </Text>
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
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
    fontWeight: "600" as const,
  },
  helperText: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
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
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  photosScroll: {
    marginHorizontal: -Spacing.lg,
    paddingLeft: 0,
  },
  photosContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    position: "relative",
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
  },
  photoRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
    gap: Spacing.xs,
  },
  addPhotoText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: "500" as const,
  },
  priceSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  pricesContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  priceInputGroup: {
    flex: 1,
  },
  priceLabel: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.xs,
  },
  priceInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  removePriceButton: {
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  addPriceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  addPriceText: {
    ...Typography.bodySmall,
    color: Colors.primary,
  },
  pricesPreview: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pricePreviewText: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    marginBottom: 2,
  },
  pricePreviewMore: {
    ...Typography.caption,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  amenityChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amenityChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  amenityChipText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  amenityChipTextActive: {
    color: Colors.onPrimary,
  },
  customAmenityRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  customAmenityInput: {
    flex: 1,
  },
  addAmenityButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedAmenities: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  selectedLabel: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    fontWeight: "500" as const,
  },
  selectedChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  selectedChipText: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
  },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveActionButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  saveActionText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
});
