import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { getProgram } from '../../content';
import { todayISO } from '../domain/dates';
import { programWeek, absoluteWeek, resolveSession, resolveForDate } from '../domain/program';
import { useAppStore } from '../store/useAppStore';

export function useProgram() {
  const programId = useAppStore((s) => s.settings.programId);
  return useMemo(() => getProgram(programId), [programId]);
}

/** Date du jour, mise à jour au retour au premier plan et à minuit. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setToday(todayISO()));
    const id = setInterval(() => setToday(todayISO()), 60_000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, []);
  return today;
}

export function useResolveOptions() {
  const maxPushups = useAppStore((s) => s.settings.maxPushups);
  const restOverrides = useAppStore((s) => s.restOverrides);
  return useMemo(() => ({ maxPushups, restOverrides }), [maxPushups, restOverrides]);
}

export function useSessionForDate(date: string) {
  const program = useProgram();
  const startDate = useAppStore((s) => s.settings.startDate);
  const opts = useResolveOptions();
  return useMemo(() => resolveForDate(program, startDate, date, opts), [program, startDate, date, opts]);
}

/** Séance donnée, à la semaine courante du programme. */
export function useSessionThisWeek(sessionId: string, week?: number) {
  const program = useProgram();
  const startDate = useAppStore((s) => s.settings.startDate);
  const opts = useResolveOptions();
  const today = useToday();
  return useMemo(() => {
    if (!program.sessions[sessionId]) return null;
    const w = week ?? programWeek(program, startDate, today);
    return resolveSession(program, sessionId, w, opts, week ?? absoluteWeek(startDate, today));
  }, [program, sessionId, week, startDate, today, opts]);
}
