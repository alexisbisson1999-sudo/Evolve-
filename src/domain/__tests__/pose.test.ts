import { getPose, listPrograms, pickMotivation } from '../../../content';
import { LEN, poseAt, solvePose } from '../pose';
import { tempoShort } from '../program';

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('pictogrammes', () => {
  const ids = listPrograms().flatMap((p) => Object.keys(p.exercises));

  it('existe pour chaque exercice du programme', () => {
    for (const id of ids) expect(getPose(id)).toBeDefined();
  });

  it('garde des membres de longueur constante pendant l’animation', () => {
    for (const id of ids) {
      const anim = getPose(id)!;
      for (const ms of [0, 400, 900, 1700, 2600]) {
        const sk = solvePose(poseAt(anim, ms));
        expect(dist(sk.arm.root, sk.arm.mid)).toBeCloseTo(LEN.upper, 1);
        expect(dist(sk.arm.mid, sk.arm.end)).toBeCloseTo(LEN.fore, 1);
        expect(dist(sk.leg.root, sk.leg.mid)).toBeCloseTo(LEN.thigh, 1);
        expect(dist(sk.leg.mid, sk.leg.end)).toBeCloseTo(LEN.shin, 1);
      }
    }
  });

  it('garde les pieds au sol pendant un squat', () => {
    const anim = getPose('squat-goblet')!;
    for (const ms of [0, 500, 1000, 1500]) {
      const sk = solvePose(poseAt(anim, ms));
      expect(sk.leg.end[0]).toBeCloseTo(62, 0);
      expect(sk.leg.end[1]).toBeCloseTo(90, 0);
    }
  });
});

describe('textes', () => {
  it('rend le tempo lisible', () => {
    expect(tempoShort('3-1-1-0')).toBe('↓3s  ⏸\uFE0E1s  ↑1s');
    expect(tempoShort('2-0-1-2')).toBe('↓2s  ↑1s  ⏸\uFE0E2s');
    expect(tempoShort()).toBeNull();
  });
  it('fournit des phrases d’encouragement', () => {
    expect(pickMotivation('rest').length).toBeGreaterThan(5);
    expect(pickMotivation('rest', 3)).toBe(pickMotivation('rest', 3));
  });
});

describe('durées', () => {
  it('affiche les durées longues en minutes', () => {
    const { durationLabel } = jest.requireActual('../program');
    expect(durationLabel(45)).toBe('45 s');
    expect(durationLabel(90)).toBe('1 min 30');
    expect(durationLabel(1200)).toBe('20 min');
  });
});
