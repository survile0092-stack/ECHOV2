import { Tabs } from "expo-router";
import { Home, Tent, Calendar, Settings, BarChart3 } from "lucide-react-native";
import { Colors } from "@/constants/theme";
import { Platform } from "react-native";

export default function TabLayout() {
  console.log("[TabLayout] render");
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          ...(Platform.OS === "web" ? { height: 60 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500" as const,
        },
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTintColor: Colors.onSurface,
        headerTitleStyle: {
          fontWeight: "600" as const,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Главная",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="cabins"
        options={{
          title: "Домики",
          tabBarIcon: ({ color, size }) => <Tent size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Брони",
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Аналитика",
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Настройки",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
