import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { AlertCircle } from "lucide-react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "\u041E\u0448\u0438\u0431\u043A\u0430" }} />
      <View style={styles.container} testID="not-found-screen">
        <View style={styles.iconContainer}>
          <AlertCircle size={48} color={Colors.onSurfaceVariant} />
        </View>
        <Text style={styles.title}>{"\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430"}</Text>
        <Text style={styles.description}>
          {"\u0417\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0435\u043C\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442"}
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{"\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E"}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  link: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  linkText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
});
