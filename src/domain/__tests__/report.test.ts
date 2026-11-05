import { coachReport } from '../report';
import type { WorkoutLog } from '../types';

const log = (date: string, extra: Partial<WorkoutLog> = {}): WorkoutLog => ({
  id: date,
  programId: 'p',
  sessionId: 'A',
  sessionName: 'Bas du corps & ventre',
  date,
  week: 1,
  startedAt: Date.parse(date),
  endedAt: Date.parse(date) + 1,
  durationSec: 1500,
  updatedAt: 1,
  blocks: [
    { key: 'a', exerciseId: 'x', name: 'X', section: 'main', setsDone: 2, setsTotal: 2, validated: true },
    { key: 'b', exerciseId: 'y', name: 'Y', section: 'main', setsDone: 0, setsTotal: 2, validated: false },
  ],
  ...extra,
});

describe('bilan pour le coach', () => {
  it('résume la semaine : séances, ressentis, commentaires, poids', () => {
    const text = coachReport({
      programName: 'Remise en forme en douceur',
      today: '2026-11-08',
      history: [
        log('2026-10-20'),
        log('2026-11-03', { feeling: 'hard', comment: 'Gêne derrière la cuisse' }),
        log('2026-11-05', { feeling: 'ok' }),
      ],
      measurements: [
        { id: '1', date: '2026-10-30', weight: 80, updatedAt: 1 },
        { id: '2', date: '2026-11-07', weight: 79.4, waist: 98, updatedAt: 1 },
      ],
      goalWeight: 75,
    });
    expect(text).toContain('2 séances');
    expect(text).toContain('😮‍💨 dur');
    expect(text).toContain('« Gêne derrière la cuisse »');
    expect(text).toContain('1/2 exercices');
    expect(text).toContain('79,4 kg');
    expect(text).toContain('-0,6 kg');
    expect(text).toContain('98 cm');
    expect(text).not.toContain('20 octobre');
  });

  it('reste lisible sans séance ni mesure', () => {
    const text = coachReport({ programName: 'P', today: '2026-11-08', history: [], measurements: [], goalWeight: 75 });
    expect(text).toContain('Aucune séance');
  });
});
