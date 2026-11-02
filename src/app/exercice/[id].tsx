import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';
import { Button, Card, formatKg, Pill, Row, Screen, T } from '../../components/ui';
import { useProgram } from '../../hooks/useProgram';
import { useAppStore } from '../../store/useAppStore';
import { radius, space, usePalette } from '../../theme';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const program = useProgram();
  const c = usePalette();
  const ex = program.exercises[id];
  const lastLoad = useAppStore((s) => s.loads[id]);

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
      <View style={{ gap: space.sm }}>
        <T v="h1">{ex.name}</T>
        <Row style={{ flexWrap: 'wrap' }}>
          {ex.muscles.map((m) => (
            <Pill key={m} tone="accent" text={m} />
          ))}
          {ex.equipment.map((m) => (
            <Pill key={m} text={m} />
          ))}
        </Row>
        {ex.usesLoad && (
          <T v="muted">
            {ex.loadHint ?? 'Charge'} · dernière charge : {formatKg(lastLoad ?? ex.defaultLoad ?? 0)}
          </T>
        )}
      </View>

      {/* Emplacement prévu pour les médias embarqués (images / vidéo hors ligne). */}
      {!ex.media?.images?.length && !ex.media?.video && (
        <View
          style={{
            height: 120,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T v="small">Images et vidéos intégrées : bientôt disponibles</T>
        </View>
      )}

      <Card>
        <T v="label">Étapes</T>
        {ex.steps.map((s, i) => (
          <Row key={i} style={{ alignItems: 'flex-start' }} gap={space.md}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: c.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <T v="body" style={{ color: c.accent, fontWeight: '800' }}>
                {i + 1}
              </T>
            </View>
            <T v="body" style={{ flex: 1 }}>
              {s}
            </T>
          </Row>
        ))}
      </Card>

      {ex.tips.length > 0 && (
        <Card>
          <T v="label">Conseils</T>
          {ex.tips.map((t, i) => (
            <T key={i} v="body">
              • {t}
            </T>
          ))}
        </Card>
      )}

      {ex.links.map((l) => (
        <Button key={l.url} variant="secondary" title={l.label} onPress={() => Linking.openURL(l.url)} />
      ))}

      <T v="small">
        En cas de douleur articulaire, de vertige ou d'essoufflement inhabituel, arrête l'exercice. Ces conseils ne
        remplacent pas l'avis d'un professionnel de santé.
      </T>
    </Screen>
  );
}
