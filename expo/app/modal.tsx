import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { X, Tent } from "lucide-react-native";

export default function ModalScreen() {
  console.log("[ModalScreen] render");
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={() => router.back()}
    >
      <Pressable style={styles.overlay} onPress={() => router.back()}>
        <View style={styles.modalContent}>
          <View style={styles.iconWrapper}>
            <Tent size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{"\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0434\u043E\u043C\u0438\u043A\u0430\u043C\u0438"}</Text>
          <Text style={styles.description}>
            {"\u041F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0434\u043B\u044F \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F\u043C\u0438 \u0438 \u0434\u043E\u043C\u0438\u043A\u0430\u043C\u0438. \u0412\u0435\u0440\u0441\u0438\u044F 1.0.0"}
          </Text>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <X size={18} color={Colors.onPrimary} />
            <Text style={styles.closeButtonText}>{"\u0417\u0430\u043A\u0440\u044B\u0442\u044C"}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>

      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    margin: Spacing.xl,
    alignItems: "center",
    minWidth: 300,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  description: {
    ...Typography.body,
    textAlign: "center",
    marginBottom: Spacing.xl,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
  },
  closeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 140,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  closeButtonText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
});
