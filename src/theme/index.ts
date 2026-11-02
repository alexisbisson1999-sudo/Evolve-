import { useColorScheme } from 'react-native';
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
};

export function usePalette(): Palette {
  const system = useColorScheme();
  const pref = useAppStore((s) => s.settings.theme);
  const scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return scheme === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24 };
export const font = {
  small: 14,
  body: 16,
  title: 20,
  h1: 28,
  big: 40,
  huge: 64,
};
/** Taille minimale d'une zone tactile (pouce, en pleine séance). */
export const TOUCH = 56;
