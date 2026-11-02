import { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { formatClock } from '../domain/dates';
import { clampRest } from '../domain/program';
import { useEndSignal } from '../services/feedback';
import { radius, space, usePalette } from '../theme';
import { Button, IconButton, Row, T } from './ui';

export type TimerMode = 'rest' | 'effort' | 'free';

/**
 * Chrono basé sur l'heure de fin (et non un compteur) : reste juste même si
 * l'app passe en arrière-plan quelques instants.
 */
export type TimerState =
  | null
  | {
      mode: TimerMode;
      title: string;
      /** Phrase d'encouragement affichée pendant le chrono. */
      quote?: string;
      /** Phases successives (ex. côté gauche puis côté droit), en secondes. */
      phases: { label?: string; seconds: number }[];
      phase: number;
      endsAt: number; // ms
      pausedRemaining?: number; // ms si en pause
      onDone?: () => void;
      /** Identifiant de l'exercice concerné (pour mémoriser le repos). */
      ref?: string;
    };

export interface StartOptions {
  mode: TimerMode;
  title: string;
  phases: { label?: string; seconds: number }[];
  quote?: string;
  onDone?: () => void;
  ref?: string;
}

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

  const start = useCallback((o: StartOptions) => {
    if (!o.phases.length || o.phases[0].seconds <= 0) return;
    setNow(Date.now());
    setTimer({ ...o, phase: 0, endsAt: Date.now() + o.phases[0].seconds * 1000 });
  }, []);

  const stop = useCallback(() => setTimer(null), []);

  const adjust = useCallback((deltaSec: number) => {
    setTimer((t) => {
      if (!t) return t;
      const cur = t.phases[t.phase].seconds;
      const total = t.mode === 'rest' ? clampRest(cur + deltaSec) : Math.max(5, cur + deltaSec);
      const applied = total - cur;
      const phases = t.phases.map((p, i) => (i === t.phase ? { ...p, seconds: total } : p));
      if (t.pausedRemaining !== undefined) {
        return { ...t, phases, pausedRemaining: Math.max(1000, t.pausedRemaining + applied * 1000) };
      }
      return { ...t, phases, endsAt: t.endsAt + applied * 1000 };
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

const LABELS: Record<TimerMode, string> = { rest: 'Repos', effort: 'Effort', free: 'Chrono' };

/** Panneau du chrono, en bas de l'écran (zone du pouce). */
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
  const tint = isRest ? c.accent : c.done;
  const total = phase.seconds;
  const progress = total > 0 ? 1 - remaining / total : 1;
  const paused = timer.pausedRemaining !== undefined;

  const change = (delta: number) => {
    t.adjust(delta);
    if (isRest) onRestTotalChange?.(clampRest(total + delta));
  };

  return (
    <View
      style={{ backgroundColor: isRest ? c.accentSoft : c.doneSoft, borderRadius: radius.lg, padding: space.md, gap: space.sm }}
      accessibilityLiveRegion="polite"
    >
      <Row gap={space.md}>
        <T v="huge" style={{ color: tint, fontSize: 60, lineHeight: 66 }}>
          {formatClock(remaining)}
        </T>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="label" style={{ color: tint }}>
            {LABELS[timer.mode]}
            {phase.label ? ` · ${phase.label}` : ''}
          </T>
          <T v="body" style={{ fontWeight: '700' }} numberOfLines={2}>
            {timer.title}
          </T>
        </View>
      </Row>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surface, overflow: 'hidden' }}>
        <View style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, height: 8, backgroundColor: tint }} />
      </View>
      {timer.quote ? (
        <T v="muted" style={{ fontStyle: 'italic' }} numberOfLines={2}>
          {timer.quote}
        </T>
      ) : null}
      <Row>
        <IconButton label="−15" accessibilityLabel="Retirer 15 secondes" onPress={() => change(-15)} size={60} />
        <IconButton label="+15" accessibilityLabel="Ajouter 15 secondes" onPress={() => change(15)} size={60} />
        {!isRest && (
          <Button title={paused ? 'Reprendre' : 'Pause'} variant="secondary" onPress={t.togglePause} style={{ flex: 1, minHeight: 60 }} />
        )}
        <Button title={isRest ? 'Passer' : 'Arrêter'} variant="secondary" onPress={t.stop} style={{ flex: 1, minHeight: 60 }} />
      </Row>
    </View>
  );
}
