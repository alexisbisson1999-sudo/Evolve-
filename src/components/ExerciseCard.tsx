import { Pressable, Text, View } from 'react-native';
import { clampRest, targetLabel } from '../domain/program';
import type { ActiveBlockState, ResolvedBlock } from '../domain/types';
import { tap } from '../services/feedback';
import { radius, space, usePalette } from '../theme';
import { Button, Card, formatKg, IconButton, Pill, Row, Stepper, T } from './ui';

export function ExerciseCard({
  block,
  state,
  index,
  onToggleSet,
  onLoadChange,
  onValidate,
  onStartEffort,
  onRestChange,
  onInfo,
}: {
  block: ResolvedBlock;
  state: ActiveBlockState;
  index: number;
  onToggleSet: (i: number) => void;
  onLoadChange: (kg: number) => void;
  onValidate: (v: boolean) => void;
  onStartEffort: (i: number) => void;
  onRestChange: (sec: number) => void;
  onInfo: () => void;
}) {
  const c = usePalette();
  const doneCount = state.setsDone.filter(Boolean).length;
  const allDone = doneCount === block.sets;
  const timed = block.duration !== undefined;

  if (state.validated) {
    return (
      <Pressable
        onPress={() => onValidate(false)}
        accessibilityRole="button"
        accessibilityLabel={`${block.exercise.name}, validé. Toucher pour rouvrir.`}
        style={{
          backgroundColor: c.doneSoft,
          borderRadius: radius.lg,
          padding: space.lg,
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
        }}
      >
        <Text style={{ fontSize: 24, color: c.done, fontWeight: '800' }}>✓</Text>
        <View style={{ flex: 1 }}>
          <T v="body" style={{ fontWeight: '700' }} numberOfLines={1}>
            {block.exercise.name}
          </T>
          <T v="small">
            {doneCount}/{block.sets} séries
            {state.load !== undefined ? ` · ${formatKg(state.load)}` : ''} · toucher pour rouvrir
          </T>
        </View>
      </Pressable>
    );
  }

  return (
    <Card>
      <Pressable onPress={onInfo} accessibilityRole="button" accessibilityHint="Ouvre l'explication de l'exercice">
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="label">
              {block.section === 'warmup' ? 'Échauffement' : `Exercice ${index}`}
            </T>
            <T v="title">{block.exercise.name}</T>
          </View>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: c.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: c.accent, fontWeight: '800', fontSize: 20 }}>?</Text>
          </View>
        </Row>
      </Pressable>

      {/* Objectif en gros chiffres */}
      <View style={{ gap: 6 }}>
        <T v="big">{targetLabel(block)}</T>
        <Row style={{ flexWrap: 'wrap' }}>
          {block.tempo ? <Pill text={`Tempo ${block.tempo}`} /> : null}
          {block.repsPctMax !== undefined ? <Pill text={`${Math.round(block.repsPctMax * 100)} % de ton max`} /> : null}
          {block.rest === 0 ? <Pill text="Sans repos" /> : null}
        </Row>
      </View>

      {/* Repos réglable */}
      {block.rest > 0 && (
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="muted">Repos</T>
          <Row>
            <IconButton
              label="−"
              accessibilityLabel="Réduire le repos"
              onPress={() => onRestChange(clampRest(block.rest - 15))}
              size={48}
            />
            <T v="title" style={{ minWidth: 64, textAlign: 'center' }}>
              {block.rest} s
            </T>
            <IconButton
              label="+"
              accessibilityLabel="Allonger le repos"
              onPress={() => onRestChange(clampRest(block.rest + 15))}
              size={48}
            />
          </Row>
        </Row>
      )}

      {/* Charge */}
      {block.exercise.usesLoad && state.load !== undefined && (
        <View style={{ gap: 4 }}>
          <T v="muted">Charge{block.exercise.loadHint ? ` — ${block.exercise.loadHint.toLowerCase()}` : ''}</T>
          <Stepper
            label="charge"
            value={state.load}
            step={2.5}
            min={0}
            max={200}
            format={formatKg}
            onChange={onLoadChange}
          />
        </View>
      )}

      {/* Séries à cocher */}
      <View style={{ gap: 6 }}>
        <T v="muted">
          Séries {doneCount}/{block.sets}
          {timed ? ' — ▶ lance le chrono d’effort' : ''}
        </T>
        <Row style={{ flexWrap: 'wrap' }} gap={10}>
          {state.setsDone.map((done, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 4 }}>
              <Pressable
                onPress={() => {
                  tap();
                  onToggleSet(i);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={`Série ${i + 1}`}
                style={({ pressed }) => ({
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done ? c.done : c.surfaceAlt,
                  borderWidth: done ? 0 : 2,
                  borderColor: c.border,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 22, fontWeight: '800', color: done ? (c.scheme === 'dark' ? '#0D0F12' : '#fff') : c.text }}>
                  {done ? '✓' : i + 1}
                </Text>
              </Pressable>
              {timed && !done ? (
                <Pressable
                  onPress={() => onStartEffort(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Démarrer le chrono de la série ${i + 1}`}
                  hitSlop={8}
                  style={{
                    paddingHorizontal: 10,
                    minHeight: 32,
                    borderRadius: 16,
                    backgroundColor: c.accentSoft,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: c.accent, fontWeight: '800' }}>▶ {block.duration}s</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </Row>
      </View>

      <Button
        title="Valider l'exercice"
        variant={allDone ? 'done' : 'secondary'}
        onPress={() => onValidate(true)}
        big
      />
      {block.rest === 0 && <T v="small">Enchaîne directement avec le mouvement suivant.</T>}
    </Card>
  );
}
