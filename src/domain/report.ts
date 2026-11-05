import { addDays, formatDuration, formatLong, formatShort } from './dates';
import type { Measurement, WorkoutLog } from './types';

const FEELING_TEXT = { hard: '😮‍💨 dur', ok: '🙂 correct', easy: '💪 facile' } as const;
const fmt1 = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

/**
 * Résumé texte des 7 derniers jours, à coller dans un message au coach
 * (WhatsApp, SMS, e-mail) : séances, ressentis, commentaires, mesures.
 */
export function coachReport(opts: {
  programName: string;
  today: string;
  history: WorkoutLog[];
  measurements: Measurement[];
  goalWeight: number;
  days?: number;
}): string {
  const days = opts.days ?? 7;
  const from = addDays(opts.today, -(days - 1));
  const logs = opts.history
    .filter((h) => h.date >= from && h.date <= opts.today)
    .sort((a, b) => a.startedAt - b.startedAt);

  const lines: string[] = [];
  lines.push(`📋 Mon bilan — ${formatShort(from)} au ${formatShort(opts.today)}`);
  lines.push(`Programme : ${opts.programName}`);
  lines.push('');

  if (logs.length === 0) {
    lines.push('Aucune séance enregistrée sur ces 7 jours.');
  } else {
    const total = logs.reduce((a, h) => a + h.durationSec, 0);
    lines.push(`✅ ${logs.length} séance${logs.length > 1 ? 's' : ''} · ${formatDuration(total)} au total`);
    for (const h of logs) {
      const main = h.blocks.filter((b) => b.section === 'main');
      const done = main.filter((b) => b.validated).length;
      const feeling = h.feeling ? ` · ${FEELING_TEXT[h.feeling]}` : '';
      lines.push(`• ${formatLong(h.date)} : ${h.sessionName} (${formatDuration(h.durationSec)}, ${done}/${main.length} exercices)${feeling}`);
      if (h.comment) lines.push(`   « ${h.comment} »`);
    }
  }

  const ms = [...opts.measurements].sort((a, b) => a.date.localeCompare(b.date));
  const weights = ms.filter((m) => m.weight !== undefined);
  const last = weights[weights.length - 1];
  if (last?.weight !== undefined) {
    lines.push('');
    const before = [...weights].reverse().find((m) => m.date < from);
    const delta = before?.weight !== undefined ? ` (${last.weight - before.weight > 0 ? '+' : ''}${fmt1(last.weight - before.weight)} kg sur la période)` : '';
    lines.push(`⚖️ Poids : ${fmt1(last.weight)} kg le ${formatShort(last.date)}${delta} · objectif ${fmt1(opts.goalWeight)} kg`);
  }
  const waists = ms.filter((m) => m.waist !== undefined);
  const lastWaist = waists[waists.length - 1];
  if (lastWaist?.waist !== undefined) lines.push(`📏 Tour de taille : ${fmt1(lastWaist.waist)} cm le ${formatShort(lastWaist.date)}`);

  return lines.join('\n');
}
