import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, useWindowDimensions, View } from 'react-native';
import { Pictogram } from '../../components/Pictogram';
import { Button, Card, formatKg, Pill, Row, Screen, T } from '../../components/ui';
import { useProgram } from '../../hooks/useProgram';
import { useAppStore } from '../../store/useAppStore';
import { space, usePalette } from '../../theme';

/** Fiche exercice : d'abord le mouvement en image, le texte seulement si on le demande. */
export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const program = useProgram();
  const c = usePalette();
  const { width } = useWindowDimensions();
  const ex = program.exercises[id];
  const lastLoad = useAppStore((s) => s.loads[id]);
  const [showSteps, setShowSteps] = useState(false);

  if (!ex) {
    return (
      <Screen>
        <T v="title">Exercice introuvable</T>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: ex.name }} />
      <Pictogram exerciseId={id} size={Math.min(width - space.lg * 2, 480)} />

      <View style={{ gap: space.sm }}>
        <T v="h1">{ex.name}</T>
        <Row style={{ flexWrap: 'wrap' }}>
          {ex.muscles.map((m) => (
            <Pill key={m} tone="accent" text={m} />
          ))}
          {ex.usesLoad && <Pill text={`Dernière charge : ${formatKg(lastLoad ?? ex.defaultLoad ?? 0)}`} />}
        </Row>
      </View>

      {ex.tips.length > 0 && (
        <Card>
          <T v="label">À retenir</T>
          {ex.tips.slice(0, 3).map((t, i) => (
            <Row key={i} style={{ alignItems: 'flex-start' }} gap={space.sm}>
              <T v="title" style={{ color: c.done }}>
                ✓
              </T>
              <T v="body" style={{ flex: 1 }}>
                {t}
              </T>
            </Row>
          ))}
        </Card>
      )}

      <Card>
        <T v="label">Rythme du mouvement</T>
        <T v="body">↓ descente · ⏸︎ pause · ↑ montée (en secondes)</T>
      </Card>

      {showSteps ? (
        <Card>
          <T v="label">Étapes détaillées</T>
          {ex.steps.map((s, i) => (
            <Row key={i} style={{ alignItems: 'flex-start' }} gap={space.md}>
              <T v="body" style={{ color: c.accent, fontWeight: '800', width: 20 }}>
                {i + 1}
              </T>
              <T v="body" style={{ flex: 1 }}>
                {s}
              </T>
            </Row>
          ))}
        </Card>
      ) : (
        <Button variant="secondary" title="Voir les étapes détaillées" onPress={() => setShowSteps(true)} />
      )}

      {ex.links.map((l) => (
        <Button key={l.url} variant="ghost" title={`▶ ${l.label}`} onPress={() => Linking.openURL(l.url)} />
      ))}

      <T v="small">
        En cas de douleur articulaire, de vertige ou d'essoufflement inhabituel, arrête l'exercice. Ces conseils ne
        remplacent pas l'avis d'un professionnel de santé.
      </T>
    </Screen>
  );
}
