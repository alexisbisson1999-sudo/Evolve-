import { useColorScheme } from 'react-native';
import { getProgram } from '../../content';
import { useAppStore } from '../store/useAppStore';

export interface Palette {
  scheme: 'light' | 'dark';
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentText: string; // texte posé sur l'accent
  accentSoft: string;
  done: string;
  doneSoft: string;
  danger: string;
  grid: string;
  /** Fonds pastel des cartes de séance, par type de séance. */
  tiles: Record<'force' | 'mini' | 'mobilite', string>;
}

/**
 * Palette « Énergie sobre » : base neutre (gris clair et encre) pour ne pas distraire,
 * une seule couleur vive (orange) réservée aux actions à faire — le chemin à suivre —
 * et le vert uniquement pour ce qui est terminé.
 */
const light: Palette = {
  scheme: 'light',
  bg: '#F3F4F6',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEEF1',
  border: '#DDE0E5',
  text: '#14171C',
  textMuted: '#555C66',
  textFaint: '#737A84',
  accent: '#D9481F',
  accentText: '#FFFFFF',
  accentSoft: '#FCEAE4',
  done: '#1E8E5A',
  doneSoft: '#E3F3EA',
  danger: '#A8231B',
  grid: '#E6E8EB',
  tiles: { force: '#FFFFFF', mini: '#FFFFFF', mobilite: '#FFFFFF' },
};

const dark: Palette = {
  scheme: 'dark',
  bg: '#0F1114',
  surface: '#181B20',
  surfaceAlt: '#22262C',
  border: '#2E333A',
  text: '#F2F3F5',
  textMuted: '#A7ADB6',
  textFaint: '#7B828C',
  accent: '#FF6A3D',
  accentText: '#14171C',
  accentSoft: '#3A2219',
  done: '#36C47F',
  doneSoft: '#14301F',
  danger: '#FF7B72',
  grid: '#262A30',
  tiles: { force: '#181B20', mini: '#181B20', mobilite: '#181B20' },
};

// Les deux programmes partagent la même identité visuelle (le programme « douceur »
// démarre simplement en mode clair).
const THEMES: Record<string, { light: Palette; dark: Palette }> = {
  evolve: { light, dark },
  douceur: { light, dark },
};

export function usePalette(): Palette {
  const system = useColorScheme();
  const pref = useAppStore((s) => s.settings.theme);
  const programId = useAppStore((s) => s.settings.programId);
  const set = THEMES[getProgram(programId).theme ?? 'evolve'] ?? THEMES.evolve;
  const scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return scheme === 'dark' ? set.dark : set.light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24 };
export const font = {
  small: 14,
  body: 16,
  title: 20,
  h1: 30,
  big: 40,
  huge: 64,
};
/** Taille minimale d'une zone tactile (pouce, en pleine séance). */
export const TOUCH = 56;
