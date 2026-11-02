/**
 * Registre du contenu embarqué : programmes, pictogrammes animés, phrases d'encouragement.
 *
 * Pour ajouter un programme : déposer un fichier JSON dans /content/programs
 * (même format que reprise-maison-4-semaines.json) et l'ajouter à la liste ci-dessous.
 * Le format étant indépendant du code, un programme pourra aussi être téléchargé
 * (kit acheté, mise à jour) et passé à `registerProgram` sans nouvelle version de l'app.
 */
import motivationData from './motivation.json';
import posesData from './poses.json';
import reprise from './programs/reprise-maison-4-semaines.json';
import type { PoseAnimation } from '../src/domain/pose';
import { validateProgram } from '../src/domain/program';
import type { Program } from '../src/domain/types';

/* ---------- Programmes ---------- */

const programs = new Map<string, Program>();

export function registerProgram(raw: unknown): Program {
  const p = validateProgram(raw as Program);
  programs.set(p.id, p);
  return p;
}

registerProgram(reprise);

export const DEFAULT_PROGRAM_ID = 'reprise-maison-4-semaines';

export function getProgram(id: string): Program {
  return programs.get(id) ?? (programs.get(DEFAULT_PROGRAM_ID) as Program);
}

export function listPrograms(): Program[] {
  return [...programs.values()];
}

/* ---------- Pictogrammes animés (générés par scripts/build-poses.js) ---------- */

const poses = posesData as unknown as Record<string, PoseAnimation>;

/** Animation du mouvement, si elle existe. */
export function getPose(exerciseId: string): PoseAnimation | undefined {
  return poses[exerciseId];
}

/* ---------- Phrases d'encouragement ---------- */

export type MotivationMoment = keyof typeof motivationData;

/** Phrase au hasard pour un moment donné (`seed` pour une phrase stable). */
export function pickMotivation(moment: MotivationMoment, seed?: number): string {
  const list = motivationData[moment];
  const i = seed === undefined ? Math.floor(Math.random() * list.length) : Math.abs(Math.floor(seed)) % list.length;
  return list[i];
}
