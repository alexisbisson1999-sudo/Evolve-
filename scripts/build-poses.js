/**
 * Génère content/poses.json : les pictogrammes animés de chaque exercice.
 * Usage : node scripts/build-poses.js
 *
 * Vue de profil, personnage tourné vers la droite. Repère 120 × 100, sol à y = 92.
 * Une pose = paramètres du squelette (le rendu calcule les articulations) :
 *   hip [x,y]       position du bassin
 *   t               inclinaison du buste en degrés (0 = droit, 90 = horizontal vers l'avant)
 *   head            inclinaison de la tête par rapport au buste
 *   arch            courbure du dos (+ = dos rond vers le haut, − = creusé)
 *   arm / arm2      bras côté visible / côté caché
 *   leg / leg2      jambe côté visible / côté cachée
 * Un membre est donné soit par angles absolus { a: [segment1, segment2] }
 * (0 = vers le bas, 90 = vers l'avant, 180 = vers le haut, −90 = vers l'arrière),
 * soit par une cible { to: [x,y] | 'head'|'hip'|'shoulder'|'knee'|'ankle', off?: [dx,dy], bend }
 * résolue par cinématique inverse (bend : front | back | up | down).
 */
const fs = require('fs');
const path = require('path');

const GROUND = 90; // hauteur des chevilles au sol
const L = { torso: 26, upper: 14, fore: 13, thigh: 20, shin: 19 };
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const r1 = (v) => Math.round(v * 10) / 10;

/** Corps gainé en ligne droite depuis les chevilles, avec un angle d'élévation phi (degrés). */
function straightBody(ankleX, phi, ankleY = GROUND - 2) {
  const u = [Math.cos(rad(phi)), -Math.sin(rad(phi))];
  const legLen = L.thigh + L.shin;
  const hip = [ankleX + legLen * u[0], ankleY + legLen * u[1]];
  const shoulder = [hip[0] + L.torso * u[0], hip[1] + L.torso * u[1]];
  return { hip: hip.map(r1), shoulder: shoulder.map(r1), t: r1(90 - phi), legA: r1(phi - 90) };
}

/** Inclinaison du buste à partir du bassin et d'un point visé pour les épaules. */
function torsoTo(hip, shoulder) {
  return r1(deg(Math.atan2(shoulder[0] - hip[0], -(shoulder[1] - hip[1]))));
}

const STAND_LEGS = { leg: { a: [0, 0] } };
const STAND = { hip: [60, GROUND - 39], t: 0, ...STAND_LEGS };

const poses = {};

/* ---------- Échauffement ---------- */

poses['cercles-bras'] = {
  loop: 'cycle',
  dur: 700,
  hold: 0,
  frames: [0, 90, 180, 270, 360].map((a) => ({ ...STAND, arm: { a: [a, a] }, arm2: { a: [a + 180, a + 180] } })),
};

{
  const hip = [42, 70];
  const sh = [68, 62];
  const base = { hip, t: torsoTo(hip, sh), leg: { to: [26, GROUND], bend: 'down' }, arm: { to: [69, GROUND], bend: 'back' } };
  poses['chat-vache'] = {
    dur: 1500,
    hold: 500,
    frames: [
      { ...base, arch: -6, head: -35 },
      { ...base, arch: 9, head: 45 },
    ],
  };
}

poses['open-book'] = {
  view: 'top',
  dur: 1600,
  hold: 600,
  frames: [
    { hip: [38, 50], t: 90, leg: { a: [0, -90] }, arm2: { a: [0, 0] }, arm: { a: [0, 0] } },
    { hip: [38, 50], t: 90, leg: { a: [0, -90] }, arm2: { a: [0, 0] }, arm: { a: [180, 180] } },
  ],
};

{
  const hip = [52, 70];
  const base = {
    hip,
    t: 72,
    head: 10,
    leg: { to: [80, GROUND], bend: 'front' },
    leg2: { to: [16, GROUND], bend: 'down' },
    arm2: { to: [72, GROUND], bend: 'back' },
  };
  poses['fente-rotation'] = {
    dur: 1400,
    hold: 600,
    frames: [
      { ...base, arm: { to: [74, GROUND], bend: 'back' } },
      { ...base, head: -20, arm: { a: [180, 180] } },
    ],
  };
}

const squat = (eq, arms) => ({
  dur: 1500,
  hold: 250,
  eq,
  frames: [
    { hip: [60, GROUND - 38], t: 0, leg: { to: [62, GROUND], bend: 'front' }, ...arms[0] },
    { hip: [46, 72], t: 38, leg: { to: [62, GROUND], bend: 'front' }, ...arms[1] },
  ],
});
poses['squat-poids-corps'] = squat(undefined, [{ arm: { a: [0, 0] } }, { arm: { a: [90, 90] } }]);
poses['squat-goblet'] = squat('dumbbell', [
  { arm: { to: 'shoulder', off: [7, 6], bend: 'down' } },
  { arm: { to: 'shoulder', off: [7, 6], bend: 'down' } },
]);

