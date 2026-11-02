import { diffDays, addDays, weekdayOf } from './dates';
import type {
  BlockDef,
  Program,
  ResolvedBlock,
  ResolvedSession,
  WeekParams,
  Weekday,
} from './types';

/* ---------- Validation du contenu ---------- */

export class ProgramError extends Error {}

/**
 * Vérifie la cohérence d'un programme (références d'exercices, paramètres, planning).
 * Lève une ProgramError explicite : utile quand on ajoute un nouveau fichier JSON.
 */
export function validateProgram(p: Program): Program {
  const fail = (msg: string) => {
    throw new ProgramError(`Programme « ${p?.id ?? '?'} » invalide : ${msg}`);
  };
  if (!p || typeof p !== 'object') fail('contenu vide');
  if (!p.id || !p.name) fail('id et name sont obligatoires');
  if (!Number.isInteger(p.weeks) || p.weeks < 1) fail('weeks doit être un entier ≥ 1');

  const checkBlock = (b: BlockDef, where: string) => {
    if (!p.exercises[b.exercise]) fail(`${where} : exercice inconnu « ${b.exercise} »`);
    if (!Array.isArray(b.params) || b.params.length === 0) fail(`${where} : params vide`);
    b.params.forEach((w, i) => {
      if (!Number.isInteger(w.sets) || w.sets < 1) fail(`${where} semaine ${i + 1} : sets invalide`);
      const modes = [w.reps, w.repsPctMax, w.duration].filter((v) => v !== undefined).length;
      if (modes !== 1) fail(`${where} semaine ${i + 1} : préciser exactement un de reps, repsPctMax, duration`);
      if (typeof w.rest !== 'number' || w.rest < 0) fail(`${where} semaine ${i + 1} : rest invalide`);
    });
  };

  p.warmup.blocks.forEach((b, i) => checkBlock(b, `échauffement #${i + 1}`));
  Object.entries(p.sessions).forEach(([id, s]) => {
    if (s.id !== id) fail(`séance ${id} : id incohérent`);
    s.blocks.forEach((b, i) => checkBlock(b, `séance ${id} bloc #${i + 1}`));
  });

  (['0', '1', '2', '3', '4', '5', '6'] as Weekday[]).forEach((wd) => {
    const v = p.schedule.weekdays[wd];
    if (v === undefined) fail(`planning : jour ${wd} manquant`);
    if (!v) return;
    if (v.startsWith('rotation:')) {
      const rot = p.schedule.rotations[v.slice(9)];
      if (!rot?.length) fail(`planning : rotation « ${v} » inconnue`);
      rot.forEach((sid) => !p.sessions[sid] && fail(`rotation : séance « ${sid} » inconnue`));
    } else if (!p.sessions[v]) fail(`planning : séance « ${v} » inconnue`);
  });
  return p;
}

/* ---------- Semaines ---------- */

/** Semaine absolue depuis la date de départ (1 = première semaine ; ≤0 avant le départ → 1). */
export function absoluteWeek(startDate: string, date: string): number {
  const d = diffDays(startDate, date);
  if (d < 0) return 1;
  return Math.floor(d / 7) + 1;
}

/** Semaine du programme : la dernière semaine se répète si repeatLastWeek. */
export function programWeek(p: Program, startDate: string, date: string): number {
  const abs = absoluteWeek(startDate, date);
  return p.repeatLastWeek ? Math.min(abs, p.weeks) : ((abs - 1) % p.weeks) + 1;
}

function paramsForWeek(b: BlockDef, week: number): WeekParams {
  return b.params[Math.min(week, b.params.length) - 1];
}

/* ---------- Planning ---------- */

/**
 * Séance prévue pour une date. Les rotations (ex. A/B) alternent de façon continue
 * depuis la date de départ : lun A, mer B, ven A, puis lun B, mer A, ven B…
 */
export function sessionIdForDate(p: Program, startDate: string, date: string): string | null {
  const entry = p.schedule.weekdays[String(weekdayOf(date)) as Weekday];
  if (!entry) return null;
  if (!entry.startsWith('rotation:')) return entry;

  const rotation = p.schedule.rotations[entry.slice(9)];
  const isRotationDay = (iso: string) =>
    p.schedule.weekdays[String(weekdayOf(iso)) as Weekday] === entry;

  const delta = diffDays(startDate, date);
  let count = 0;
  if (delta >= 0) {
    for (let i = 0; i < delta; i++) if (isRotationDay(addDays(startDate, i))) count++;
  } else {
    for (let i = delta; i < 0; i++) if (isRotationDay(addDays(startDate, i))) count--;
  }
  const n = rotation.length;
  return rotation[((count % n) + n) % n];
}

