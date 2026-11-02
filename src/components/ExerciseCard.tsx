import { Pressable, Text, View } from 'react-native';
import { clampRest, targetLabel, tempoShort } from '../domain/program';
import type { ActiveBlockState, ResolvedBlock } from '../domain/types';
import { tap } from '../services/feedback';
import { radius, space, usePalette } from '../theme';
import { Pictogram } from './Pictogram';
import { Button, Card, formatKg, IconButton, Row, Stepper, T } from './ui';

/** Gros rond de série à cocher. */
function SetDot({
  index,
  done,
  onPress,
  size = 64,
  label,
}: {
  index: number;
  done: boolean;
  onPress: () => void;
  size?: number;
  /** Libellé d'accessibilité et sans numéro (case simple). */
  label?: string;
}) {
  const c = usePalette();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label ?? `Série ${index + 1}`}
      hitSlop={4}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: done ? c.done : c.surfaceAlt,
        borderWidth: done ? 0 : 2,
        borderColor: c.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 24, fontWeight: '800', color: done ? (c.scheme === 'dark' ? '#0D0F12' : '#fff') : c.text }}>
        {done ? '✓' : label ? '' : index + 1}
      </Text>
    </Pressable>
  );
}

/** Exercice en cours : animation en grand, objectif, séries. Le minimum de texte. */
export function ExerciseCard({
  block,
  state,
  onToggleSet,
  onLoadChange,
  onValidate,
  onStartEffort,
  onRestChange,
  onInfo,
}: {
  block: ResolvedBlock;
  state: ActiveBlockState;
  onToggleSet: (i: number) => void;
  onLoadChange: (kg: number) => void;
  onValidate: () => void;
  onStartEffort: (i: number) => void;
  onRestChange: (sec: number) => void;
  onInfo: () => void;
}) {
  const c = usePalette();
  const timed = block.duration !== undefined;
  const tempo = tempoShort(block.tempo);

  return (
    <Card style={{ borderColor: c.accent, borderWidth: 2 }}>
      <Pressable onPress={onInfo} accessibilityRole="button" accessibilityHint="Ouvre le détail du mouvement">
        <T v="title">{block.exercise.name}</T>
      </Pressable>

      <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
        <Pressable onPress={onInfo} accessibilityRole="button" accessibilityLabel="Voir le mouvement en grand">
          <Pictogram exerciseId={block.exerciseId} size={150} />
        </Pressable>
        <View style={{ flex: 1, gap: 6 }}>
          <T v="big" style={{ fontSize: 34 }} numberOfLines={2} adjustsFontSizeToFit>
            {targetLabel(block)}
          </T>
          {tempo ? <T v="title" style={{ color: c.textMuted, fontVariant: ['tabular-nums'] }}>{tempo}</T> : null}
          {block.repsPctMax !== undefined ? (
            <T v="small">{Math.round(block.repsPctMax * 100)} % de ton max</T>
          ) : null}
        </View>
      </Row>

      {block.exercise.usesLoad && state.load !== undefined && (
        <Stepper label="charge" value={state.load} step={2.5} min={0} max={200} format={formatKg} onChange={onLoadChange} />
      )}

      <Row style={{ flexWrap: 'wrap' }} gap={12}>
        {state.setsDone.map((done, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <SetDot index={i} done={done} onPress={() => onToggleSet(i)} />
            {timed && !done ? (
              <Pressable
                onPress={() => onStartEffort(i)}
                accessibilityRole="button"
                accessibilityLabel={`Démarrer le chrono de la série ${i + 1}`}
                hitSlop={8}
                style={{
                  minWidth: 64,
                  minHeight: 40,
                  paddingHorizontal: 8,
                  borderRadius: radius.md,
                  backgroundColor: c.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: c.accentText, fontWeight: '800', fontSize: 16 }}>▶ {block.duration}s</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </Row>

      <Row style={{ justifyContent: 'space-between' }}>
        {block.rest > 0 ? (
          <Row gap={6}>
            <IconButton label="−" accessibilityLabel="Réduire le repos" onPress={() => onRestChange(clampRest(block.rest - 15))} size={44} />
            <T v="body" style={{ fontWeight: '700', minWidth: 64, textAlign: 'center' }}>
              ⏱ {block.rest}s
            </T>
            <IconButton label="+" accessibilityLabel="Allonger le repos" onPress={() => onRestChange(clampRest(block.rest + 15))} size={44} />
          </Row>
        ) : (
          <View />
        )}
        <Button title="Valider ✓" variant="secondary" onPress={onValidate} style={{ minHeight: 44 }} />
      </Row>
    </Card>
  );
}

/** Exercice replié (à venir ou déjà fait) : une ligne avec la vignette. */
export function ExerciseRow({
  block,
  state,
  onPress,
}: {
  block: ResolvedBlock;
  state: ActiveBlockState;
  onPress: () => void;
}) {
  const c = usePalette();
  const done = state.validated;
  const count = state.setsDone.filter(Boolean).length;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${block.exercise.name}${done ? ', validé' : ''}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        padding: space.sm,
        paddingRight: space.lg,
        borderRadius: radius.lg,
        backgroundColor: done ? c.doneSoft : c.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Pictogram exerciseId={block.exerciseId} size={64} animate={false} framed={!done} />
      <View style={{ flex: 1 }}>
        <T v="body" style={{ fontWeight: '700' }} numberOfLines={1}>
          {block.exercise.name}
        </T>
        <T v="small">
          {targetLabel(block)}
          {state.load !== undefined && block.exercise.usesLoad ? ` · ${formatKg(state.load)}` : ''}
        </T>
      </View>
      <Text style={{ fontSize: done ? 26 : 16, fontWeight: '800', color: done ? c.done : c.textFaint }}>
        {done ? '✓' : `${count}/${block.sets}`}
      </Text>
    </Pressable>
  );
}

/** Échauffement : les mouvements en liste, une coche par mouvement. */
export function WarmupGroup({
  title,
  blocks,
  states,
  onToggle,
  onInfo,
}: {
  title: string;
  blocks: ResolvedBlock[];
  states: Record<string, ActiveBlockState>;
  onToggle: (b: ResolvedBlock) => void;
  onInfo: (b: ResolvedBlock) => void;
}) {
  const c = usePalette();
  const doneCount = blocks.filter((b) => states[b.key]?.validated).length;
  return (
    <Card style={{ gap: space.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="title">{title}</T>
        <T v="body" style={{ fontWeight: '800', color: doneCount === blocks.length ? c.done : c.textFaint }}>
          {doneCount}/{blocks.length}
        </T>
      </Row>
      {blocks.map((b) => {
        const done = !!states[b.key]?.validated;
        return (
          <Row key={b.key} gap={space.md}>
            <Pressable onPress={() => onInfo(b)} accessibilityRole="button" accessibilityLabel={`Voir ${b.exercise.name}`}>
              <Pictogram exerciseId={b.exerciseId} size={72} animate={!done} />
            </Pressable>
            <Pressable onPress={() => onInfo(b)} style={{ flex: 1 }}>
              <T v="body" style={{ fontWeight: '600', opacity: done ? 0.5 : 1 }} numberOfLines={2}>
                {b.exercise.name}
              </T>
              <T v="small">{targetLabel(b)}</T>
            </Pressable>
            <SetDot index={0} done={done} onPress={() => onToggle(b)} size={56} label={`Fait : ${b.exercise.name}`} />
          </Row>
        );
      })}
    </Card>
  );
}
