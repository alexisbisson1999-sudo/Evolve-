import { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { formatClock } from '../domain/dates';
import { clampRest, REST_MAX, REST_MIN } from '../domain/program';
import { useEndSignal } from '../services/feedback';
import { radius, space, usePalette } from '../theme';
import { Button, IconButton, Row, T } from './ui';

/**
 * Chrono basé sur l'heure de fin (et non un compteur) : reste juste même si
 * l'app passe en arrière-plan quelques instants.
 */
export type TimerState =
  | null
  | {
      mode: 'rest' | 'effort';
      title: string;
      /** Phases successives (ex. côté gauche puis côté droit), en secondes. */
      phases: { label?: string; seconds: number }[];
      phase: number;
      endsAt: number; // ms
      pausedRemaining?: number; // ms si en pause
      onDone?: () => void;
      /** Identifiant de l'exercice concerné (pour mémoriser le repos). */
      ref?: string;
    };

export function useWorkoutTimer() {
  const [timer, setTimer] = useState<TimerState>(null);
  const [now, setNow] = useState(() => Date.now());
  const signal = useEndSignal();

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    const sub = AppState.addEventListener('change', () => setNow(Date.now()));
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [timer]);

  // Fin de phase / de chrono (déclenché par le tic d'horloge, donc hors rendu).
  const t = timer;
  const finished = !!t && t.pausedRemaining === undefined && now >= t.endsAt;
  useEffect(() => {
    if (!finished || !t) return;
    signal();
    const id = setTimeout(() => {
      if (t.phase + 1 < t.phases.length) {
        const next = t.phase + 1;
        setTimer({ ...t, phase: next, endsAt: Date.now() + t.phases[next].seconds * 1000 });
      } else {
        setTimer(null);
        t.onDone?.();
      }
    }, 0);
    return () => clearTimeout(id);
  }, [finished, t, signal]);

  const start = useCallback(
    (
      mode: 'rest' | 'effort',
      title: string,
      phases: { label?: string; seconds: number }[],
      onDone?: () => void,
      ref?: string,
    ) => {
      if (!phases.length || phases[0].seconds <= 0) return;
      setNow(Date.now());
      setTimer({ mode, title, phases, phase: 0, endsAt: Date.now() + phases[0].seconds * 1000, onDone, ref });
    },
    [],
  );

  const stop = useCallback(() => setTimer(null), []);

  const adjust = useCallback((deltaSec: number) => {
    setTimer((t) => {
      if (!t) return t;
      if (t.mode === 'rest') {
        const elapsed = t.phases[0].seconds * 1000 - (t.endsAt - Date.now());
        const total = clampRest(t.phases[0].seconds + deltaSec);
        return { ...t, phases: [{ seconds: total }], endsAt: Date.now() + total * 1000 - elapsed };
      }
      return { ...t, endsAt: t.endsAt + deltaSec * 1000 };
    });
  }, []);

  const togglePause = useCallback(() => {
    setTimer((t) => {
      if (!t) return t;
      if (t.pausedRemaining !== undefined) {
        return { ...t, endsAt: Date.now() + t.pausedRemaining, pausedRemaining: undefined };
      }
      return { ...t, pausedRemaining: Math.max(0, t.endsAt - Date.now()) };
    });
  }, []);

  const remaining = timer ? (timer.pausedRemaining ?? Math.max(0, timer.endsAt - now)) / 1000 : 0;
  return { timer, remaining, start, stop, adjust, togglePause };
}

export function TimerPanel({
  t,
  onRestTotalChange,
}: {
  t: ReturnType<typeof useWorkoutTimer>;
  onRestTotalChange?: (seconds: number) => void;
}) {
  const c = usePalette();
  const { timer, remaining } = t;
  if (!timer) return null;
  const phase = timer.phases[timer.phase];
  const isRest = timer.mode === 'rest';
  const total = phase.seconds;
  const progress = total > 0 ? 1 - remaining / total : 1;
  const paused = timer.pausedRemaining !== undefined;

  return (
    <View
      style={{
        backgroundColor: isRest ? c.accentSoft : c.doneSoft,
        borderRadius: radius.lg,
        padding: space.md,
        gap: space.sm,
      }}
      accessibilityLiveRegion="polite"
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T v="label">{isRest ? 'Repos' : 'Effort'}</T>
          <T v="small" numberOfLines={1}>
            {timer.title}
            {phase.label ? ` · ${phase.label}` : ''}
            {isRest ? ` · ${total} s` : ''}
          </T>
        </View>
        <T v="huge" style={{ color: isRest ? c.accent : c.done }}>
          {formatClock(remaining)}
        </T>
      </Row>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface, overflow: 'hidden' }}>
        <View
          style={{
            width: `${Math.min(100, Math.max(0, progress * 100))}%`,
            height: 6,
            backgroundColor: isRest ? c.accent : c.done,
          }}
        />
      </View>
      <Row>
        <IconButton
          label="−15"
          accessibilityLabel="Retirer 15 secondes"
          onPress={() => {
            t.adjust(-15);
            if (isRest) onRestTotalChange?.(clampRest(total - 15));
          }}
          size={56}
        />
        <IconButton
          label="+15"
          accessibilityLabel="Ajouter 15 secondes"
          onPress={() => {
            t.adjust(15);
            if (isRest) onRestTotalChange?.(clampRest(total + 15));
          }}
          size={56}
        />
        <Button
          title={paused ? 'Reprendre' : 'Pause'}
          variant="secondary"
          onPress={t.togglePause}
          style={{ flex: 1 }}
        />
        <Button title={isRest ? 'Passer' : 'Arrêter'} variant="secondary" onPress={t.stop} style={{ flex: 1 }} />
      </Row>
      {isRest && (
        <T v="small">
          Repos réglable de {REST_MIN} à {REST_MAX} s — mémorisé pour cet exercice.
        </T>
      )}
    </View>
  );
}
