import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { getProgram } from '../../../content';
import { ExerciseCard } from '../../components/ExerciseCard';
import { TimerPanel, useWorkoutTimer } from '../../components/Timer';
import { Button, Card, Row, Screen, T } from '../../components/ui';
import { formatClock, formatDuration } from '../../domain/dates';
import { resolveSession } from '../../domain/program';
import { useResolveOptions } from '../../hooks/useProgram';
import { useAppStore } from '../../store/useAppStore';
import { space } from '../../theme';

function confirm(title: string, message: string, buttons: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[]) {
  if (Platform.OS === 'web') {
    // Alert multi-boutons non supporté sur le web : on simplifie.
    const main = buttons.find((b) => b.style !== 'cancel');
    if (globalThis.confirm?.(`${title}\n\n${message}`)) main?.onPress?.();
    return;
  }
  Alert.alert(title, message, buttons);
}

export default function WorkoutScreen() {
  useKeepAwake(); // écran maintenu allumé pendant la séance
  const active = useAppStore((s) => s.active);
  const opts = useResolveOptions();
  const store = useAppStore.getState;
  const timer = useWorkoutTimer();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const session = useMemo(() => {
    if (!active) return null;
    const program = getProgram(active.programId);
    if (!program.sessions[active.sessionId]) return null;
    return resolveSession(program, active.sessionId, active.week, opts);
  }, [active?.programId, active?.sessionId, active?.week, opts]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active || !session) {
    return (
      <Screen>
        <T v="title">Aucune séance en cours</T>
        <Button title="Retour" onPress={() => router.back()} />
      </Screen>
    );
  }

  const validatedCount = session.blocks.filter((b) => active.blocks[b.key]?.validated).length;
  const total = session.blocks.length;
  let mainIndex = 0;

  const finish = () => {
    const pending = total - validatedCount;
    const done = (validateAll: boolean) => {
      timer.stop();
      const log = store().finishWorkout(session, validateAll);
      if (log) {
        router.back();
        setTimeout(
          () =>
            Alert.alert(
              'Séance terminée 🎉',
              `${log.sessionName}\nDurée : ${formatDuration(log.durationSec)} · ${log.blocks.filter((b) => b.validated).length}/${log.blocks.length} blocs validés`,
            ),
          300,
        );
      }
    };
    if (pending === 0) return done(false);
    confirm(
      'Terminer la séance',
      `${pending} bloc(s) non validé(s). Tout valider d'un coup, ou enregistrer tel quel ?`,
      [
        { text: 'Tout valider', onPress: () => done(true) },
        { text: 'Enregistrer tel quel', onPress: () => done(false) },
        { text: 'Annuler', style: 'cancel' },
      ],
    );
  };

  const abandon = () =>
    confirm('Abandonner la séance ?', 'Rien ne sera enregistré dans l’historique.', [
      {
        text: 'Abandonner',
        style: 'destructive',
        onPress: () => {
          timer.stop();
          store().cancelWorkout();
          router.back();
        },
      },
      { text: 'Continuer', style: 'cancel' },
    ]);

  return (
    <Screen
      footer={
        <>
          <TimerPanel
            t={timer}
            onRestTotalChange={(sec) => {
              const ref = timer.timer?.ref;
              if (ref) store().setRestOverride(ref, sec);
            }}
          />
          <Button big title="Terminer la séance" variant={validatedCount === total ? 'done' : 'primary'} onPress={finish} />
        </>
      }
    >
      <Stack.Screen
        options={{
          title: session.session.shortName === session.session.name ? session.session.name : `Séance ${session.session.shortName}`,
          headerLeft: () => null,
          headerRight: () => (
            <Button title="Quitter" variant="ghost" onPress={() => router.back()} style={{ minHeight: 40 }} />
          ),
        }}
      />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <T v="label">Durée</T>
            <T v="big">{formatClock((now - active.startedAt) / 1000)}</T>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <T v="label">Blocs validés</T>
            <T v="big">
              {validatedCount}/{total}
            </T>
          </View>
        </Row>
        <T v="muted">
          {session.session.name} · semaine {session.week} · ≈ {session.estimatedMinutes} min
        </T>
      </Card>

      {session.blocks.map((b, i) => {
        const st = active.blocks[b.key];
        if (!st) return null;
        if (b.section === 'main') mainIndex++;
        const isLastSetOfSession = i === session.blocks.length - 1;

        // Le repos démarre automatiquement quand on coche une série (sauf la toute dernière).
        const startRest = () => {
          if (b.rest <= 0) return;
          const cur = useAppStore.getState().active?.blocks[b.key];
          const allDone = !!cur && cur.setsDone.every(Boolean);
          if (isLastSetOfSession && allDone) return;
          timer.start('rest', b.exercise.name, [{ seconds: b.rest }], undefined, b.exerciseId);
        };

        return (
          <View key={b.key} style={{ gap: space.sm }}>
            {i === 0 && b.section === 'warmup' && <T v="label">{getProgram(active.programId).warmup.title}</T>}
            {b.section === 'main' && mainIndex === 1 && <T v="label">Séance</T>}
            <ExerciseCard
              block={b}
              state={st}
              index={mainIndex}
              onInfo={() => router.push(`/exercice/${b.exerciseId}`)}
              onToggleSet={(si) => {
                const nowChecked = !st.setsDone[si];
                store().toggleSet(b.key, si);
                // Échauffement : la série cochée valide directement le mouvement.
                const after = useAppStore.getState().active?.blocks[b.key];
                if (nowChecked && b.section === 'warmup' && after?.setsDone.every(Boolean)) {
                  store().setBlockValidated(b.key, true);
                }
                if (nowChecked) startRest();
                else if (timer.timer?.mode === 'rest') timer.stop();
              }}
              onLoadChange={(kg) => store().setBlockLoad(b.key, b.exerciseId, kg)}
              onRestChange={(sec) => store().setRestOverride(b.exerciseId, sec)}
              onValidate={(v) => store().setBlockValidated(b.key, v)}
              onStartEffort={(si) => {
                const sec = b.duration ?? 0;
                const phases = b.perSide
                  ? [
                      { label: 'Côté gauche', seconds: sec },
                      { label: 'Côté droit', seconds: sec },
                    ]
                  : [{ seconds: sec }];
                timer.start('effort', b.exercise.name, phases, () => {
                  const cur = useAppStore.getState().active?.blocks[b.key];
                  if (cur && !cur.setsDone[si]) {
                    useAppStore.getState().toggleSet(b.key, si);
                    startRest();
                  }
                });
              }}
            />
          </View>
        );
      })}

      <Button variant="danger" title="Abandonner la séance" onPress={abandon} />
    </Screen>
  );
}
