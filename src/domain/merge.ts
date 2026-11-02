import type { Measurement, Settings, WorkoutLog } from './types';

/**
 * Données synchronisables. Les collections (séances, mesures) sont fusionnées
 * élément par élément ; les réglages et préférences en « dernier écrit gagne ».
 */
export interface SyncedData {
  settings: Settings;
  settingsUpdatedAt: number;
  loads: Record<string, number>;
  restOverrides: Record<string, number>;
  prefsUpdatedAt: number;
  history: WorkoutLog[];
  measurements: Measurement[];
  /** Identifiants supprimés (pierres tombales) → horodatage de suppression. */
  deleted: Record<string, number>;
}

function mergeById<T extends { id: string; updatedAt: number }>(
  a: T[],
  b: T[],
  deleted: Record<string, number>,
): T[] {
  const map = new Map<string, T>();
  for (const item of [...a, ...b]) {
    const cur = map.get(item.id);
    if (!cur || item.updatedAt > cur.updatedAt) map.set(item.id, item);
  }
  return [...map.values()].filter((x) => !(deleted[x.id] && deleted[x.id] >= x.updatedAt));
}

export function mergeSynced(local: SyncedData, remote: SyncedData | null | undefined): SyncedData {
  if (!remote) return local;
  const deleted: Record<string, number> = { ...remote.deleted };
  for (const [id, ts] of Object.entries(local.deleted)) deleted[id] = Math.max(ts, deleted[id] ?? 0);

  const settingsSrc = remote.settingsUpdatedAt > local.settingsUpdatedAt ? remote : local;
  const prefsSrc = remote.prefsUpdatedAt > local.prefsUpdatedAt ? remote : local;

  return {
    settings: { ...local.settings, ...settingsSrc.settings },
    settingsUpdatedAt: settingsSrc.settingsUpdatedAt,
    loads: { ...(prefsSrc === local ? remote.loads : local.loads), ...prefsSrc.loads },
    restOverrides: { ...prefsSrc.restOverrides },
    prefsUpdatedAt: prefsSrc.prefsUpdatedAt,
    history: mergeById(local.history, remote.history, deleted).sort((x, y) => y.startedAt - x.startedAt),
    measurements: mergeById(local.measurements, remote.measurements, deleted).sort((x, y) =>
      x.date.localeCompare(y.date),
    ),
    deleted,
  };
}
