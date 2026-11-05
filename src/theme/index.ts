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

const light: Palette = {
  scheme: 'light',
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEEF1',
  border: '#DADDE2',
  text: '#121417',
  textMuted: '#525A66',
  textFaint: '#7C8592',
  accent: '#1F6FEB',
  accentText: '#FFFFFF',
  accentSoft: '#E3EDFD',
  done: '#16804A',
  doneSoft: '#DDF3E6',
  danger: '#C62828',
  grid: '#E3E6EA',
  tiles: { force: '#E6EEFF', mini: '#FFF0DE', mobilite: '#EEE9FC' },
};

const dark: Palette = {
  scheme: 'dark',
  bg: '#0D0F12',
  surface: '#171A1F',
  surfaceAlt: '#20242B',
  border: '#2C313A',
  text: '#F2F4F7',
  textMuted: '#A9B1BD',
  textFaint: '#7D8693',
  accent: '#5B9BFF',
  accentText: '#0D0F12',
  accentSoft: '#1B2A44',
  done: '#3CCB7F',
  doneSoft: '#16301F',
  danger: '#FF6B6B',
  grid: '#262B33',
  tiles: { force: '#1A2540', mini: '#33281A', mobilite: '#262038' },
};

/** « Douceur » : clair et apaisant, contrastes francs, accent vert d'eau. */
const douceurLight: Palette = {
  scheme: 'light',
  bg: '#F6FAF9',
  surface: '#FFFFFF',
  surfaceAlt: '#ECF3F1',
  border: '#D3E0DC',
  text: '#16302B',
  textMuted: '#4A615C',
  textFaint: '#71857F',
  accent: '#1F7F72',
  accentText: '#FFFFFF',
  accentSoft: '#DCEFEB',
  done: '#2F8549',
  doneSoft: '#DFF1E3',
  danger: '#B93C12',
  grid: '#E2EBE8',
  tiles: { force: '#DDF1EC', mini: '#FFF1DB', mobilite: '#ECE8FA' },
};

const douceurDark: Palette = {
  scheme: 'dark',
  bg: '#0E1715',
  surface: '#17221F',
  surfaceAlt: '#1E2B28',
  border: '#2B3B37',
  text: '#EDF5F3',
  textMuted: '#A6B9B4',
  textFaint: '#7D918B',
  accent: '#5CC4B2',
  accentText: '#0E1715',
  accentSoft: '#173A34',
  done: '#5BC77A',
  doneSoft: '#163322',
  danger: '#FF8A65',
  grid: '#24312E',
  tiles: { force: '#173530', mini: '#33291A', mobilite: '#262139' },
};

const THEMES: Record<string, { light: Palette; dark: Palette }> = {
  evolve: { light, dark },
  douceur: { light: douceurLight, dark: douceurDark },
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
