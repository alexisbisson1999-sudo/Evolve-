import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { FONTS } from '../../components/ui';
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
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopWidth: 0,
          minHeight: 66,
          boxShadow: c.scheme === 'light' ? '0 -4px 18px rgba(28, 45, 60, 0.06)' : undefined,
        },
        tabBarLabelStyle: { fontSize: 12, fontFamily: FONTS.bold },
        headerStyle: { backgroundColor: c.bg },
        headerTitleStyle: { color: c.text, fontFamily: FONTS.heavy, fontSize: 20 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Aujourd'hui", headerTitle: '', tabBarIcon: icon('today-outline') }} />
      <Tabs.Screen name="seances" options={{ title: 'Séances', tabBarIcon: icon('barbell-outline') }} />
      <Tabs.Screen name="suivi" options={{ title: 'Suivi', tabBarIcon: icon('stats-chart-outline') }} />
      <Tabs.Screen name="reglages" options={{ title: 'Réglages', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
