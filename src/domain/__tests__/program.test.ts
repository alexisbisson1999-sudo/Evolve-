import { getProgram, DEFAULT_PROGRAM_ID } from '../../../content';
import { addDays } from '../dates';
import { mergeSynced, type SyncedData } from '../merge';
import {
  clampRest,
  estimateMinutes,
  programWeek,
  resolveForDate,
  resolveSession,
  sessionIdForDate,
  tempoSeconds,
  validateProgram,
} from '../program';
import type { Program } from '../types';

const p = getProgram(DEFAULT_PROGRAM_ID);
const START = '2026-11-02'; // un lundi
const opts = { maxPushups: 20 };

describe('planning', () => {
  it('suit le schéma A/M/B/M/A/M/O puis alterne A/B', () => {
    const week1 = Array.from({ length: 7 }, (_, i) => sessionIdForDate(p, START, addDays(START, i)));
    expect(week1).toEqual(['A', 'M', 'B', 'M', 'A', 'M', 'O']);
    const week2 = Array.from({ length: 7 }, (_, i) => sessionIdForDate(p, START, addDays(START, 7 + i)));
    expect(week2).toEqual(['B', 'M', 'A', 'M', 'B', 'M', 'O']);
  });

  it('gère une date de départ en milieu de semaine', () => {
    // départ un mercredi : mercredi = A, vendredi = B, lundi suivant = A
    expect(sessionIdForDate(p, '2026-11-04', '2026-11-04')).toBe('A');
    expect(sessionIdForDate(p, '2026-11-04', '2026-11-06')).toBe('B');
    expect(sessionIdForDate(p, '2026-11-04', '2026-11-09')).toBe('A');
    // avant le départ : l'alternance reste cohérente
    expect(sessionIdForDate(p, '2026-11-04', '2026-11-02')).toBe('B');
  });

  it('calcule la semaine et répète la semaine 4', () => {
    expect(programWeek(p, START, START)).toBe(1);
    expect(programWeek(p, START, addDays(START, 6))).toBe(1);
    expect(programWeek(p, START, addDays(START, 7))).toBe(2);
    expect(programWeek(p, START, addDays(START, 27))).toBe(4);
    expect(programWeek(p, START, addDays(START, 60))).toBe(4);
    expect(programWeek(p, START, addDays(START, -3))).toBe(1);
  });
});

describe('résolution des séances', () => {
  it('ajoute les 5 mouvements d’échauffement à chaque séance', () => {
    for (const id of Object.keys(p.sessions)) {
      const s = resolveSession(p, id, 1, opts);
      expect(s.blocks.filter((b) => b.section === 'warmup')).toHaveLength(5);
    }
  });

  it('fait progresser séries et répétitions', () => {
    const w1 = resolveSession(p, 'A', 1, opts).blocks.find((b) => b.exerciseId === 'squat-goblet')!;
    const w4 = resolveSession(p, 'A', 4, opts).blocks.find((b) => b.exerciseId === 'squat-goblet')!;
    expect([w1.sets, w1.reps, w1.tempo]).toEqual([3, 10, '3-1-1-0']);
    expect([w4.sets, w4.reps, w4.tempo]).toEqual([4, 12, '4-1-1-0']);
  });

  it('calcule les pompes en % du max', () => {
    const b = resolveSession(p, 'A', 1, { maxPushups: 20 }).blocks.find((x) => x.exerciseId === 'pompes')!;
    expect(b.reps).toBe(10);
    const low = resolveSession(p, 'M', 1, { maxPushups: 1 }).blocks.find((x) => x.exerciseId === 'pompes')!;
    expect(low.reps).toBe(1);
  });

  it('applique et borne les repos personnalisés', () => {
    const b = resolveSession(p, 'A', 1, { maxPushups: 20, restOverrides: { 'squat-goblet': 300 } }).blocks.find(
      (x) => x.exerciseId === 'squat-goblet',
    )!;
    expect(b.rest).toBe(120);
    expect(clampRest(10)).toBe(45);
  });

  it('estime des durées réalistes', () => {
    const a = resolveSession(p, 'A', 1, opts).estimatedMinutes;
    const m = resolveSession(p, 'M', 1, opts).estimatedMinutes;
    expect(a).toBeGreaterThan(25);
    expect(a).toBeLessThan(70);
    expect(m).toBeLessThan(a);
    expect(estimateMinutes([])).toBe(1);
    expect(tempoSeconds('3-1-1-0')).toBe(5);
    expect(tempoSeconds()).toBe(3);
  });

  it('résout la séance du jour', () => {
    expect(resolveForDate(p, START, START, opts)?.sessionId).toBe('A');
  });
});

describe('validation du contenu', () => {
  it('accepte le programme livré', () => {
    expect(() => validateProgram(p)).not.toThrow();
  });
  it('refuse un exercice inconnu', () => {
    const bad = JSON.parse(JSON.stringify(p)) as Program;
    bad.sessions.A.blocks[0].exercise = 'nexiste-pas';
    expect(() => validateProgram(bad)).toThrow(/exercice inconnu/);
  });
});

describe('fusion pour la synchro', () => {
  const base = (): SyncedData => ({
    settings: { ...({} as SyncedData['settings']), maxPushups: 10 } as SyncedData['settings'],
    settingsUpdatedAt: 1,
    loads: {},
    restOverrides: {},
    prefsUpdatedAt: 1,
    history: [],
    measurements: [],
    deleted: {},
  });

  it('fusionne les historiques et respecte les suppressions', () => {
    const local = base();
    const remote = base();
    local.measurements = [{ id: 'a', date: '2026-11-01', weight: 89.5, updatedAt: 1 }];
    remote.measurements = [
      { id: 'b', date: '2026-11-03', weight: 89, updatedAt: 2 },
      { id: 'c', date: '2026-11-02', weight: 89.2, updatedAt: 2 },
    ];
    local.deleted = { c: 5 };
    const m = mergeSynced(local, remote);
    expect(m.measurements.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('garde les réglages les plus récents', () => {
    const local = base();
    const remote = base();
    remote.settings = { ...remote.settings, maxPushups: 25 };
    remote.settingsUpdatedAt = 10;
    expect(mergeSynced(local, remote).settings.maxPushups).toBe(25);
  });
});

describe('programme « Remise en forme en douceur »', () => {
  const d = getProgram('remise-en-forme-douce');
  it('suit le planning renfo A/B, marche, mobilité', () => {
    const w = Array.from({ length: 14 }, (_, i) => sessionIdForDate(d, START, addDays(START, i)));
    expect(w).toEqual(['A', 'W', 'B', 'W', 'A', 'W', 'D', 'B', 'W', 'A', 'W', 'B', 'W', 'D']);
  });
  it('tient dans 30 minutes par jour', () => {
    for (const id of Object.keys(d.sessions)) {
      for (const week of [1, 2, 3, 4]) {
        expect(resolveSession(d, id, week, opts).estimatedMinutes).toBeLessThanOrEqual(32);
      }
    }
  });
  it('n’utilise aucune charge ni pompe', () => {
    expect(Object.values(d.exercises).some((e) => e.usesLoad)).toBe(false);
    expect(JSON.stringify(d.sessions)).not.toContain('repsPctMax');
  });
});
