import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect } from 'react';
import { Platform, Vibration } from 'react-native';
import { useAppStore } from '../store/useAppStore';

const beep = require('../../assets/sounds/beep.wav');

/** Signal de fin de chrono : son + vibration selon les réglages. */
export function useEndSignal() {
  const player = useAudioPlayer(beep);
  const soundEnabled = useAppStore((s) => s.settings.soundEnabled);
  const vibrationEnabled = useAppStore((s) => s.settings.vibrationEnabled);

  useEffect(() => {
    // Joue même en mode silencieux iOS, sans couper la musique de l'utilisateur.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
  }, []);

  return useCallback(() => {
    if (soundEnabled) {
      try {
        player.seekTo(0);
        player.play();
      } catch {
        // le son est un bonus : ne jamais bloquer la séance
      }
    }
    if (vibrationEnabled && Platform.OS !== 'web') {
      Vibration.vibrate(Platform.OS === 'android' ? [0, 400, 150, 400, 150, 600] : 1000);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [player, soundEnabled, vibrationEnabled]);
}

export function tap() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
