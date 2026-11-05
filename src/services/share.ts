import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';
import { getProgram } from '../../content';
import { showDialog } from '../components/Dialog';
import { todayISO } from '../domain/dates';
import { coachReport } from '../domain/report';
import { useAppStore } from '../store/useAppStore';

/**
 * Envoie le bilan des 7 derniers jours au coach :
 * - sur téléphone, ouvre le menu de partage (WhatsApp, SMS, e-mail…) ;
 * - sur le web, copie le texte à coller dans un message.
 */
export async function sendReportToCoach(): Promise<void> {
  const s = useAppStore.getState();
  const text = coachReport({
    programName: getProgram(s.settings.programId).name,
    today: todayISO(),
    history: s.history,
    measurements: s.measurements,
    goalWeight: s.settings.goalWeight,
  });

  if (Platform.OS !== 'web') {
    try {
      await Share.share({ message: text });
      return;
    } catch {
      // on tente la copie ci-dessous
    }
  }
  try {
    await Clipboard.setStringAsync(text);
    showDialog('Bilan copié ✓', `Colle-le dans ton message à ton coach (WhatsApp, SMS…).\n\n${text}`);
  } catch {
    showDialog('Copie impossible', `Sélectionne le texte ci-dessous et copie-le :\n\n${text}`);
  }
}
