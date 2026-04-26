import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BookingProvider } from "@/context/BookingContext";
import { setupNotifications } from "@/lib/notifications";
import { StatusBar } from "expo-status-bar";
import { Colors } from "@/constants/theme";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  console.log("[RootLayoutNav] render");
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Назад",
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.primary,
        headerTitleStyle: { color: Colors.onSurface, fontWeight: "600" as const },
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="cabin/[id]" options={{ title: "Детали домика" }} />
      <Stack.Screen name="cabin/edit" options={{ title: "Редактирование" }} />
      <Stack.Screen name="booking/new" options={{ title: "Новая бронь" }} />
      <Stack.Screen name="booking/[id]" options={{ title: "Детали брони" }} />
      <Stack.Screen name="booking/edit" options={{ title: "Редактировать бронь" }} />
      <Stack.Screen name="modal" options={{ presentation: "modal", title: "Информация" }} />
    </Stack>
  );
}

export default function RootLayout() {
  console.log("[RootLayout] render");
  useEffect(() => {
    void SplashScreen.hideAsync();
    void setupNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BookingProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <RootLayoutNav />
        </GestureHandlerRootView>
      </BookingProvider>
    </QueryClientProvider>
  );
}
