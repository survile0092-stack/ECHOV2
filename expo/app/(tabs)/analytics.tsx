import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import {
  TrendingUp,
  Users,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
  Percent,
} from "lucide-react-native";
import { useBookingContext } from "@/context/BookingContext";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { getYear, getMonth } from "date-fns";
import type { AnalyticsFilter, AnalyticsData } from "@/types";
import RevenueDonutChart from "@/components/RevenueDonutChart";

const MONTHS = [
  "\u042F\u043D\u0432\u0430\u0440\u044C",
  "\u0424\u0435\u0432\u0440\u0430\u043B\u044C",
  "\u041C\u0430\u0440\u0442",
  "\u0410\u043F\u0440\u0435\u043B\u044C",
  "\u041C\u0430\u0439",
  "\u0418\u044E\u043D\u044C",
  "\u0418\u044E\u043B\u044C",
  "\u0410\u0432\u0433\u0443\u0441\u0442",
  "\u0421\u0435\u043D\u0442\u044F\u0431\u0440\u044C",
  "\u041E\u043A\u0442\u044F\u0431\u0440\u044C",
  "\u041D\u043E\u044F\u0431\u0440\u044C",
  "\u0414\u0435\u043A\u0430\u0431\u0440\u044C",
];

const YEARS = Array.from({ length: 5 }, (_, i) => getYear(new Date()) - 2 + i);