/* ---------- Force ---------- */

{
  const up = straightBody(16, 24);
  const down = straightBody(16, 8);
  const hands = [r1(up.shoulder[0]), GROUND];
  const f = (b) => ({ hip: b.hip, t: b.t, leg: { a: [b.legA, b.legA] }, arm: { to: hands, bend: 'up' } });
  poses['pompes'] = { dur: 1300, hold: 200, frames: [f(up), f(down)] };
}

{
  const p = straightBody(14, 11);
  poses['planche'] = {
    frames: [{ hip: p.hip, t: p.t, leg: { a: [p.legA, p.legA] }, arm: { a: [0, 90] } }],
  };
  const s = straightBody(14, 14);
  poses['gainage-lateral'] = {
    frames: [{ hip: s.hip, t: s.t, leg: { a: [s.legA, s.legA] }, arm: { a: [0, 90] }, arm2: { a: [180, 180] } }],
  };
}

{
  const hip = [52, 56];
  const legs = { leg: { to: [60, GROUND], bend: 'front' } };
  poses['rowing-barre'] = {
    eq: 'barbell',
    dur: 1100,
    hold: 300,
    frames: [
      { hip, t: 55, ...legs, arm: { a: [0, 0] } },
      { hip, t: 55, ...legs, arm: { to: 'hip', off: [8, -2], bend: 'up' } },
    ],
  };
}

poses['souleve-roumain'] = {
  eq: 'barbell',
  dur: 1600,
  hold: 250,
  frames: [
    { hip: [60, GROUND - 38], t: 0, leg: { to: [62, GROUND], bend: 'front' }, arm: { a: [0, 0] } },
    { hip: [50, 56], t: 72, leg: { to: [62, GROUND], bend: 'front' }, arm: { a: [0, 0] } },
  ],
};

poses['developpe-militaire-halteres'] = {
  eq: 'dumbbell',
  dur: 1200,
  hold: 250,
  frames: [
    { ...STAND, arm: { to: 'shoulder', off: [4, -4], bend: 'down' } },
    { ...STAND, arm: { a: [178, 178] } },
  ],
};

poses['fentes-arriere'] = {
  eq: 'dumbbell',
  dur: 1500,
  hold: 250,
  frames: [
    { hip: [60, GROUND - 38], t: 0, leg: { to: [64, GROUND], bend: 'front' }, leg2: { to: [58, GROUND], bend: 'front' }, arm: { a: [0, 0] } },
    { hip: [52, 69], t: 4, leg: { to: [66, GROUND], bend: 'front' }, leg2: { to: [26, GROUND], bend: 'down' }, arm: { a: [0, 0] } },
  ],
};

{
  const base = { hip: [44, 86], t: 90, head: 0, leg: { to: [28, GROUND], bend: 'up' } };
  poses['developpe-sol'] = {
    eq: 'barbell',
    dur: 1300,
    hold: 300,
    frames: [
      { ...base, arm: { a: [180, 180] } },
      { ...base, arm: { to: 'shoulder', off: [2, -8], bend: 'down' } },
    ],
  };
}

{
  const hip = [42, 52];
  const base = {
    hip,
    t: 80,
    leg: { to: [52, GROUND], bend: 'front' },
    leg2: { to: [32, GROUND], bend: 'front' },
    arm2: { to: [70, 74], bend: 'back' },
    props: [{ type: 'box', x: 62, y: 74, w: 34, h: 18 }],
  };
  poses['rowing-unilateral'] = {
    eq: 'dumbbell',
    dur: 1100,
    hold: 300,
    frames: [
      { ...base, arm: { a: [0, 0] } },
      { ...base, arm: { to: 'hip', off: [10, 0], bend: 'up' } },
    ],
  };
}

{
  const props = [{ type: 'box', x: 76, y: 70, w: 30, h: 22 }];
  const sh = [78, 67];
  poses['hip-thrust'] = {
    eq: 'barbell',
    eqAt: 'hip',
    dur: 1300,
    hold: 500,
    frames: [
      { hip: [58, 84], t: torsoTo([58, 84], sh), head: 20, leg: { to: [40, GROUND], bend: 'up' }, arm: { to: 'hip', off: [0, -2], bend: 'down' }, props },
      { hip: [53, 67], t: torsoTo([53, 67], sh), head: 30, leg: { to: [40, GROUND], bend: 'up' }, arm: { to: 'hip', off: [0, -2], bend: 'down' }, props },
    ],
  };
}

