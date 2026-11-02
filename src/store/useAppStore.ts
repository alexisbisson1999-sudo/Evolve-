import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_PROGRAM_ID } from '../../content';
import { mondayOf, todayISO } from '../domain/dates';
import type { SyncedData } from '../domain/merge';
import { clampRest } from '../domain/program';
import type {
  ActiveWorkout,
  Feeling,
  LoggedBlock,
  Measurement,
  ResolvedSession,
  Settings,
  WorkoutLog,
} from '../domain/types';

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const defaultSettings = (): Settings => ({
  programId: DEFAULT_PROGRAM_ID,
  startDate: mondayOf(todayISO()),
  maxPushups: 15,
  reminderEnabled: false,
  reminderHour: 18,
  reminderMinute: 0,
  soundEnabled: true,
  vibrationEnabled: true,
  theme: 'system',
  heightCm: 177,
  goalWeight: 85,
  goalWaist: undefined,
});

interface State extends SyncedData {
  active: ActiveWorkout | null;
  lastSyncAt: number | null;
  /** Horodatage de la dernière modification locale (déclenche la synchro). */
  dirtyAt: number;
}

interface Actions {
  updateSettings: (patch: Partial<Settings>) => void;
  setLoad: (exerciseId: string, kg: number) => void;
  setRestOverride: (exerciseId: string, sec: number) => void;

  saveMeasurement: (m: { date: string; weight?: number; waist?: number }) => void;
  deleteMeasurement: (id: string) => void;

  startWorkout: (s: ResolvedSession, date: string, loads: Record<string, number>) => void;
  toggleSet: (blockKey: string, index: number) => void;
  setBlockLoad: (blockKey: string, exerciseId: string, kg: number) => void;
  setBlockValidated: (blockKey: string, validated: boolean) => void;
  finishWorkout: (s: ResolvedSession, validateAll: boolean) => WorkoutLog | null;
  cancelWorkout: () => void;
  deleteLog: (id: string) => void;
  setLogFeeling: (id: string, feeling: Feeling) => void;
  setLogComment: (id: string, comment: string) => void;

  getSynced: () => SyncedData;
  applySynced: (d: SyncedData) => void;
  markSynced: (at: number) => void;
  resetAll: () => void;
}

const initialData = (): State => ({
  settings: defaultSettings(),
  settingsUpdatedAt: 0,
  loads: {},
  restOverrides: {},
  prefsUpdatedAt: 0,
  history: [],
  measurements: [],
  deleted: {},
  active: null,
  lastSyncAt: null,
  dirtyAt: 0,
});

