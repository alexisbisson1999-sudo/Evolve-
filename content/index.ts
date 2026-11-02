/**
 * Registre des programmes embarqués.
 *
 * Pour ajouter un programme : déposer un fichier JSON dans /content/programs
 * (même format que reprise-maison-4-semaines.json) et l'ajouter à la liste ci-dessous.
 * Le format étant indépendant du code, un programme pourra aussi être téléchargé
 * (kit acheté, mise à jour) et passé à `registerProgram` sans nouvelle version de l'app.
 */
import reprise from './programs/reprise-maison-4-semaines.json';
import type { Program } from '../src/domain/types';
import { validateProgram } from '../src/domain/program';

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
