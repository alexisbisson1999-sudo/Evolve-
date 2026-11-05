// Import graisse par graisse : seules ces 5 polices sont embarquées dans l'app.
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { Nunito_900Black } from '@expo-google-fonts/nunito/900Black';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DialogHost } from '../components/Dialog';
import { FONTS } from '../components/ui';
import { rescheduleReminders } from '../services/notifications';
import { getSession, syncConfigured, syncNow } from '../services/sync';
import { useAppStore, useHydrated } from '../store/useAppStore';
import { usePalette } from '../theme';

function useBackgroundServices(hydrated: boolean) {
  const settings = useAppStore((s) => s.settings);
  const historyCount = useAppStore((s) => s.history.length);
  const dirtyAt = useAppStore((s) => s.dirtyAt);

  // Rappels quotidiens : reprogrammés quand un réglage utile change ou qu'une séance est faite.
  useEffect(() => {
    if (!hydrated) return;
    rescheduleReminders(useAppStore.getState().settings, useAppStore.getState().history).catch(() => {});
  }, [
    hydrated,
    settings.reminderEnabled,
    settings.reminderHour,
    settings.reminderMinute,
    settings.startDate,
    settings.maxPushups,
    settings.programId,
    historyCount,
  ]);

  // Synchro : au démarrage, au retour au premier plan, et 3 s après une modification.
  useEffect(() => {
    if (!hydrated || !syncConfigured) return;
    const run = () => getSession().then((s) => s && syncNow()).catch(() => {});
    run();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        run();
        rescheduleReminders(useAppStore.getState().settings, useAppStore.getState().history).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !syncConfigured || !dirtyAt) return;
    const id = setTimeout(() => {
      getSession().then((s) => s && syncNow()).catch(() => {});
    }, 3000);
    return () => clearTimeout(id);
  }, [hydrated, dirtyAt]);
}

export default function RootLayout() {
  const c = usePalette();
  const hydrated = useHydrated();
  const [fontsLoaded, fontError] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  const ready = hydrated && (fontsLoaded || !!fontError);
  useBackgroundServices(hydrated);

  const navTheme = useMemo(() => {
    const base = c.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: c.accent,
        background: c.bg,
        card: c.surface,
        text: c.text,
        border: c.border,
      },
    };
  }, [c]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style={c.scheme === 'dark' ? 'light' : 'dark'} />
        {!ready ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
            <ActivityIndicator color={c.accent} />
          </View>
        ) : (
          <Stack
            screenOptions={{
              headerBackTitle: 'Retour',
              contentStyle: { backgroundColor: c.bg },
              headerStyle: { backgroundColor: c.bg },
              headerShadowVisible: false,
              headerTitleStyle: { fontFamily: FONTS.heavy, color: c.text },
              headerTintColor: c.accent,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="seance/index" options={{ title: 'Séance', gestureEnabled: false }} />
            <Stack.Screen name="apercu/[id]" options={{ title: 'Aperçu' }} />
            <Stack.Screen name="exercice/[id]" options={{ title: 'Explication', presentation: 'modal' }} />
            <Stack.Screen name="bilan/[id]" options={{ title: 'Bravo !', gestureEnabled: false }} />
            <Stack.Screen name="galerie" options={{ title: 'Mouvements' }} />
          </Stack>
        )}
        <DialogHost />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