poses['curl-barre'] = {
  eq: 'barbell',
  dur: 1100,
  hold: 250,
  frames: [
    { ...STAND, arm: { a: [0, 0] } },
    { ...STAND, arm: { a: [0, 165] } },
  ],
};

/* ---------- Abdos ---------- */

{
  const legs = { leg: { to: [34, GROUND], bend: 'up' } };
  poses['crunch'] = {
    dur: 1100,
    hold: 400,
    frames: [
      { hip: [50, 87], t: 90, head: -10, ...legs, arm: { to: 'head', off: [-2, -5], bend: 'up' } },
      { hip: [50, 87], t: 62, head: 10, ...legs, arm: { to: 'head', off: [-2, -5], bend: 'up' } },
    ],
  };
}

{
  const base = { hip: [48, 87], t: 90, head: 0 };
  poses['dead-bug'] = {
    dur: 1500,
    hold: 400,
    frames: [
      { ...base, leg: { a: [180, -90] }, leg2: { a: [180, -90] }, arm: { a: [180, 180] }, arm2: { a: [180, 180] } },
      { ...base, leg: { a: [-100, -95] }, leg2: { a: [180, -90] }, arm: { a: [180, 180] }, arm2: { a: [100, 100] } },
    ],
  };
}

/* ---------- Mobilité ---------- */

{
  const front = { leg: { to: [72, GROUND], bend: 'up' }, leg2: { to: [24, GROUND], bend: 'down' } };
  poses['etirement-flechisseurs'] = {
    dur: 1800,
    hold: 900,
    frames: [
      { hip: [48, 71], t: 0, ...front, arm: { to: 'hip', off: [2, 0], bend: 'back' } },
      { hip: [53, 72], t: -6, head: 0, ...front, arm: { to: 'hip', off: [2, 0], bend: 'back' } },
    ],
  };
}

{
  const legs = { leg: { to: [52, GROUND], bend: 'front' }, leg2: { a: [-84, -86] } };
  poses['pigeon'] = {
    dur: 2000,
    hold: 900,
    frames: [
      { hip: [48, 80], t: 5, ...legs, arm: { to: [56, GROUND], bend: 'back' } },
      { hip: [48, 80], t: 78, head: 10, ...legs, arm: { a: [95, 95] } },
    ],
  };
}

poses['hanches-90-90'] = {
  dur: 1500,
  hold: 500,
  frames: [
    { hip: [46, 86], t: 0, leg: { a: [130, 20] }, leg2: { a: [100, 0] }, arm: { to: [34, GROUND], bend: 'back' } },
    { hip: [46, 86], t: 0, leg: { a: [60, 10] }, leg2: { a: [30, -10] }, arm: { to: [34, GROUND], bend: 'back' } },
  ],
};

{
  const base = { hip: [48, 87], t: 90, head: 0, leg2: { a: [-90, -90] } };
  poses['ischios-sol'] = {
    dur: 1800,
    hold: 900,
    frames: [
      { ...base, leg: { a: [-140, -140] }, arm: { to: 'knee', off: [0, 0], bend: 'down' } },
      { ...base, leg: { a: [-172, -172] }, arm: { to: 'knee', off: [0, 0], bend: 'down' } },
    ],
  };
}

poses['squat-profond-tenu'] = {
  dur: 2000,
  hold: 800,
  frames: [
    { hip: [50, 79], t: 22, leg: { to: [62, GROUND], bend: 'front' }, arm: { to: 'shoulder', off: [12, 10], bend: 'down' } },
    { hip: [50, 81], t: 18, leg: { to: [62, GROUND], bend: 'front' }, arm: { to: 'shoulder', off: [12, 10], bend: 'down' } },
  ],
};

{
  const props = [{ type: 'wall', x: 76 }];
  poses['etirement-pectoraux-mur'] = {
    dur: 1800,
    hold: 900,
    frames: [
      { ...STAND, props, arm: { to: [74, 14], bend: 'down' } },
      { hip: [56, GROUND - 39], t: -4, leg: { to: [60, GROUND], bend: 'front' }, props, arm: { to: [74, 14], bend: 'down' } },
    ],
  };
}

poses['posture-enfant'] = {
  dur: 2200,
  hold: 900,
  frames: [
    { hip: [40, 82], t: 103, head: -25, leg: { a: [66, -90] }, arm: { a: [86, 90] } },
    { hip: [38, 83], t: 104, head: -25, leg: { a: [68, -90] }, arm: { a: [88, 91] } },
  ],
};

const out = path.join(__dirname, '..', 'content', 'poses.json');
fs.writeFileSync(out, JSON.stringify(poses, null, 1) + '\n');
console.log(`écrit ${out} (${Object.keys(poses).length} exercices)`);