export const useAppStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialData(),

      updateSettings: (patch) => {
        const now = Date.now();
        set((s) => ({ settings: { ...s.settings, ...patch }, settingsUpdatedAt: now, dirtyAt: now }));
      },

      setLoad: (exerciseId, kg) => {
        const now = Date.now();
        set((s) => ({ loads: { ...s.loads, [exerciseId]: kg }, prefsUpdatedAt: now, dirtyAt: now }));
      },

      setRestOverride: (exerciseId, sec) => {
        const now = Date.now();
        set((s) => ({
          restOverrides: { ...s.restOverrides, [exerciseId]: clampRest(sec) },
          prefsUpdatedAt: now,
          dirtyAt: now,
        }));
      },

      saveMeasurement: ({ date, weight, waist }) => {
        const now = Date.now();
        set((s) => {
          const existing = s.measurements.find((m) => m.date === date);
          const next: Measurement = existing
            ? {
                ...existing,
                weight: weight ?? existing.weight,
                waist: waist ?? existing.waist,
                updatedAt: now,
              }
            : { id: newId(), date, weight, waist, updatedAt: now };
          const others = s.measurements.filter((m) => m.id !== next.id);
          return {
            measurements: [...others, next].sort((a, b) => a.date.localeCompare(b.date)),
            dirtyAt: now,
          };
        });
      },

      deleteMeasurement: (id) => {
        const now = Date.now();
        set((s) => ({
          measurements: s.measurements.filter((m) => m.id !== id),
          deleted: { ...s.deleted, [id]: now },
          dirtyAt: now,
        }));
      },

      startWorkout: (session, date, loads) => {
        const blocks: ActiveWorkout['blocks'] = {};
        for (const b of session.blocks) {
          blocks[b.key] = {
            setsDone: Array(b.sets).fill(false),
            validated: false,
            load: b.exercise.usesLoad ? (loads[b.exerciseId] ?? b.exercise.defaultLoad ?? 0) : undefined,
          };
        }
        set({
          active: {
            id: newId(),
            programId: get().settings.programId,
            sessionId: session.sessionId,
            date,
            week: session.week,
            startedAt: Date.now(),
            blocks,
          },
        });
      },

      toggleSet: (blockKey, index) =>
        set((s) => {
          if (!s.active) return {};
          const b = s.active.blocks[blockKey];
          if (!b) return {};
          const setsDone = [...b.setsDone];
          setsDone[index] = !setsDone[index];
          return {
            active: { ...s.active, blocks: { ...s.active.blocks, [blockKey]: { ...b, setsDone } } },
          };
        }),

      setBlockLoad: (blockKey, exerciseId, kg) => {
        const v = Math.max(0, Math.round(kg * 4) / 4);
        set((s) => {
          if (!s.active) return {};
          const b = s.active.blocks[blockKey];
          return {
            active: { ...s.active, blocks: { ...s.active.blocks, [blockKey]: { ...b, load: v } } },
          };
        });
        get().setLoad(exerciseId, v);
      },

      setBlockValidated: (blockKey, validated) =>
        set((s) => {
          if (!s.active) return {};
          const b = s.active.blocks[blockKey];
          const setsDone = validated && b.setsDone.every((x) => !x) ? b.setsDone.map(() => true) : b.setsDone;
          return {
            active: {
              ...s.active,
              blocks: { ...s.active.blocks, [blockKey]: { ...b, validated, setsDone } },
            },
          };
        }),

      finishWorkout: (session, validateAll) => {
        const { active } = get();
        if (!active) return null;
        const now = Date.now();
        const blocks: LoggedBlock[] = session.blocks.map((b) => {
          const st = active.blocks[b.key] ?? { setsDone: [], validated: false };
          const validated = validateAll || st.validated;
          const done = st.setsDone.filter(Boolean).length;
          return {
            key: b.key,
            exerciseId: b.exerciseId,
            name: b.exercise.name,
            section: b.section,
            setsDone: validateAll && done === 0 ? b.sets : done,
            setsTotal: b.sets,
            validated,
            load: st.load,
          };
        });
        const log: WorkoutLog = {
          id: active.id,
          programId: active.programId,
          sessionId: active.sessionId,
          sessionName: session.session.name,
          date: active.date,
          week: active.week,
          startedAt: active.startedAt,
          endedAt: now,
          durationSec: Math.round((now - active.startedAt) / 1000),
          blocks,
          updatedAt: now,
        };
        set((s) => ({ history: [log, ...s.history], active: null, dirtyAt: now }));
        return log;
      },

      cancelWorkout: () => set({ active: null }),

      setLogComment: (id, comment) => {
        const now = Date.now();
        const text = comment.trim().slice(0, 2000);
        set((s) => ({
          history: s.history.map((h) => (h.id === id ? { ...h, comment: text || undefined, updatedAt: now } : h)),
          dirtyAt: now,
        }));
      },

      setLogFeeling: (id, feeling) => {
        const now = Date.now();
        set((s) => ({
          history: s.history.map((h) => (h.id === id ? { ...h, feeling, updatedAt: now } : h)),
          dirtyAt: now,
        }));
      },

      deleteLog: (id) => {
        const now = Date.now();
        set((s) => ({
          history: s.history.filter((h) => h.id !== id),
          deleted: { ...s.deleted, [id]: now },
          dirtyAt: now,
        }));
      },

      getSynced: () => {
        const s = get();
        return {
          settings: s.settings,
          settingsUpdatedAt: s.settingsUpdatedAt,
          loads: s.loads,
          restOverrides: s.restOverrides,
          prefsUpdatedAt: s.prefsUpdatedAt,
          history: s.history,
          measurements: s.measurements,
          deleted: s.deleted,
        };
      },

      applySynced: (d) => set({ ...d }),

      markSynced: (at) => set({ lastSyncAt: at }),

      resetAll: () => set({ ...initialData(), dirtyAt: Date.now() }),
    }),
    {
      name: 'evolve-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ settings, settingsUpdatedAt, loads, restOverrides, prefsUpdatedAt, history, measurements, deleted, active, lastSyncAt, dirtyAt }) => ({
        settings, settingsUpdatedAt, loads, restOverrides, prefsUpdatedAt, history, measurements, deleted, active, lastSyncAt, dirtyAt,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, settings: { ...defaultSettings(), ...(p.settings ?? {}) } };
      },
    },
  ),
);

/** Vrai une fois les données locales chargées. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useAppStore.persist.onFinishHydration(cb),
    () => useAppStore.persist.hasHydrated(),
    () => false,
  );
}
