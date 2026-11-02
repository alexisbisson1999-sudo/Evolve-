/**
 * Squelette des pictogrammes animés : interpolation des poses et calcul des articulations.
 * Format des poses : voir scripts/build-poses.js et content/poses.json.
 */

export type Vec = [number, number];
type JointRef = 'head' | 'hip' | 'shoulder' | 'knee' | 'ankle';
type Bend = 'front' | 'back' | 'up' | 'down';

export type LimbSpec =
  | { a: [number, number] }
  | { to: Vec | JointRef; off?: Vec; bend?: Bend };

export interface PropSpec {
  type: 'box' | 'wall';
  x: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface PoseSpec {
  hip: Vec;
  t: number;
  head?: number;
  arch?: number;
  arm?: LimbSpec;
  arm2?: LimbSpec;
  leg?: LimbSpec;
  leg2?: LimbSpec;
  props?: PropSpec[];
}

export interface PoseAnimation {
  frames: PoseSpec[];
  loop?: 'pingpong' | 'cycle';
  dur?: number; // ms par transition
  hold?: number; // ms de pause sur chaque pose
  eq?: 'barbell' | 'dumbbell';
  eqAt?: 'hand' | 'hip';
  view?: 'side' | 'top';
}

export interface Limb {
  root: Vec;
  mid: Vec;
  end: Vec;
}

export interface Skeleton {
  hip: Vec;
  shoulder: Vec;
  head: Vec;
  torsoCtrl: Vec; // point de contrôle de la courbe du dos
  arm: Limb;
  arm2?: Limb;
  leg: Limb;
  leg2?: Limb;
  props: PropSpec[];
}

export const LEN = { torso: 26, neck: 10, upper: 14, fore: 13, thigh: 20, shin: 19, headR: 6 };

const rad = (d: number) => (d * Math.PI) / 180;
/** Direction d'un membre : 0° = vers le bas, 90° = vers l'avant (droite), 180° = vers le haut. */
const limbDir = (a: number): Vec => [Math.sin(rad(a)), Math.cos(rad(a))];
/** Direction du buste : 0° = vers le haut, 90° = vers l'avant. */
const torsoDir = (t: number): Vec => [Math.sin(rad(t)), -Math.cos(rad(t))];
const add = (p: Vec, d: Vec, k = 1): Vec => [p[0] + d[0] * k, p[1] + d[1] * k];

function solveLimb(root: Vec, spec: LimbSpec, l1: number, l2: number, refs: Partial<Record<JointRef, Vec>>): Limb {
  if ('a' in spec) {
    const mid = add(root, limbDir(spec.a[0]), l1);
    return { root, mid, end: add(mid, limbDir(spec.a[1]), l2) };
  }
  const base = typeof spec.to === 'string' ? (refs[spec.to] ?? root) : spec.to;
  const target: Vec = [base[0] + (spec.off?.[0] ?? 0), base[1] + (spec.off?.[1] ?? 0)];
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const dist = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const base0 = Math.atan2(dy, dx);
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const cands = [base0 + alpha, base0 - alpha].map((ang) => add(root, [Math.cos(ang), Math.sin(ang)], l1));
  const bend = spec.bend ?? 'front';
  const score = (p: Vec) =>
    bend === 'front' ? p[0] : bend === 'back' ? -p[0] : bend === 'up' ? -p[1] : p[1];
  const mid = score(cands[0]) >= score(cands[1]) ? cands[0] : cands[1];
  // L'extrémité est placée à la bonne longueur depuis l'articulation, en direction de la cible.
  const mdx = target[0] - mid[0];
  const mdy = target[1] - mid[1];
  const md = Math.hypot(mdx, mdy) || 1;
  return { root, mid, end: [mid[0] + (mdx / md) * l2, mid[1] + (mdy / md) * l2] };
}

export function solvePose(p: PoseSpec): Skeleton {
  const td = torsoDir(p.t);
  const hip = p.hip;
  const shoulder = add(hip, td, LEN.torso);
  const head = add(shoulder, torsoDir(p.t + (p.head ?? 0)), LEN.neck);
  const normal: Vec = [td[1], -td[0]]; // « au-dessus » du dos
  const midBack: Vec = [(hip[0] + shoulder[0]) / 2, (hip[1] + shoulder[1]) / 2];
  const torsoCtrl = add(midBack, normal, (p.arch ?? 0) * 1.2);

  const refs: Partial<Record<JointRef, Vec>> = { hip, shoulder, head };
  const leg = solveLimb(hip, p.leg ?? { a: [0, 0] }, LEN.thigh, LEN.shin, refs);
  refs.knee = leg.mid;
  refs.ankle = leg.end;
  const leg2 = p.leg2 ? solveLimb(hip, p.leg2, LEN.thigh, LEN.shin, refs) : undefined;
  const arm = solveLimb(shoulder, p.arm ?? { a: [0, 0] }, LEN.upper, LEN.fore, refs);
  const arm2 = p.arm2 ? solveLimb(shoulder, p.arm2, LEN.upper, LEN.fore, refs) : undefined;
  return { hip, shoulder, head, torsoCtrl, arm, arm2, leg, leg2, props: p.props ?? [] };
}

/* ---------- Interpolation ---------- */

function lerpAny<T>(a: T, b: T, k: number): T {
  if (typeof a === 'number' && typeof b === 'number') return (a + (b - a) * k) as T;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => lerpAny(v, b[i], k)) as T;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(a)) {
      const av = (a as Record<string, unknown>)[key];
      const bv = (b as Record<string, unknown>)[key];
      out[key] = bv === undefined ? av : lerpAny(av, bv, k);
    }
    return out as T;
  }
  return (k < 0.5 ? a : b) as T;
}

const ease = (x: number) => 0.5 - Math.cos(Math.PI * x) / 2;

/** Durée d'un cycle complet de l'animation (ms). */
export function cycleMs(anim: PoseAnimation): number {
  const n = anim.frames.length;
  if (n <= 1) return 1;
  const seg = (anim.dur ?? 1200) + (anim.hold ?? 300);
  return anim.loop === 'cycle' ? seg * (n - 1) : seg * (n - 1) * 2;
}

/** Pose à l'instant `ms` de l'animation (boucle). */
export function poseAt(anim: PoseAnimation, ms: number): PoseSpec {
  const f = anim.frames;
  if (f.length <= 1) return f[0];
  const dur = anim.dur ?? 1200;
  const hold = anim.hold ?? 300;
  const seg = dur + hold;
  // séquence des poses visitées : aller (et retour en pingpong)
  const seq = anim.loop === 'cycle' ? f.map((_, i) => i) : [...f.map((_, i) => i), ...f.map((_, i) => i).reverse().slice(1, -1)];
  const steps = anim.loop === 'cycle' ? f.length - 1 : seq.length;
  const tm = ((ms % (seg * steps)) + seg * steps) % (seg * steps);
  const i = Math.floor(tm / seg);
  const local = tm - i * seg;
  const from = seq[i % seq.length];
  const to = anim.loop === 'cycle' ? i + 1 : seq[(i + 1) % seq.length];
  if (local < hold) return f[from];
  return lerpAny(f[from], f[to], ease((local - hold) / dur));
}
