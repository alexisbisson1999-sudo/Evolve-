import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Platform, Share, Switch, View } from 'react-native';
import { showDialog } from '../../components/Dialog';
import { Button, Card, Field, Row, Screen, Segmented, Stepper, T, formatKg } from '../../components/ui';
import { addDays, formatLongWithYear, formatTime, mondayOf, todayISO } from '../../domain/dates';
import type { ThemePref } from '../../domain/types';
import { useProgram } from '../../hooks/useProgram';
import { ensurePermission } from '../../services/notifications';
import { getSession, signIn, signOut, signUp, syncConfigured, syncNow } from '../../services/sync';
import { useAppStore } from '../../store/useAppStore';
import { space, usePalette } from '../../theme';

function SwitchRow({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const c = usePalette();
  return (
    <Row style={{ justifyContent: 'space-between', minHeight: 48 }}>
      <View style={{ flex: 1 }}>
        <T v="body">{label}</T>
        {hint ? <T v="small">{hint}</T> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.border }} accessibilityLabel={label} />
    </Row>
  );
}

function AccountCard() {
  const lastSyncAt = useAppStore((s) => s.lastSyncAt);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getSession().then((s) => setUserEmail(s?.user.email ?? null));
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      const s = await getSession();
      setUserEmail(s?.user.email ?? null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setBusy(false);
    }
  };

  if (!syncConfigured) {
    return (
      <Card>
        <T v="title">Compte et synchro</T>
        <T v="muted">
          Tes données sont enregistrées sur ce téléphone et fonctionnent hors ligne. La sauvegarde en ligne sera active
          une fois le serveur configuré (voir README, section « Synchro »).
        </T>
      </Card>
    );
  }

  return (
    <Card>
      <T v="title">Compte et synchro</T>
      {userEmail ? (
        <>
          <T v="body">Connecté : {userEmail}</T>
          <T v="small">
            {lastSyncAt ? `Dernière synchro : ${new Date(lastSyncAt).toLocaleString('fr-FR')}` : 'Pas encore synchronisé'}
          </T>
          <Button title={busy ? 'Synchro…' : 'Synchroniser maintenant'} onPress={() => run(syncNow)} disabled={busy} />
          <Button title="Se déconnecter" variant="ghost" onPress={() => run(signOut)} disabled={busy} />
        </>
      ) : (
        <>
          <T v="muted">Connecte-toi pour sauvegarder tes données et les retrouver sur un autre appareil.</T>
          <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
          <Row>
            <Button title="Se connecter" onPress={() => run(() => signIn(email, password))} disabled={busy || !email || !password} style={{ flex: 1 }} />
            <Button
              title="Créer un compte"
              variant="secondary"
              onPress={() =>
                run(async () => {
                  const r = await signUp(email, password);
                  if (r === 'confirm-email') setMsg('Compte créé : confirme ton e-mail puis connecte-toi.');
                })
              }
              disabled={busy || !email || password.length < 6}
              style={{ flex: 1 }}
            />
          </Row>
        </>
      )}
      {msg ? <T v="small">{msg}</T> : null}
    </Card>
  );
}

