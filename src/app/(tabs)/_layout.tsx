import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { usePalette } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  };
}

export default function TabsLayout() {
  const c = usePalette();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textFaint,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, minHeight: 64 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerStyle: { backgroundColor: c.bg },
        headerTitleStyle: { color: c.text, fontWeight: '800' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Aujourd'hui", tabBarIcon: icon('today-outline') }} />
      <Tabs.Screen name="seances" options={{ title: 'Séances', tabBarIcon: icon('barbell-outline') }} />
      <Tabs.Screen name="suivi" options={{ title: 'Suivi', tabBarIcon: icon('stats-chart-outline') }} />
      <Tabs.Screen name="reglages" options={{ title: 'Réglages', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
