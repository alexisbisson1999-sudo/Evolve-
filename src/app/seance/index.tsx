import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProgram, pickMotivation } from '../../../content';
import { showDialog } from '../../components/Dialog';
import { ExerciseCard, ExerciseRow, WarmupGroup } from '../../components/ExerciseCard';
import { TimerPanel, useWorkoutTimer } from '../../components/Timer';
import { Button, Row, Screen, T } from '../../components/ui';
import { formatClock } from '../../domain/dates';
import { resolveSession } from '../../domain/program';
import type { ResolvedBlock } from '../../domain/types';
import { useResolveOptions } from '../../hooks/useProgram';
import { useAppStore } from '../../store/useAppStore';
import { radius, space, usePalette } from '../../theme';

const confirm = showDialog;

export default function WorkoutScreen() {
  useKeepAwake(); // écran maintenu allumé pendant la séance
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const active = useAppStore((s) => s.active);
  const opts = useResolveOptions();
  const store = useAppStore.getState;
  const timer = useWorkoutTimer();
  const [now, setNow] = useState(() => Date.now());
  const [chosenFocus, setChosenFocus] = useState<string | null>(null);
  const [coach, setCoach] = useState<string>(() => pickMotivation('sessionStart', active?.startedAt));
  const scrollRef = useRef<ScrollViewInstance>(null);
  const positions = useRef<Record<string, number>>({});

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

  const main = useMemo(() => session?.blocks.filter((b) => b.section === 'main') ?? [], [session]);
  const warmup = useMemo(() => session?.blocks.filter((b) => b.section === 'warmup') ?? [], [session]);

  // Exercice affiché en grand : celui choisi, sinon le premier non validé.
  const autoFocus = main.find((b) => !active?.blocks[b.key]?.validated)?.key ?? null;
  const focusKey = chosenFocus && active?.blocks[chosenFocus] && !active.blocks[chosenFocus].validated ? chosenFocus : autoFocus;

  // Fait défiler jusqu'à l'exercice en cours quand il change.
  const lastFocus = useRef<string | null>(null);
  useEffect(() => {
    if (!focusKey || focusKey === lastFocus.current) return;
    const first = lastFocus.current === null;
    lastFocus.current = focusKey;
    if (first) return;
    const id = setTimeout(() => {
      const y = positions.current[focusKey];
      if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - space.md), animated: true });
    }, 120);
    return () => clearTimeout(id);
  }, [focusKey]);

  if (!active || !session) {
    return (
      <Screen>
        <T v="title">Aucune séance en cours</T>
        <Button title="Retour" onPress={() => router.back()} />
      </Screen>
    );
  }

  const program = getProgram(active.programId);
  const mainDone = main.filter((b) => active.blocks[b.key]?.validated).length;
  const warmupDone = warmup.every((b) => active.blocks[b.key]?.validated);
  const allDone = mainDone === main.length && warmupDone;

  /* ---------- Actions ---------- */

  const nextAfter = (b: ResolvedBlock): ResolvedBlock | undefined =>
    main.find((x) => x.key !== b.key && !useAppStore.getState().active?.blocks[x.key]?.validated);

  /** Après une série cochée : encouragement, validation auto si tout est fait, puis repos. */
  const afterSet = (b: ResolvedBlock) => {
    const cur = useAppStore.getState().active?.blocks[b.key];
    if (!cur) return;
    const doneCount = cur.setsDone.filter(Boolean).length;
    const complete = doneCount === b.sets;
    const next = nextAfter(b);

    if (complete && !cur.validated) {
      store().setBlockValidated(b.key, true);
      setChosenFocus(null);
      const remaining = main.filter((x) => !useAppStore.getState().active?.blocks[x.key]?.validated).length;
      setCoach(pickMotivation(remaining === 1 ? 'lastExercise' : 'exerciseDone'));
    } else if (!complete) {
      setCoach(pickMotivation('setDone'));
    }

    if (b.rest <= 0 || (complete && !next)) return;
    timer.start({
      mode: 'rest',
      title: complete && next ? `Ensuite : ${next.exercise.name}` : `${b.exercise.name} · série ${doneCount + 1}/${b.sets}`,
      phases: [{ seconds: b.rest }],
      quote: pickMotivation('rest'),
      ref: b.exerciseId,
    });
  };

  const toggleSet = (b: ResolvedBlock, si: number) => {
    const wasDone = !!active.blocks[b.key]?.setsDone[si];
    store().toggleSet(b.key, si);
    if (wasDone) {
      if (active.blocks[b.key]?.validated) store().setBlockValidated(b.key, false);
      if (timer.timer?.mode === 'rest') timer.stop();
      return;
    }
    afterSet(b);
  };

  const startEffort = (b: ResolvedBlock, si: number) => {
    const sec = b.duration ?? 0;
    const phases = b.perSide
      ? [
          { label: 'Côté gauche', seconds: sec },
          { label: 'Côté droit', seconds: sec },
        ]
      : [{ seconds: sec }];
    timer.start({
      mode: 'effort',
      title: `${b.exercise.name} · série ${si + 1}/${b.sets}`,
      phases,
      quote: 'Respire calmement, garde la position.',
      onDone: () => {
        const cur = useAppStore.getState().active?.blocks[b.key];
        if (cur && !cur.setsDone[si]) {
          useAppStore.getState().toggleSet(b.key, si);
          afterSet(b);
        }
      },
    });
  };

  const toggleWarmup = (b: ResolvedBlock) => {
    const st = active.blocks[b.key];
    const done = !!st?.validated;
    store().setBlockValidated(b.key, !done);
    if (done && st.setsDone.some(Boolean)) store().toggleSet(b.key, 0);
    if (!done) {
      const left = warmup.filter((x) => x.key !== b.key && !active.blocks[x.key]?.validated).length;
      setCoach(left === 0 ? 'Échauffement terminé. Le corps est prêt, on attaque !' : pickMotivation('setDone'));
    }
  };

  const finish = () => {
    const pending = main.filter((b) => !active.blocks[b.key]?.validated).length + (warmupDone ? 0 : 1);
    const done = (validateAll: boolean) => {
      timer.stop();
      const log = store().finishWorkout(session, validateAll);
      if (log) router.replace(`/bilan/${log.id}`);
    };
    if (pending === 0) return done(false);
    confirm('Terminer la séance', 'Certains exercices ne sont pas validés. Tout valider, ou enregistrer tel quel ?', [
      { text: 'Tout valider', onPress: () => done(true) },
      { text: 'Enregistrer tel quel', onPress: () => done(false) },
      { text: 'Annuler', style: 'cancel' },
    ]);
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

  /* ---------- Rendu ---------- */

  const progress = (mainDone + (warmupDone ? 1 : 0)) / (main.length + 1);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen
        options={{
          title: session.session.name,
          headerLeft: () => null,
          headerRight: () => <Button title="Quitter" variant="ghost" onPress={() => router.back()} style={{ minHeight: 40 }} />,
        }}
      />

      {/* Progression */}
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, gap: 6, backgroundColor: c.bg }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="title" style={{ fontVariant: ['tabular-nums'] }}>
            ⏱ {formatClock((now - active.startedAt) / 1000)}
          </T>
          <T v="body" style={{ fontWeight: '700' }}>
            {mainDone}/{main.length} exercices
          </T>
        </Row>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
          <View style={{ width: `${progress * 100}%`, height: 6, backgroundColor: c.done }} />
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: space.lg, gap: space.sm }}>
        {warmup.length > 0 && (
          <View onLayout={(e) => (positions.current.warmup = e.nativeEvent.layout.y)}>
            {warmupDone ? (
              <View
                style={{ backgroundColor: c.doneSoft, borderRadius: radius.lg, padding: space.md, minHeight: 56, justifyContent: 'center' }}
              >
                <T v="body" style={{ fontWeight: '700', color: c.done }}>
                  ✓ {program.warmup.title}
                </T>
              </View>
            ) : (
              <WarmupGroup
                title={program.warmup.title}
                blocks={warmup}
                states={active.blocks}
                onToggle={toggleWarmup}
                onInfo={(b) => router.push(`/exercice/${b.exerciseId}`)}
              />
            )}
          </View>
        )}

        {main.map((b) => {
          const st = active.blocks[b.key];
          if (!st) return null;
          return (
            <View key={b.key} onLayout={(e) => (positions.current[b.key] = e.nativeEvent.layout.y)}>
              {b.key === focusKey ? (
                <ExerciseCard
                  block={b}
                  state={st}
                  onInfo={() => router.push(`/exercice/${b.exerciseId}`)}
                  onToggleSet={(si) => toggleSet(b, si)}
                  onLoadChange={(kg) => store().setBlockLoad(b.key, b.exerciseId, kg)}
                  onRestChange={(sec) => store().setRestOverride(b.exerciseId, sec)}
                  onValidate={() => {
                    store().setBlockValidated(b.key, true);
                    setChosenFocus(null);
                    setCoach(pickMotivation('exerciseDone'));
                  }}
                  onStartEffort={(si) => startEffort(b, si)}
                />
              ) : (
                <ExerciseRow
                  block={b}
                  state={st}
                  onPress={() => {
                    if (st.validated) store().setBlockValidated(b.key, false);
                    setChosenFocus(b.key);
                  }}
                />
              )}
            </View>
          );
        })}

        <Button variant="danger" title="Abandonner la séance" onPress={abandon} style={{ marginTop: space.lg }} />
      </ScrollView>

      {/* Zone du pouce : chrono, encouragement, actions */}
      <View
        style={{
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: insets.bottom + space.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          backgroundColor: c.surface,
          gap: space.sm,
        }}
      >
        {timer.timer ? (
          <TimerPanel
            t={timer}
            onRestTotalChange={(sec) => {
              const ref = timer.timer?.ref;
              if (ref) store().setRestOverride(ref, sec);
            }}
          />
        ) : (
          <T v="body" style={{ textAlign: 'center', fontStyle: 'italic', color: c.textMuted }} numberOfLines={2}>
            {coach}
          </T>
        )}
        <Row>
          {!timer.timer && (
            <Button
              title="⏱ 30 s"
              variant="secondary"
              big
              accessibilityLabel="Lancer un chrono de 30 secondes"
              onPress={() => timer.start({ mode: 'free', title: 'Chrono libre', phases: [{ seconds: 30 }], quote: pickMotivation('rest') })}
              style={{ paddingHorizontal: space.md }}
            />
          )}
          <Button big title="Terminer" variant={allDone ? 'done' : 'secondary'} onPress={finish} style={{ flex: 1 }} />
        </Row>
      </View>
    </View>
  );
}