/* ---------- Résolution ---------- */

export interface ResolveOptions {
  maxPushups: number;
  /** Repos personnalisés par exercice (secondes). */
  restOverrides?: Record<string, number>;
}

export const REST_MIN = 45;
export const REST_MAX = 120;

export function clampRest(sec: number): number {
  return Math.max(REST_MIN, Math.min(REST_MAX, Math.round(sec)));
}

function resolveBlock(
  p: Program,
  b: BlockDef,
  week: number,
  section: 'warmup' | 'main',
  index: number,
  opts: ResolveOptions,
): ResolvedBlock {
  const w = paramsForWeek(b, week);
  let reps = w.reps;
  if (w.repsPctMax !== undefined) {
    reps = Math.max(1, Math.round(opts.maxPushups * w.repsPctMax));
  }
  const override = opts.restOverrides?.[b.exercise];
  const rest = w.rest > 0 ? clampRest(override ?? w.rest) : 0;
  return {
    key: `${section}-${index}-${b.exercise}`,
    section,
    exerciseId: b.exercise,
    exercise: p.exercises[b.exercise],
    sets: w.sets,
    reps,
    duration: w.duration,
    perSide: !!b.perSide,
    sideLabel: b.sideLabel ?? 'par côté',
    tempo: w.tempo,
    rest,
    repsPctMax: w.repsPctMax,
  };
}

/** Somme des chiffres du tempo (« 3-1-1-0 » → 5 s par répétition). Défaut 3 s. */
export function tempoSeconds(tempo?: string): number {
  if (!tempo) return 3;
  const total = tempo
    .split('-')
    .map((x) => (/^\d+$/.test(x) ? Number(x) : 1))
    .reduce((a, b) => a + b, 0);
  return total > 0 ? total : 3;
}

const TRANSITION_SEC = 20;

export function estimateBlockSeconds(b: ResolvedBlock): number {
  const sides = b.perSide ? 2 : 1;
  const work = b.duration !== undefined ? b.duration * sides : (b.reps ?? 0) * sides * tempoSeconds(b.tempo);
  return b.sets * work + Math.max(0, b.sets - 1) * b.rest + TRANSITION_SEC;
}

export function estimateMinutes(blocks: ResolvedBlock[]): number {
  const total = blocks.reduce((acc, b, i) => {
    // Le repos après la dernière série compte comme transition, sauf en fin de séance.
    const restAfter = i < blocks.length - 1 && b.sets > 0 ? b.rest : 0;
    return acc + estimateBlockSeconds(b) + restAfter;
  }, 0);
  return Math.max(1, Math.round(total / 60));
}

export function resolveSession(
  p: Program,
  sessionId: string,
  week: number,
  opts: ResolveOptions,
  absWeek = week,
): ResolvedSession {
  const session = p.sessions[sessionId];
  if (!session) throw new ProgramError(`Séance inconnue : ${sessionId}`);
  const blocks: ResolvedBlock[] = [];
  if (session.warmup) {
    p.warmup.blocks.forEach((b, i) => blocks.push(resolveBlock(p, b, week, 'warmup', i, opts)));
  }
  session.blocks.forEach((b, i) => blocks.push(resolveBlock(p, b, week, 'main', i, opts)));
  return {
    sessionId,
    session,
    week,
    absoluteWeek: absWeek,
    blocks,
    estimatedMinutes: estimateMinutes(blocks),
  };
}

export function resolveForDate(
  p: Program,
  startDate: string,
  date: string,
  opts: ResolveOptions,
): ResolvedSession | null {
  const sid = sessionIdForDate(p, startDate, date);
  if (!sid) return null;
  return resolveSession(p, sid, programWeek(p, startDate, date), opts, absoluteWeek(startDate, date));
}

/* ---------- Libellés ---------- */

export function targetLabel(b: ResolvedBlock): string {
  const side = b.perSide ? ` ${b.sideLabel}` : '';
  if (b.duration !== undefined) return `${b.sets} × ${b.duration} s${side}`;
  return `${b.sets} × ${b.reps}${side}`;
}
