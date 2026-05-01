import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Search,
  Plus,
  Users,
  ChevronRight,
  Tent,
} from "lucide-react-native";
import { Image } from "expo-image";
import { useBookingContext } from "@/context/BookingContext";
import { resolvePhotoUri } from "@/lib/photoStorage";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import type { Cabin } from "@/types";

export default function CabinsScreen() {
  const router = useRouter();
  console.log("[CabinsScreen] render");
  const { cabins } = useBookingContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [capacityFilter, setCapacityFilter] = useState<number | null>(null);

  const filteredCabins = useMemo(() => {
    return cabins
      .filter((cabin) => {
        const matchesSearch = cabin.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesCapacity =
          capacityFilter === null || cabin.capacity >= capacityFilter;
        return matchesSearch && matchesCapacity;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cabins, searchQuery, capacityFilter]);

  const navigateToCabin = useCallback(
    (id: string) => {
      router.push(`/cabin/${id}`);
    },
    [router]
  );

  const navigateToAddCabin = useCallback(() => {
    router.push("/cabin/edit");
  }, [router]);

  const renderCabinCard = useCallback(
    ({ item }: { item: Cabin }) => (
      <CabinCard cabin={item} onPress={() => navigateToCabin(item.id)} />
    ),
    [navigateToCabin]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{"\u0414\u043E\u043C\u0438\u043A\u0438"}</Text>
          <Text style={styles.subtitle}>{cabins.length} {"\u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435"}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={navigateToAddCabin}
          activeOpacity={0.8}
          testID="add-cabin-button"
        >
          <Plus size={22} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={Colors.onSurfaceVariant} />
        <TextInput
          style={styles.searchInput}
          placeholder={"\u041F\u043E\u0438\u0441\u043A \u0434\u043E\u043C\u0438\u043A\u043E\u0432..."}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.onSurfaceVariant}
          testID="search-cabins"
        />
      </View>

      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>{"\u041C\u0438\u043D. \u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u044C:"}</Text>
        <View style={styles.filterButtons}>
          {[null, 2, 4, 6].map((capacity) => (
            <TouchableOpacity
              key={capacity ?? "all"}
              style={[
                styles.filterButton,
                capacityFilter === capacity && styles.filterButtonActive,
              ]}
              onPress={() => setCapacityFilter(capacity)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  capacityFilter === capacity && styles.filterButtonTextActive,
                ]}
              >
                {capacity ?? "\u0412\u0441\u0435"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredCabins}
        keyExtractor={(item) => item.id}
        renderItem={renderCabinCard}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Tent size={40} color={Colors.border} />
            <Text style={styles.emptyTitle}>{"\u0414\u043E\u043C\u0438\u043A\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B"}</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441" : "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0435\u0440\u0432\u044B\u0439 \u0434\u043E\u043C\u0438\u043A"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const CabinCard = React.memo(function CabinCard({
  cabin,
  onPress,
}: {
  cabin: Cabin;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.cabinCard, Shadows.md]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`cabin-card-${cabin.id}`}
    >
      {cabin.photoUris && cabin.photoUris.length > 0 ? (
        <Image
          source={{ uri: resolvePhotoUri(cabin.photoUris[0]) }}
          style={styles.cabinThumbnail}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={styles.cabinImagePlaceholder}>
          <Text style={styles.cabinImageText}>
            {cabin.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.cabinInfo}>
        <Text style={styles.cabinName} numberOfLines={1}>{cabin.name}</Text>
        <Text style={styles.cabinDescription} numberOfLines={2}>
          {cabin.description}
        </Text>
        <View style={styles.cabinMeta}>
          <View style={styles.metaItem}>
            <Users size={13} color={Colors.onSurfaceVariant} />
            <Text style={styles.metaText}>{cabin.capacity} {"\u0433\u043E\u0441\u0442\u0435\u0439"}</Text>
          </View>
          <View style={styles.metaPriceBadge}>
            <Text style={styles.metaPriceText}>{`${cabin.pricePerNight}₽/ночь`}</Text>
          </View>
        </View>
        {cabin.amenities.length > 0 && (
          <View style={styles.amenitiesRow}>
            {cabin.amenities.slice(0, 3).map((amenity, index) => (
              <View key={index} style={styles.amenityChip}>
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
            {cabin.amenities.length > 3 && (
              <Text style={styles.moreAmenities}>+{cabin.amenities.length - 3}</Text>
            )}
          </View>
        )}
      </View>
      <ChevronRight size={20} color={Colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.h1,
    color: Colors.primary,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    ...Typography.body,
    color: Colors.onSurface,
  },
  filtersContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  filterLabel: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
  },
  filterButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  filterButtonTextActive: {
    color: Colors.onPrimary,
  },
  list: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  cabinCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  cabinImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  cabinThumbnail: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
    backgroundColor: Colors.surfaceVariant,
  },
  cabinImageText: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.onPrimary,
  },
  cabinInfo: {
    flex: 1,
  },
  cabinName: {
    ...Typography.h4,
    color: Colors.onSurface,
    fontSize: 15,
  },
  cabinDescription: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
  },
  cabinMeta: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },
  metaPriceBadge: {
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  metaPriceText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  amenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  amenityChip: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  amenityText: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    fontSize: 11,
  },
  moreAmenities: {
    ...Typography.caption,
    color: Colors.primary,
    fontSize: 11,
    alignSelf: "center",
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
});
