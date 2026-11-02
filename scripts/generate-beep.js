// Génère assets/sounds/beep.wav : trois bips courts (fin de repos / d'effort).
// Usage : node scripts/generate-beep.js
const fs = require('fs');
const path = require('path');

const rate = 22050;
const tones = [
  { f: 880, d: 0.15 }, { f: 0, d: 0.1 },
  { f: 880, d: 0.15 }, { f: 0, d: 0.1 },
  { f: 1320, d: 0.35 },
];
const samples = [];
for (const { f, d } of tones) {
  const n = Math.round(rate * d);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / 200, (n - i) / 200); // anti-clic
    samples.push(f ? Math.sin((2 * Math.PI * f * i) / rate) * 0.6 * env : 0);
  }
}
const data = Buffer.alloc(samples.length * 2);
samples.forEach((s, i) => data.writeInt16LE(Math.round(s * 32767), i * 2));
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
h.write('data', 36); h.writeUInt32LE(data.length, 40);
const out = path.join(__dirname, '..', 'assets', 'sounds', 'beep.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([h, data]));
console.log('écrit', out);