export default function AnalyticsScreen() {
  const { getAnalyticsData, exportToExcel, cabins, bookings } = useBookingContext();
  console.log("[AnalyticsScreen] render");
  const [filter, setFilter] = useState<AnalyticsFilter>({
    type: "month",
    year: getYear(new Date()),
    month: getMonth(new Date()),
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAnalyticsData(filter);
      setAnalyticsData(data);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.log("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, getAnalyticsData, fadeAnim]);

  useEffect(() => {
    fadeAnim.setValue(0);
    void loadAnalytics();
  }, [loadAnalytics, fadeAnim, cabins, bookings]);

  const handleExport = useCallback(async () => {
    try {
      const result = await exportToExcel();
      if (result.success) {
        Alert.alert(
          "\u0423\u0441\u043F\u0435\u0445",
          "\u0424\u0430\u0439\u043B \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D"
        );
      } else {
        Alert.alert(
          "\u041E\u0448\u0438\u0431\u043A\u0430",
          result.error || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C"
        );
      }
    } catch {
      Alert.alert(
        "\u041E\u0448\u0438\u0431\u043A\u0430",
        "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435"
      );
    }
  }, [exportToExcel]);

  const filterLabel = useMemo(() => {
    switch (filter.type) {
      case "month":
        return `${MONTHS[filter.month || 0]} ${filter.year}`;
      case "year":
        return `${filter.year} \u0433\u043E\u0434`;
      default:
        return "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0435\u0440\u0438\u043E\u0434";
    }
  }, [filter]);

  const maxCabinRevenue = useMemo(() => {
    if (!analyticsData) return 1;
    return Math.max(...analyticsData.cabinPerformance.map((c) => c.revenue), 1);
  }, [analyticsData]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{"\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430"}</Text>
          <Text style={styles.subtitle}>{filterLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExport}
          activeOpacity={0.8}
          testID="export-button"
        >
          <Download size={20} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterPicker(!showFilterPicker)}
          activeOpacity={0.7}
          testID="filter-button"
        >
          <Text style={styles.filterText}>{filterLabel}</Text>
          {showFilterPicker ? (
            <ChevronUp size={20} color={Colors.onSurface} />
          ) : (
            <ChevronDown size={20} color={Colors.onSurface} />
          )}
        </TouchableOpacity>

        {showFilterPicker && (
          <View style={[styles.filterPanel, Shadows.md]}>
            <View style={styles.filterTabs}>
              <TouchableOpacity
                style={[styles.filterTab, filter.type === "month" && styles.filterTabActive]}
                onPress={() =>
                  setFilter({
                    type: "month",
                    year: getYear(new Date()),
                    month: getMonth(new Date()),
                  })
                }
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filter.type === "month" && styles.filterTabTextActive,
                  ]}
                >
                  {"\u041C\u0435\u0441\u044F\u0446"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, filter.type === "year" && styles.filterTabActive]}
                onPress={() => setFilter({ type: "year", year: getYear(new Date()) })}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filter.type === "year" && styles.filterTabTextActive,
                  ]}
                >
                  {"\u0413\u043E\u0434"}
                </Text>
              </TouchableOpacity>
            </View>

            {filter.type === "month" && (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.yearSelector}
                >
                  {YEARS.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.yearButton, filter.year === year && styles.yearButtonActive]}
                      onPress={() => setFilter({ ...filter, year })}
                    >
                      <Text
                        style={[
                          styles.yearButtonText,
                          filter.year === year && styles.yearButtonTextActive,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.monthsGrid}>
                  {MONTHS.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.monthButton,
                        filter.month === index && styles.monthButtonActive,
                      ]}
                      onPress={() => setFilter({ ...filter, month: index })}
                    >
                      <Text
                        style={[
                          styles.monthButtonText,
                          filter.month === index && styles.monthButtonTextActive,
                        ]}
                      >
                        {month.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {filter.type === "year" && (
              <View style={styles.yearsGrid}>
                {YEARS.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearGridButton,
                      filter.year === year && styles.yearGridButtonActive,
                    ]}
                    onPress={() => setFilter({ type: "year", year })}
                  >
                    <Text
                      style={[
                        styles.yearGridButtonText,
                        filter.year === year && styles.yearGridButtonTextActive,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setShowFilterPicker(false);
                void loadAnalytics();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.applyButtonText}>{"\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{"\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..."}</Text>
          </View>
        ) : analyticsData ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.statsGrid}>
              <AnalyticsStatCard
                icon={<TrendingUp size={22} color={Colors.primary} />}
                title={"\u0412\u044B\u0440\u0443\u0447\u043A\u0430"}
                value={`${analyticsData.totalRevenue.toLocaleString()} \u20BD`}
                accent={Colors.primary}
              />
              <AnalyticsStatCard
                icon={<Calendar size={22} color={Colors.accent} />}
                title={"\u0411\u0440\u043E\u043D\u0438"}
                value={analyticsData.totalBookings}
                accent={Colors.accent}
              />
              <AnalyticsStatCard
                icon={<Users size={22} color={Colors.secondary} />}
                title={"\u0413\u043E\u0441\u0442\u0438"}
                value={analyticsData.totalGuests}
                accent={Colors.secondary}
              />
            </View>

            {analyticsData.averageBookingValue > 0 && (
              <View style={[styles.avgCard, Shadows.sm]}>
                <View style={styles.avgCardLeft}>
                  <Percent size={18} color={Colors.primary} />
                  <Text style={styles.avgCardTitle}>{"\u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0447\u0435\u043A"}</Text>
                </View>
                <Text style={styles.avgCardValue}>
                  {Math.round(analyticsData.averageBookingValue).toLocaleString()} {"\u20BD"}
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"\u042D\u0444\u0444\u0435\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C \u0434\u043E\u043C\u0438\u043A\u043E\u0432"}</Text>
              {analyticsData.cabinPerformance.map((cabin) => (
                <View key={cabin.cabinId} style={[styles.cabinCard, Shadows.sm]}>
                  <View style={styles.cabinCardHeader}>
                    <View style={styles.cabinNameRow}>
                      <View style={styles.cabinDot} />
                      <Text style={styles.cabinName}>{cabin.cabinName}</Text>
                    </View>
                    <Text style={styles.cabinRevenue}>
                      {cabin.revenue.toLocaleString()} {"\u20BD"}
                    </Text>
                  </View>
                  <View style={styles.cabinBarContainer}>
                    <View
                      style={[
                        styles.cabinBar,
                        {
                          width: `${Math.max((cabin.revenue / maxCabinRevenue) * 100, 4)}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.cabinStats}>
                    <Text style={styles.cabinStat}>
                      {"\u0411\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0439: "}{cabin.bookings}
                    </Text>
                    <Text style={styles.cabinStat}>
                      {"\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430: "}{cabin.occupancyRate.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <RevenueDonutChart filter={filter} bookings={bookings} cabins={cabins} />

            <View style={{ height: Spacing.xxl }} />
          </Animated.View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{"\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F"}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AnalyticsStatCard({
  icon,
  title,
  value,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  accent: string;
}) {
  return (
    <View style={[styles.statCard, Shadows.md]}>
      <View style={[styles.statIconContainer, { backgroundColor: `${accent}15` }]}>
        {icon}
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

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
  exportButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterText: {
    ...Typography.body,
    color: Colors.onSurface,
  },
  filterPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabs: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  filterTabTextActive: {
    color: Colors.onPrimary,
  },
  yearSelector: {
    marginBottom: Spacing.md,
  },
  yearButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    marginRight: Spacing.sm,
  },
  yearButtonActive: {
    backgroundColor: Colors.primary,
  },
  yearButtonText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  yearButtonTextActive: {
    color: Colors.onPrimary,
  },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  monthButton: {
    width: "23%",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: "center",
  },
  monthButtonActive: {
    backgroundColor: Colors.primary,
  },
  monthButtonText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  monthButtonTextActive: {
    color: Colors.onPrimary,
  },
  yearsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  yearGridButton: {
    width: "30%",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: "center",
  },
  yearGridButtonActive: {
    backgroundColor: Colors.primary,
  },
  yearGridButtonText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  yearGridButtonTextActive: {
    color: Colors.onPrimary,
  },
  applyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  applyButtonText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
  },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  statIconContainer: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    ...Typography.h3,
    color: Colors.onSurface,
  },
  statTitle: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  avgCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  avgCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avgCardTitle: {
    ...Typography.body,
    color: Colors.onSurface,
  },
  avgCardValue: {
    ...Typography.h3,
    color: Colors.primary,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  cabinCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cabinCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  cabinNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cabinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  cabinName: {
    ...Typography.h4,
    color: Colors.onSurface,
    fontSize: 15,
  },
  cabinRevenue: {
    ...Typography.h4,
    color: Colors.primary,
    fontSize: 15,
  },
  cabinBarContainer: {
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  cabinBar: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  cabinStats: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  cabinStat: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: "center",
  },
  emptyText: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
  },
});
