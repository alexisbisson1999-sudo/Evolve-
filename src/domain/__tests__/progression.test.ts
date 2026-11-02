import { DEFAULT_PROGRAM_ID, getProgram } from '../../../content';
import { computeAdjustments } from '../progression';
import type { Feeling, WorkoutLog } from '../types';

const program = getProgram(DEFAULT_PROGRAM_ID);
let t = 0;

function log(feeling: Feeling | undefined, opts: { complete?: boolean; load?: number } = {}): WorkoutLog {
  const complete = opts.complete ?? true;
  t += 1000;
  return {
    id: `l${t}`,
    programId: program.id,
    sessionId: 'A',
    sessionName: 'A',
    date: '2026-11-02',
    week: 1,
    startedAt: t,
    endedAt: t + 1,
    durationSec: 1,
    feeling,
    updatedAt: t,
    blocks: [
      { key: 'k1', exerciseId: 'squat-goblet', name: 'Squat goblet', section: 'main', setsDone: complete ? 3 : 2, setsTotal: 3, validated: true, load: opts.load ?? 12 },
      { key: 'k2', exerciseId: 'pompes', name: 'Pompes', section: 'main', setsDone: complete ? 3 : 1, setsTotal: 3, validated: true },
      { key: 'w', exerciseId: 'cercles-bras', name: 'Cercles', section: 'warmup', setsDone: 1, setsTotal: 1, validated: true },
    ],
  };
}

const run = (history: WorkoutLog[]) =>
  computeAdjustments(program, history, history[history.length - 1], { 'squat-goblet': 12 }, 15);

describe('progression automatique', () => {
  it('monte après une séance facile réussie', () => {
    const adj = run([log('easy')]);
    expect(adj).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ exerciseId: 'squat-goblet', from: 12, to: 14.5 }),
        expect.objectContaining({ kind: 'pushups', from: 15, to: 16 }),
      ]),
    );
  });

  it('ne change rien après une seule séance correcte', () => {
    expect(run([log('ok')])).toEqual([]);
  });

  it('monte après deux séances correctes à la même charge', () => {
    expect(run([log('ok'), log(undefined)]).map((a) => a.to)).toEqual([14.5, 16]);
  });

  it('ne monte pas si la charge a changé entre les deux séances', () => {
    expect(run([log('ok', { load: 10 }), log('ok')]).filter((a) => a.kind === 'load')).toEqual([]);
  });

  it('redescend après deux séances dures non terminées', () => {
    expect(run([log('hard'), log('hard', { complete: false })]).map((a) => a.to)).toEqual([9.5, 14]);
  });

  it('garde la charge après une seule séance dure', () => {
    expect(run([log('ok'), log('hard', { complete: false })])).toEqual([]);
  });
});
