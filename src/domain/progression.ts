import type { Feeling, Program, WorkoutLog } from './types';

/**
 * Progression automatique (sans IA) : à la fin d'une séance, propose d'ajuster
 * les charges et le max de pompes à partir des séries faites et du ressenti.
 *
 * Règles (volontairement prudentes, pensées pour une reprise) :
 * - Toutes les séries faites + séance « facile »            → on monte d'un cran.
 * - Toutes les séries faites + « correct » 2 fois de suite   → on monte d'un cran (double progression).
 * - Séance « dure » 2 fois de suite + séries non terminées   → on redescend d'un cran.
 * - Sinon                                                    → on garde.
 * Sans ressenti donné, la séance compte comme « correct ».
 */

export interface Adjustment {
  kind: 'load' | 'pushups';
  exerciseId: string;
  name: string;
  from: number;
  to: number;
  reason: string;
}

export const DEFAULT_LOAD_STEP = 2.5;
export const PUSHUPS_EXERCISE = 'pompes';

interface Outing {
  complete: boolean;
  feeling: Feeling;
  load?: number;
}

/** Les dernières séances (de la plus récente à la plus ancienne) contenant cet exercice. */
function outings(history: WorkoutLog[], exerciseId: string, limit = 2): Outing[] {
  const res: Outing[] = [];
  const sorted = [...history].sort((a, b) => b.startedAt - a.startedAt);
  for (const log of sorted) {
    const blocks = log.blocks.filter((b) => b.exerciseId === exerciseId && b.section === 'main');
    if (!blocks.length) continue;
    res.push({
      complete: blocks.every((b) => b.setsDone >= b.setsTotal),
      feeling: log.feeling ?? 'ok',
      load: blocks[0].load,
    });
    if (res.length >= limit) break;
  }
  return res;
}

type Verdict = 'up' | 'down' | null;

function verdict(o: Outing[], sameLoad: (a: Outing, b: Outing) => boolean): { v: Verdict; reason: string } {
  const [last, prev] = o;
  if (!last) return { v: null, reason: '' };
  if (last.complete && last.feeling === 'easy') return { v: 'up', reason: 'Toutes les séries faites, séance facile' };
  if (last.complete && last.feeling === 'ok' && prev && prev.complete && prev.feeling !== 'hard' && sameLoad(last, prev)) {
    return { v: 'up', reason: 'Deux séances réussies à cette charge' };
  }
  if (!last.complete && last.feeling === 'hard' && prev && prev.feeling === 'hard') {
    return { v: 'down', reason: 'Deux séances dures de suite : on consolide' };
  }
  return { v: null, reason: '' };
}

/** Ajustements proposés après la séance `log` (déjà présente dans `history`). */
export function computeAdjustments(
  program: Program,
  history: WorkoutLog[],
  log: WorkoutLog,
  loads: Record<string, number>,
  maxPushups: number,
): Adjustment[] {
  const out: Adjustment[] = [];
  const seen = new Set<string>();

  for (const block of log.blocks) {
    if (block.section !== 'main' || seen.has(block.exerciseId)) continue;
    seen.add(block.exerciseId);
    const ex = program.exercises[block.exerciseId];
    if (!ex) continue;

    if (ex.usesLoad) {
      const current = loads[block.exerciseId] ?? block.load ?? ex.defaultLoad ?? 0;
      const step = ex.loadStep ?? DEFAULT_LOAD_STEP;
      const { v, reason } = verdict(outings(history, block.exerciseId), (a, b) => a.load === b.load);
      if (!v) continue;
      const to = Math.max(0, Math.round((current + (v === 'up' ? step : -step)) * 100) / 100);
      if (to !== current) out.push({ kind: 'load', exerciseId: block.exerciseId, name: ex.name, from: current, to, reason });
    } else if (block.exerciseId === PUSHUPS_EXERCISE) {
      const { v, reason } = verdict(outings(history, block.exerciseId), () => true);
      if (!v) continue;
      const to = Math.max(1, maxPushups + (v === 'up' ? 1 : -1));
      if (to !== maxPushups) out.push({ kind: 'pushups', exerciseId: block.exerciseId, name: 'Max de pompes', from: maxPushups, to, reason });
    }
  }
  return out;
}
