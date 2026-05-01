import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  Bell,
  Info,
  ChevronRight,
  Plus,
  X,
  Upload,
  Download,
  Database,
} from "lucide-react-native";
import { File as FSFile } from "expo-file-system";
import { useBookingContext } from "@/context/BookingContext";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";

function getDayWord(days: number): string {
  if (days === 1) return "\u0434\u0435\u043D\u044C";
  if (days >= 2 && days <= 4) return "\u0434\u043D\u044F";
  return "\u0434\u043D\u0435\u0439";
}

export default function SettingsScreen() {
  const { settings, saveSettings, exportBackup, importBackup } = useBookingContext();
  console.log("[SettingsScreen] render");
  const [newNotificationDay, setNewNotificationDay] = useState("");
  const [showAddDay, setShowAddDay] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const toggleNotifications = useCallback(() => {
    saveSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled });
  }, [settings, saveSettings]);

  const addNotificationDay = useCallback(() => {
    const day = parseInt(newNotificationDay, 10);
    if (isNaN(day) || day < 0 || day > 30) {
      Alert.alert("\u041E\u0448\u0438\u0431\u043A\u0430", "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0447\u0438\u0441\u043B\u043E \u043E\u0442 0 \u0434\u043E 30");
      return;
    }
    const currentDays = settings.notificationDays || [3, 1];
    if (currentDays.includes(day)) {
      Alert.alert("\u041E\u0448\u0438\u0431\u043A\u0430", "\u0422\u0430\u043A\u043E\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435 \u0443\u0436\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E");
      return;
    }
    const newDays = [...currentDays, day].sort((a, b) => b - a);
    saveSettings({ ...settings, notificationDays: newDays });
    setNewNotificationDay("");
    setShowAddDay(false);
  }, [newNotificationDay, settings, saveSettings]);

  const removeNotificationDay = useCallback(
    (day: number) => {
      const currentDays = settings.notificationDays || [3, 1];
      const newDays = currentDays.filter((d) => d !== day);
      saveSettings({ ...settings, notificationDays: newDays });
    },
    [settings, saveSettings]
  );

  const handleExportBackup = useCallback(async () => {
    setIsExporting(true);
    try {
      const result = await exportBackup();
      if (result.success) {
        Alert.alert("\u0423\u0441\u043F\u0435\u0445", "\u0420\u0435\u0437\u0435\u0440\u0432\u043D\u0430\u044F \u043A\u043E\u043F\u0438\u044F \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0430");
      } else {
        Alert.alert("\u041E\u0448\u0438\u0431\u043A\u0430", result.error || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C");
      }
    } catch {
      Alert.alert("\u041E\u0448\u0438\u0431\u043A\u0430", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435");
    } finally {
      setIsExporting(false);
    }
  }, [exportBackup]);

  const handleImportBackup = useCallback(async () => {
    try {
      setIsImporting(true);

      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: Event) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          if (!file) {
            setIsImporting(false);
            return;
          }
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const jsonString = ev.target?.result as string;
              const result = await importBackup(jsonString);
              if (result.success) {
                Alert.alert(
                  "\u0423\u0441\u043F\u0435\u0445",
                  `\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E: ${result.counts?.cabins ?? 0} \u0434\u043E\u043C\u0438\u043A\u043E\u0432, ${result.counts?.bookings ?? 0} \u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0439`
                );
              } else {
                Alert.alert("\u041E\u0448\u0438\u0431\u043A\u0430", result.error || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C");
              }
            } catch {
              Alert.alert("\u041E\u0448\u0438\u0431\u043A\u0430", "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0444\u0430\u0439\u043B\u0430");
            } finally {
              setIsImporting(false);
            }
          };
          reader.readAsText(file);
        };
        input.click();
        return;
      }

      const pickedFile = await FSFile.pickFileAsync(undefined, 'application/json');
      if (!pickedFile) {
        setIsImporting(false);
        return;
      }

      const file = Array.isArray(pickedFile) ? pickedFile[0] : pickedFile;
      const jsonString = await file.text();

      const result = await importBackup(jsonString);
      if (result.success) {
        Alert.alert(
          "\u0423\u0441\u043F\u0435\u0445",
          `\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E: ${result.counts?.cabins ?? 0} \u0434\u043E\u043C\u0438\u043A\u043E\u0432, ${result.counts?.bookings ?? 0} \u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0439`
        );
      } else {
        Alert.alert("\u041E\u0448\u0438\u0431\u043A\u0430", result.error || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C");
      }
    } catch (error) {
      console.log("Import error:", error);
      Alert.alert("\u041E\u0448\u0438\u0431\u043A\u0430", "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435");
    } finally {
      setIsImporting(false);
    }
  }, [importBackup]);

  const notificationDays = settings.notificationDays || [3, 1];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{"\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{"\u0423\u0412\u0415\u0414\u041E\u041C\u041B\u0415\u041D\u0418\u042F"}</Text>

          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={[styles.iconContainer, { backgroundColor: `${Colors.primary}15` }]}>
                <Bell size={20} color={Colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{"\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F"}</Text>
                <Text style={styles.settingSubtitle}>{"\u041D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u043E \u043F\u0440\u0435\u0434\u0441\u0442\u043E\u044F\u0449\u0438\u0445 \u0437\u0430\u0435\u0437\u0434\u0430\u0445"}</Text>
              </View>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={settings.notificationsEnabled ? Colors.surface : Colors.onSurfaceVariant}
              />
            </View>
          </View>

          {settings.notificationsEnabled && (
            <View style={[styles.card, { marginTop: Spacing.md }]}>
              <View style={styles.notificationDaysHeader}>
                <Text style={styles.notificationDaysTitle}>{"\u041D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u0442\u044C \u0437\u0430 (\u0434\u043D\u0435\u0439)"}</Text>
                <TouchableOpacity
                  onPress={() => setShowAddDay(!showAddDay)}
                  hitSlop={8}
                  testID="add-notification-day"
                >
                  <Plus size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {showAddDay && (
                <View style={styles.addDayRow}>
                  <TextInput
                    style={styles.dayInputField}
                    value={newNotificationDay}
                    onChangeText={setNewNotificationDay}
                    placeholder={"\u0414\u043D\u0435\u0439"}
                    placeholderTextColor={Colors.onSurfaceVariant}
                    keyboardType="number-pad"
                    maxLength={2}
                    testID="notification-day-input"
                  />
                  <TouchableOpacity
                    style={styles.addDayButton}
                    onPress={addNotificationDay}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addDayButtonText}>{"\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C"}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.daysList}>
                {notificationDays.map((day) => (
                  <View key={day} style={styles.dayChip}>
                    <Text style={styles.dayChipText}>
                      {day === 0
                        ? "\u0412 \u0434\u0435\u043D\u044C \u0437\u0430\u0435\u0437\u0434\u0430"
                        : `\u0417\u0430 ${day} ${getDayWord(day)}`}
                    </Text>
                    <TouchableOpacity onPress={() => removeNotificationDay(day)} hitSlop={6}>
                      <X size={14} color={Colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{"\u0420\u0415\u0417\u0415\u0420\u0412\u041D\u041E\u0415 \u041A\u041E\u041F\u0418\u0420\u041E\u0412\u0410\u041D\u0418\u0415"}</Text>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleExportBackup}
              activeOpacity={0.7}
              disabled={isExporting}
              testID="export-backup"
            >
              <View style={[styles.iconContainer, { backgroundColor: `${Colors.info}15` }]}>
                {isExporting ? (
                  <ActivityIndicator size="small" color={Colors.info} />
                ) : (
                  <Upload size={20} color={Colors.info} />
                )}
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{"\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0434\u0430\u043D\u043D\u044B\u0445"}</Text>
                <Text style={styles.settingSubtitle}>{"\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0432\u0441\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0432 \u0444\u0430\u0439\u043B"}</Text>
              </View>
              <ChevronRight size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleImportBackup}
              activeOpacity={0.7}
              disabled={isImporting}
              testID="import-backup"
            >
              <View style={[styles.iconContainer, { backgroundColor: `${Colors.accent}15` }]}>
                {isImporting ? (
                  <ActivityIndicator size="small" color={Colors.accent} />
                ) : (
                  <Download size={20} color={Colors.accent} />
                )}
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{"\u0418\u043C\u043F\u043E\u0440\u0442 \u0434\u0430\u043D\u043D\u044B\u0445"}</Text>
                <Text style={styles.settingSubtitle}>{"\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u0444\u0430\u0439\u043B\u0430"}</Text>
              </View>
              <ChevronRight size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <Text style={styles.backupHint}>
            {"\u042D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u0443\u0439\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435, \u0447\u0442\u043E\u0431\u044B \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 \u0438\u0445 \u043D\u0430 \u0434\u0440\u0443\u0433\u043E\u0435 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u0438\u043B\u0438 \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u0443\u044E \u043A\u043E\u043F\u0438\u044E"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{"\u041E \u041F\u0420\u0418\u041B\u041E\u0416\u0415\u041D\u0418\u0418"}</Text>

          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={[styles.iconContainer, { backgroundColor: `${Colors.info}15` }]}>
                <Info size={20} color={Colors.info} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{"\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0434\u043E\u043C\u0438\u043A\u0430\u043C\u0438"}</Text>
                <Text style={styles.settingSubtitle}>{"\u0412\u0435\u0440\u0441\u0438\u044F 1.1.0"}</Text>
              </View>
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingItem}>
              <View style={[styles.iconContainer, { backgroundColor: `${Colors.secondary}15` }]}>
                <Database size={20} color={Colors.secondary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{"\u0425\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u0434\u0430\u043D\u043D\u044B\u0445"}</Text>
                <Text style={styles.settingSubtitle}>{"\u0414\u0430\u043D\u043D\u044B\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F \u043F\u0440\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438"}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {"\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0434\u043E\u043C\u0438\u043A\u0430\u043C\u0438 \u2014 \u0432\u0430\u0448 \u0443\u044E\u0442\u043D\u044B\u0439 \u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.h1,
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
    fontWeight: "600" as const,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  settingDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...Typography.body,
    color: Colors.onSurface,
  },
  settingSubtitle: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  notificationDaysHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  notificationDaysTitle: {
    ...Typography.body,
    color: Colors.onSurface,
    fontWeight: "600" as const,
  },
  addDayRow: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dayInputField: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addDayButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
  },
  addDayButtonText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
  daysList: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dayChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  dayChipText: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
  },
  backupHint: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    lineHeight: 18,
  },
  footer: {
    padding: Spacing.xl,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },
});
