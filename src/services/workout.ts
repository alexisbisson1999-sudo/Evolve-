import { router } from 'expo-router';
import { showDialog } from '../components/Dialog';
import type { ResolvedSession } from '../domain/types';
import { useAppStore } from '../store/useAppStore';

/** Démarre une séance, ou reprend celle en cours (avec confirmation si conflit). */
export function startOrResume(session: ResolvedSession, date: string) {
  const st = useAppStore.getState();
  const go = () => {
    st.startWorkout(session, date, st.loads);
    router.push('/seance');
  };
  if (!st.active) return go();
  if (st.active.sessionId === session.sessionId && st.active.date === date) {
    router.push('/seance');
    return;
  }
  showDialog(
    'Séance en cours',
    'Une autre séance est déjà en cours. La remplacer ? Les séries cochées seront perdues.',
    [
      { text: 'Reprendre l’autre', onPress: () => router.push('/seance') },
      { text: 'Remplacer', style: 'destructive', onPress: go },
      { text: 'Annuler', style: 'cancel' },
    ],
  );
}
