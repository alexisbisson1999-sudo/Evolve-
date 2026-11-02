import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BlockList } from '../../components/BlockList';
import { Button, Card, Row, Screen, Segmented, T } from '../../components/ui';
import { programWeek } from '../../domain/program';
import { useProgram, useSessionThisWeek, useToday } from '../../hooks/useProgram';
import { startOrResume } from '../../services/workout';
import { useAppStore } from '../../store/useAppStore';

export default function PreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const program = useProgram();
  const today = useToday();
  const startDate = useAppStore((s) => s.settings.startDate);
  const currentWeek = programWeek(program, startDate, today);
  const [week, setWeek] = useState(currentWeek);
  const session = useSessionThisWeek(id, week);

  if (!session) {
    return (
      <Screen>
        <T v="title">Séance introuvable</T>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          big
          title={week === currentWeek ? 'Démarrer maintenant' : `Démarrer (paramètres semaine ${week})`}
          onPress={() => startOrResume(session, today)}
        />
      }
    >
      <Stack.Screen options={{ title: session.session.name }} />
      <View style={{ gap: 4 }}>
        <T v="h1">{session.session.name}</T>
        <T v="muted">{session.session.description}</T>
      </View>
      <View style={{ gap: 6 }}>
        <T v="label">Progression</T>
        <Segmented
          value={String(week)}
          onChange={(v) => setWeek(Number(v))}
          options={Array.from({ length: program.weeks }, (_, i) => ({
            value: String(i + 1),
            label: `S${i + 1}${i + 1 === currentWeek ? ' •' : ''}`,
          }))}
        />
      </View>
      <Card>
        <Row>
          <T v="big">≈ {session.estimatedMinutes}</T>
          <T v="muted">min</T>
        </Row>
        <BlockList blocks={session.blocks} warmupTitle={program.warmup.title} />
      </Card>
    </Screen>
  );
}
