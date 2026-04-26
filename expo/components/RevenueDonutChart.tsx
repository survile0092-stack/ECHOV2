import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent, Platform } from "react-native";
import Svg, { G, Path, Circle } from "react-native-svg";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import type { Booking, Cabin, AnalyticsFilter } from "@/types";
import {
  parseISO,
  getYear,
  getMonth,
  getDate,
  getDaysInMonth,
  isWithinInterval,
} from "date-fns";

type Metric = "revenue" | "bookings" | "guests";
type Breakdown = "cabins" | "periods";

type Segment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

const PALETTE: string[] = [
  "#6D4C41",
  "#D7A86E",
  "#4CAF50",
  "#8D6E63",
  "#F57C00",
  "#1976D2",
  "#9C6644",
  "#A47148",
  "#E6C9A8",
  "#81C784",
  "#B08968",
  "#7B5E57",
];

const MONTH_SHORT: string[] = [
  "\u042F\u043D\u0432",
  "\u0424\u0435\u0432",
  "\u041C\u0430\u0440",
  "\u0410\u043F\u0440",
  "\u041C\u0430\u0439",
  "\u0418\u044E\u043D",
  "\u0418\u044E\u043B",
  "\u0410\u0432\u0433",
  "\u0421\u0435\u043D",
  "\u041E\u043A\u0442",
  "\u041D\u043E\u044F",
  "\u0414\u0435\u043A",
];