export default function SettingsScreen() {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const program = useProgram();
  const [goalWaist, setGoalWaist] = useState(settings.goalWaist ? String(settings.goalWaist) : '');

  const exportData = async () => {
    const data = JSON.stringify(useAppStore.getState().getSynced(), null, 2);
    await Share.share({ title: 'Sauvegarde Evolve', message: data });
  };

  const reset = () => {
    const doIt = () => useAppStore.getState().resetAll();
    showDialog('Tout effacer ?', 'Historique, mesures et réglages de cet appareil seront supprimés.', [
      { text: 'Effacer', style: 'destructive', onPress: doIt },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  return (
    <Screen>
      <Card>
        <T v="title">Programme</T>
        <T v="muted">{program.name}</T>
        <T v="label">Date de départ</T>
        <Stepper
          label="date de départ"
          value={0}
          onChange={(d) => update({ startDate: addDays(settings.startDate, d) })}
          min={-1}
          max={1}
          format={() => formatLongWithYear(settings.startDate)}
        />
        <Row>
          <Button title="Aujourd'hui" variant="secondary" onPress={() => update({ startDate: todayISO() })} style={{ flex: 1 }} />
          <Button title="Lundi de cette semaine" variant="secondary" onPress={() => update({ startDate: mondayOf(todayISO()) })} style={{ flex: 1 }} />
        </Row>
        <T v="small">La semaine du programme et l'alternance A/B sont calculées à partir de cette date.</T>

        <T v="label">Max de pompes (une série)</T>
        <Stepper label="max de pompes" value={settings.maxPushups} onChange={(v) => update({ maxPushups: v })} min={1} max={150} bigValue />
        <T v="small">Les séries de pompes sont calculées en pourcentage de ce max. Refais un test toutes les 2 à 4 semaines.</T>
      </Card>

      <Card>
        <T v="title">Rappel quotidien</T>
        <SwitchRow
          label="Activer le rappel"
          value={settings.reminderEnabled}
          onChange={async (v) => {
            if (v && Platform.OS !== 'web' && !(await ensurePermission())) {
              showDialog('Notifications refusées', 'Autorise les notifications dans les réglages du téléphone.');
              return;
            }
            update({ reminderEnabled: v });
          }}
          hint={Platform.OS === 'web' ? 'Non disponible sur le web' : undefined}
        />
        {settings.reminderEnabled && (
          <>
            <T v="label">Heure</T>
            <Stepper
              label="heure du rappel"
              value={settings.reminderHour * 60 + settings.reminderMinute}
              step={15}
              min={0}
              max={23 * 60 + 45}
              format={(v) => formatTime(Math.floor(v / 60), v % 60)}
              onChange={(v) => update({ reminderHour: Math.floor(v / 60), reminderMinute: v % 60 })}
              bigValue
            />
          </>
        )}
      </Card>

      <Card>
        <T v="title">Séance</T>
        <SwitchRow label="Son en fin de chrono" value={settings.soundEnabled} onChange={(v) => update({ soundEnabled: v })} />
        <SwitchRow label="Vibration en fin de chrono" value={settings.vibrationEnabled} onChange={(v) => update({ vibrationEnabled: v })} />
        <T v="small">Le temps de repos se règle (45 à 120 s) directement sur chaque exercice pendant la séance ; il est mémorisé.</T>
      </Card>

      <Card>
        <T v="title">Objectifs</T>
        <T v="label">Poids objectif</T>
        <Stepper label="poids objectif" value={settings.goalWeight} step={0.5} min={40} max={200} format={formatKg} onChange={(v) => update({ goalWeight: v })} />
        <Field
          label="Tour de taille objectif (cm, facultatif)"
          value={goalWaist}
          keyboardType="decimal-pad"
          onChangeText={setGoalWaist}
          onEndEditing={() => {
            const v = Number(goalWaist.replace(',', '.'));
            update({ goalWaist: goalWaist.trim() && Number.isFinite(v) ? v : undefined });
          }}
        />
        <T v="label">Taille</T>
        <Stepper label="taille" value={settings.heightCm} min={120} max={230} format={(v) => `${v} cm`} onChange={(v) => update({ heightCm: v })} />
      </Card>

      <Card>
        <T v="title">Apparence</T>
        <Segmented<ThemePref>
          value={settings.theme}
          onChange={(v) => update({ theme: v })}
          options={[
            { value: 'system', label: 'Système' },
            { value: 'light', label: 'Clair' },
            { value: 'dark', label: 'Sombre' },
          ]}
        />
      </Card>

      <AccountCard />

      <Card>
        <T v="title">Données</T>
        <Button title="Exporter mes données (JSON)" variant="secondary" onPress={exportData} />
        <Button title="Tout effacer sur cet appareil" variant="danger" onPress={reset} />
      </Card>

      <Card>
        <T v="title">Santé</T>
        <T v="muted">
          Evolve propose des conseils d'entraînement généraux et ne remplace pas un avis médical. Consulte un médecin avant
          de reprendre une activité physique si tu as des antécédents (cardiaques, articulaires, tension…). Arrête
          immédiatement en cas de douleur thoracique, de malaise ou de douleur articulaire vive.
        </T>
      </Card>

      <T v="small" style={{ textAlign: 'center', marginBottom: space.lg }}>
        Evolve v{Constants.expoConfig?.version ?? '1.0.0'} · programme v{program.version}
      </T>
    </Screen>
  );
}
