import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { getProgram, pickMotivation } from '../../../content';
import { Button, Card, formatKg, Row, Screen, T } from '../../components/ui';
import { formatDuration } from '../../domain/dates';
import { computeAdjustments, type Adjustment } from '../../domain/progression';
import type { Feeling } from '../../domain/types';
import { useAppStore } from '../../store/useAppStore';
import { radius, space, usePalette } from '../../theme';

const FEELINGS: { value: Feeling; emoji: string; label: string }[] = [
  { value: 'hard', emoji: '😮‍💨', label: 'Dur' },
  { value: 'ok', emoji: '🙂', label: 'Correct' },
  { value: 'easy', emoji: '💪', label: 'Facile' },
];

const MOMENT = { hard: 'feltHard', ok: 'feltOk', easy: 'feltEasy' } as const;

/** Bilan de fin de séance : bravo, chiffres clés et ressenti. */
export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = usePalette();
  const log = useAppStore((s) => s.history.find((h) => h.id === id));
  const setFeeling = useAppStore((s) => s.setLogFeeling);
  const setComment = useAppStore((s) => s.setLogComment);
  const [note, setNote] = useState(() => log?.comment ?? '');
  const [headline] = useState(() => pickMotivation('sessionEnd'));
  const [answer, setAnswer] = useState<string | null>(null);
  const history = useAppStore((s) => s.history);
  const loads = useAppStore((s) => s.loads);
  const settings = useAppStore((s) => s.settings);
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());

  // Progression automatique : recalculée quand le ressenti change.
  const adjustments = useMemo<Adjustment[]>(() => {
    if (!log || !settings.autoProgression) return [];
    return computeAdjustments(getProgram(log.programId), history, log, loads, settings.maxPushups);
  }, [log, history, loads, settings.autoProgression, settings.maxPushups]);

  const applyAdjustments = () => {
    const st = useAppStore.getState();
    for (const a of adjustments) {
      if (skipped.has(a.exerciseId)) continue;
      if (a.kind === 'load') st.setLoad(a.exerciseId, a.to);
      else st.updateSettings({ maxPushups: a.to });
    }
  };

  if (!log) {
    return (
      <Screen>
        <Button title="Retour" onPress={() => router.back()} />
      </Screen>
    );
  }

  const main = log.blocks.filter((b) => b.section === 'main');
  const sets = main.reduce((a, b) => a + b.setsDone, 0);
  const validated = main.filter((b) => b.validated).length;

  return (
    <Screen
      footer={
        <Button
          big
          title="Retour à l'accueil"
          onPress={() => {
            setComment(log.id, note);
            applyAdjustments();
            router.dismissTo('/');
          }}
        />
      }
    >
      <Stack.Screen options={{ title: 'Bravo !', headerLeft: () => null, gestureEnabled: false }} />
      <View style={{ alignItems: 'center', gap: space.sm, paddingTop: space.lg }}>
        <Text style={{ fontSize: 72 }}>🎉</Text>
        <T v="h1" style={{ textAlign: 'center' }}>
          {headline}
        </T>
        <T v="muted">{log.sessionName}</T>
      </View>

      <Row gap={space.md}>
        {[
          { label: 'Durée', value: formatDuration(log.durationSec) },
          { label: 'Exercices', value: `${validated}/${main.length}` },
          { label: 'Séries', value: String(sets) },
        ].map((s) => (
          <Card key={s.label} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <T v="title" numberOfLines={1} adjustsFontSizeToFit>
              {s.value}
            </T>
            <T v="small">{s.label}</T>
          </Card>
        ))}
      </Row>

      <Card>
        <T v="title" style={{ textAlign: 'center' }}>
          Comment tu l'as vécue ?
        </T>
        <Row gap={space.sm}>
          {FEELINGS.map((f) => {
            const selected = log.feeling === f.value;
            return (
              <Pressable
                key={f.value}
                onPress={() => {
                  setFeeling(log.id, f.value);
                  setAnswer(pickMotivation(MOMENT[f.value]));
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={f.label}
                style={{
                  flex: 1,
                  minHeight: 96,
                  borderRadius: radius.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  backgroundColor: selected ? c.accentSoft : c.surfaceAlt,
                  borderWidth: 2,
                  borderColor: selected ? c.accent : 'transparent',
                }}
              >
                <Text style={{ fontSize: 36 }}>{f.emoji}</Text>
                <T v="body" style={{ fontWeight: '700' }}>
                  {f.label}
                </T>
              </Pressable>
            );
          })}
        </Row>
        {answer ? (
          <T v="body" style={{ textAlign: 'center' }}>
            {answer}
          </T>
        ) : null}
        {log.feeling === 'hard' ? (
          <T v="small" style={{ textAlign: 'center' }}>
            Astuce : baisse la charge d'un cran ou ton max de pompes (Réglages). En reprise, mieux vaut finir
            facile que s'arrêter.
          </T>
        ) : null}
      </Card>

      {adjustments.length > 0 && (
        <Card>
          <T v="title">Pour la prochaine fois</T>
          {adjustments.map((a) => {
            const on = !skipped.has(a.exerciseId);
            const fmt = (v: number) => (a.kind === 'load' ? formatKg(v) : String(v));
            return (
              <Pressable
                key={a.exerciseId}
                onPress={() =>
                  setSkipped((prev) => {
                    const next = new Set(prev);
                    if (next.has(a.exerciseId)) next.delete(a.exerciseId);
                    else next.add(a.exerciseId);
                    return next;
                  })
                }
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${a.name} : ${fmt(a.from)} vers ${fmt(a.to)}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64 }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on ? c.done : 'transparent',
                    borderWidth: on ? 0 : 2,
                    borderColor: c.border,
                  }}
                >
                  {on ? <Text style={{ color: c.scheme === 'dark' ? '#0D0F12' : '#fff', fontWeight: '800', fontSize: 18 }}>✓</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <T v="body" style={{ fontWeight: '700' }}>
                    {a.name}
                  </T>
                  <T v="small">{a.reason}</T>
                </View>
                <T v="body" style={{ fontWeight: '800', color: a.to > a.from ? c.done : c.textMuted, fontVariant: ['tabular-nums'] }}>
                  {fmt(a.from)} → {fmt(a.to)}
                </T>
              </Pressable>
            );
          })}
          <T v="small">Appliqué en revenant à l'accueil. Décoche ce que tu préfères garder tel quel.</T>
        </Card>
      )}

      <Card>
        <T v="title">Un mot sur cette séance ?</T>
        <TextInput
          value={note}
          onChangeText={setNote}
          onEndEditing={() => setComment(log.id, note)}
          onBlur={() => setComment(log.id, note)}
          multiline
          maxLength={2000}
          placeholder="Ex. : genou gauche sensible sur les fentes, pompes plus faciles que prévu…"
          placeholderTextColor={c.textFaint}
          accessibilityLabel="Commentaire libre"
          style={{
            minHeight: 110,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surfaceAlt,
            color: c.text,
            padding: space.md,
            fontSize: 17,
            textAlignVertical: 'top',
          }}
        />
        <T v="small">Facultatif. Tu le retrouves dans Suivi › Historique des séances.</T>
      </Card>
    </Screen>
  );
}