interface Props {
  filter: AnalyticsFilter;
  bookings: Booking[];
  cabins: Cabin[];
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number): { x: number; y: number } {
  const a = ((angle - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeArc(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number): string {
  const safeEnd = endAngle - startAngle >= 360 ? startAngle + 359.999 : endAngle;
  const startOuter = polarToCartesian(cx, cy, rOuter, safeEnd);
  const endOuter = polarToCartesian(cx, cy, rOuter, startAngle);
  const startInner = polarToCartesian(cx, cy, rInner, startAngle);
  const endInner = polarToCartesian(cx, cy, rInner, safeEnd);
  const largeArc = safeEnd - startAngle <= 180 ? "0" : "1";
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

function formatValue(metric: Metric, value: number): string {
  if (metric === "revenue") {
    return `${Math.round(value).toLocaleString("ru-RU")} \u20BD`;
  }
  return value.toLocaleString("ru-RU");
}

function metricLabel(metric: Metric): string {
  if (metric === "revenue") return "\u0412\u044B\u0440\u0443\u0447\u043A\u0430";
  if (metric === "bookings") return "\u0411\u0440\u043E\u043D\u0438";
  return "\u0413\u043E\u0441\u0442\u0438";
}

export default function RevenueDonutChart({ filter, bookings, cabins }: Props) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const [breakdown, setBreakdown] = useState<Breakdown>("cabins");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [width, setWidth] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const rafRef = useRef<number | null>(null);
  const animKey = `${metric}-${breakdown}-${filter.type}-${filter.year ?? ""}-${filter.month ?? ""}`;

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (b.status !== "CONFIRMED") return false;
      const checkIn = parseISO(b.checkInDate);
      if (filter.type === "month" && filter.year !== undefined && filter.month !== undefined) {
        return getYear(checkIn) === filter.year && getMonth(checkIn) === filter.month;
      }
      if (filter.type === "year" && filter.year !== undefined) {
        return getYear(checkIn) === filter.year;
      }
      if (filter.type === "period" && filter.startDate && filter.endDate) {
        return isWithinInterval(checkIn, {
          start: parseISO(filter.startDate),
          end: parseISO(filter.endDate),
        });
      }
      return false;
    });
  }, [bookings, filter]);

  const segments: Segment[] = useMemo(() => {
    const getMetricValue = (b: Booking): number => {
      if (metric === "revenue") return b.totalPrice;
      if (metric === "bookings") return 1;
      return b.guestCount || 1;
    };

    if (breakdown === "cabins") {
      const map = new Map<string, { name: string; value: number }>();
      cabins.forEach((c) => map.set(c.id, { name: c.name, value: 0 }));
      filteredBookings.forEach((b) => {
        const existing = map.get(b.cabinId);
        if (existing) {
          existing.value += getMetricValue(b);
        } else {
          map.set(b.cabinId, { name: b.cabinName, value: getMetricValue(b) });
        }
      });
      const arr: Segment[] = Array.from(map.entries())
        .map(([id, v], i) => ({
          key: id,
          label: v.name,
          value: v.value,
          color: PALETTE[i % PALETTE.length],
        }))
        .filter((s) => s.value > 0)
        .sort((a, b) => b.value - a.value);
      return arr;
    }

    if (filter.type === "month" && filter.year !== undefined && filter.month !== undefined) {
      const days = getDaysInMonth(new Date(filter.year, filter.month, 1));
      const arr: Segment[] = [];
      for (let d = 1; d <= days; d += 1) {
        const value = filteredBookings
          .filter((b) => getDate(parseISO(b.checkInDate)) === d)
          .reduce((sum, b) => sum + getMetricValue(b), 0);
        if (value > 0) {
          arr.push({
            key: `d-${d}`,
            label: `${d} ${MONTH_SHORT[filter.month]}`,
            value,
            color: PALETTE[(d - 1) % PALETTE.length],
          });
        }
      }
      return arr.sort((a, b) => b.value - a.value);
    }

    if (filter.type === "year" && filter.year !== undefined) {
      const arr: Segment[] = [];
      for (let m = 0; m < 12; m += 1) {
        const value = filteredBookings
          .filter((b) => getMonth(parseISO(b.checkInDate)) === m)
          .reduce((sum, b) => sum + getMetricValue(b), 0);
        if (value > 0) {
          arr.push({
            key: `m-${m}`,
            label: MONTH_SHORT[m],
            value,
            color: PALETTE[m % PALETTE.length],
          });
        }
      }
      return arr.sort((a, b) => b.value - a.value);
    }

    return [];
  }, [filteredBookings, cabins, metric, breakdown, filter]);

  const total = useMemo(() => segments.reduce((sum, s) => sum + s.value, 0), [segments]);

  useEffect(() => {
    setSelectedKey(null);
  }, [animKey]);

  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    const duration = 600;
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [animKey]);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const size = Math.min(width || 280, 320);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 6;
  const rInner = rOuter - 28;

  const selectedSegment = selectedKey ? segments.find((s) => s.key === selectedKey) ?? null : null;
  const centerValue = selectedSegment ? selectedSegment.value : total;
  const centerCaption = selectedSegment ? selectedSegment.label : metricLabel(metric);

  let cursor = 0;
  const arcs = segments.map((s) => {
    const sweep = total > 0 ? (s.value / total) * 360 * progress : 0;
    const start = cursor;
    const end = cursor + sweep;
    cursor += total > 0 ? (s.value / total) * 360 : 0;
    const gap = segments.length > 1 ? Math.min(2, sweep / 4) : 0;
    return { ...s, start, end: Math.max(start, end - gap) };
  });

  return (
    <View style={[styles.card, Shadows.sm]} testID="revenue-donut-chart">
      <View style={styles.headerRow}>
        <Text style={styles.title}>{"\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0435\u0439"}</Text>
      </View>

      <View style={styles.segmentedRow}>
        {(["revenue", "bookings", "guests"] as Metric[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.segment, metric === m && styles.segmentActive]}
            onPress={() => setMetric(m)}
            activeOpacity={0.8}
            testID={`metric-${m}`}
          >
            <Text style={[styles.segmentText, metric === m && styles.segmentTextActive]}>
              {metricLabel(m)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.breakdownRow}>
        <TouchableOpacity
          style={[styles.pill, breakdown === "cabins" && styles.pillActive]}
          onPress={() => setBreakdown("cabins")}
          activeOpacity={0.8}
          testID="breakdown-cabins"
        >
          <Text style={[styles.pillText, breakdown === "cabins" && styles.pillTextActive]}>
            {"\u041F\u043E \u0434\u043E\u043C\u0438\u043A\u0430\u043C"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, breakdown === "periods" && styles.pillActive]}
          onPress={() => setBreakdown("periods")}
          activeOpacity={0.8}
          testID="breakdown-periods"
        >
          <Text style={[styles.pillText, breakdown === "periods" && styles.pillTextActive]}>
            {filter.type === "year"
              ? "\u041F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C"
              : "\u041F\u043E \u0434\u043D\u044F\u043C"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chartWrap} onLayout={onLayout}>
        {width > 0 && (
          <Svg width={size} height={size}>
            <G>
              <Circle cx={cx} cy={cy} r={(rOuter + rInner) / 2} stroke={Colors.surfaceVariant} strokeWidth={rOuter - rInner} fill="none" />
              {total > 0 &&
                arcs.map((a) => {
                  const isDimmed = selectedKey !== null && selectedKey !== a.key;
                  if (a.end <= a.start) return null;
                  const pressProps = Platform.OS === "web"
                    ? {}
                    : {
                        onPress: () => {
                          setSelectedKey((prev) => (prev === a.key ? null : a.key));
                        },
                      };
                  return (
                    <Path
                      key={a.key}
                      d={describeArc(cx, cy, rOuter, rInner, a.start, a.end)}
                      fill={a.color}
                      opacity={isDimmed ? 0.25 : 1}
                      {...pressProps}
                    />
                  );
                })}
            </G>
          </Svg>
        )}
        {total > 0 && (
          <View pointerEvents="none" style={styles.centerOverlay}>
            <Text style={styles.centerValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatValue(metric, centerValue)}
            </Text>
            <Text style={styles.centerCaption} numberOfLines={1}>
              {centerCaption}
            </Text>
            {selectedSegment && total > 0 && (
              <Text style={styles.centerPercent}>
                {((selectedSegment.value / total) * 100).toFixed(1)}%
              </Text>
            )}
          </View>
        )}
        {total === 0 && (
          <View style={styles.emptyOverlay} pointerEvents="none">
            <Text style={styles.emptyText}>
              {"\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0437\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434"}
            </Text>
          </View>
        )}
      </View>

      {total > 0 && (
        <View style={styles.legend}>
          {segments.map((s) => {
            const percent = ((s.value / total) * 100).toFixed(1);
            const active = selectedKey === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.legendRow, active && styles.legendRowActive]}
                onPress={() => setSelectedKey((prev) => (prev === s.key ? null : s.key))}
                activeOpacity={0.7}
                testID={`legend-${s.key}`}
              >
                <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {s.label}
                </Text>
                <Text style={styles.legendValue}>{formatValue(metric, s.value)}</Text>
                <Text style={styles.legendPercent}>{percent}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  headerRow: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.onSurface,
  },
  segmentedRow: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    ...Typography.bodySmall,
    color: Colors.onSurfaceVariant,
    fontWeight: "600" as const,
  },
  segmentTextActive: {
    color: Colors.onPrimary,
  },
  breakdownRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  pillActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  pillText: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    fontWeight: "600" as const,
  },
  pillTextActive: {
    color: Colors.onPrimary,
  },
  chartWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 280,
    marginVertical: Spacing.sm,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  centerValue: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.primary,
    textAlign: "center",
  },
  centerCaption: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: "center",
  },
  centerPercent: {
    ...Typography.bodySmall,
    color: Colors.secondary,
    marginTop: 2,
    fontWeight: "700" as const,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
  },
  legend: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  legendRowActive: {
    backgroundColor: Colors.background,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    flex: 1,
  },
  legendValue: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    fontWeight: "600" as const,
    marginRight: Spacing.sm,
  },
  legendPercent: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    width: 48,
    textAlign: "right",
  },
});
