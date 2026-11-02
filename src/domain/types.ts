/**
 * Types du contenu (programmes) et des données utilisateur.
 * Le contenu est décrit en JSON (dossier /content) et validé au chargement.
 */

export type Weekday = '0' | '1' | '2' | '3' | '4' | '5' | '6'; // 0 = dimanche (Date.getDay)

export interface ExerciseLink {
  label: string;
  url: string;
}

export interface ExerciseMedia {
  /** Futur : images embarquées hors ligne (chemins d'assets ou URL). */
  images?: string[];
  /** Futur : vidéo embarquée hors ligne. */
  video?: string;
}

export interface ExerciseDef {
  name: string;
  muscles: string[];
  equipment: string[];
  usesLoad: boolean;
  defaultLoad?: number;
  /** Cran d'augmentation de charge (kg). Défaut : 2,5. */
  loadStep?: number;
  loadHint?: string;
  steps: string[];
  tips: string[];
  links: ExerciseLink[];
  media?: ExerciseMedia;
}

/** Paramètres d'un bloc pour une semaine donnée. */
export interface WeekParams {
  sets: number;
  /** Répétitions fixes. */
  reps?: number;
  /** Répétitions en % du max de pompes de l'utilisateur (0–1). */
  repsPctMax?: number;
  /** Durée d'effort en secondes (exercice chronométré). */
  duration?: number;
  /** Tempo excentrique-pause-concentrique-pause, ex. "3-1-1-0". */
  tempo?: string;
  /** Repos après chaque série, en secondes (0 = pas de repos). */
  rest: number;
}

export interface BlockDef {
  exercise: string;
  perSide?: boolean;
  /** Libellé pour perSide (défaut : « par côté »). */
  sideLabel?: string;
  note?: string;
  /** Une entrée par semaine ; si moins d'entrées que de semaines, la dernière est réutilisée. */
  params: WeekParams[];
}

export type SessionKind = 'force' | 'mini' | 'mobilite';

export interface SessionDef {
  id: string;
  name: string;
  shortName: string;
  kind: SessionKind;
  description: string;
  warmup: boolean;
  blocks: BlockDef[];
}

export interface Program {
  id: string;
  version: number;
  name: string;
  description: string;
  weeks: number;
  repeatLastWeek: boolean;
  equipment: string[];
  schedule: {
    rotations: Record<string, string[]>;
    /** Valeur : identifiant de séance, `rotation:<id>`, ou "" pour repos. */
    weekdays: Record<Weekday, string>;
  };
  warmup: { title: string; blocks: BlockDef[] };
  sessions: Record<string, SessionDef>;
  exercises: Record<string, ExerciseDef>;
}

/** Bloc résolu pour une semaine et un utilisateur donnés. */
export interface ResolvedBlock {
  key: string; // unique dans la séance
  section: 'warmup' | 'main';
  exerciseId: string;
  exercise: ExerciseDef;
  sets: number;
  reps?: number;
  duration?: number;
  perSide: boolean;
  sideLabel: string;
  tempo?: string;
  rest: number;
  repsPctMax?: number;
}

export interface ResolvedSession {
  sessionId: string;
  session: SessionDef;
  week: number; // semaine du programme (1..weeks)
  absoluteWeek: number; // semaine depuis le départ (peut dépasser weeks)
  blocks: ResolvedBlock[];
  estimatedMinutes: number;
}

/* ---------- Données utilisateur ---------- */

export interface Measurement {
  id: string;
  date: string; // YYYY-MM-DD
  weight?: number; // kg
  waist?: number; // cm
  updatedAt: number;
}

export interface LoggedBlock {
  key: string;
  exerciseId: string;
  name: string;
  section: 'warmup' | 'main';
  setsDone: number;
  setsTotal: number;
  validated: boolean;
  load?: number;
}

export interface WorkoutLog {
  id: string;
  programId: string;
  sessionId: string;
  sessionName: string;
  date: string; // YYYY-MM-DD (jour de la séance)
  week: number;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  blocks: LoggedBlock[];
  /** Ressenti donné en fin de séance. */
  feeling?: Feeling;
  /** Commentaire libre écrit après la séance. */
  comment?: string;
  updatedAt: number;
}

export type Feeling = 'hard' | 'ok' | 'easy';

export interface ActiveBlockState {
  setsDone: boolean[];
  validated: boolean;
  load?: number;
}

export interface ActiveWorkout {
  id: string;
  programId: string;
  sessionId: string;
  date: string;
  week: number;
  startedAt: number;
  blocks: Record<string, ActiveBlockState>;
}

export type ThemePref = 'system' | 'light' | 'dark';

export interface Settings {
  programId: string;
  startDate: string; // YYYY-MM-DD
  maxPushups: number;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  theme: ThemePref;
  /** Ajustement automatique des charges et du max de pompes en fin de séance. */
  autoProgression: boolean;
  heightCm: number;
  goalWeight: number;
  goalWaist?: number;
}
