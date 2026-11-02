import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { BlockList } from '../../components/BlockList';
import { Button, Card, Pill, Row, Screen, T } from '../../components/ui';
import { WeekStrip } from '../../components/WeekStrip';
import { diffDays, formatLong, formatLongWithYear } from '../../domain/dates';
import { useProgram, useSessionForDate, useToday } from '../../hooks/useProgram';
import { startOrResume } from '../../services/workout';
import { useAppStore } from '../../store/useAppStore';
import { space } from '../../theme';

export default function TodayScreen() {
  const today = useToday();
  const [selected, setSelected] = useState(today);
  const program = useProgram();
  const startDate = useAppStore((s) => s.settings.startDate);
  const history = useAppStore((s) => s.history);
  const active = useAppStore((s) => s.active);

  const date = selected;
  const session = useSessionForDate(date);
  const doneDates = useMemo(() => new Set(history.map((h) => h.date)), [history]);
  const doneLog = history.find((h) => h.date === date);
  const beforeStart = diffDays(startDate, today) < 0;
  const isToday = date === today;
  const activeHere = active && session && active.sessionId === session.sessionId && active.date === date;

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <T v="label">{isToday ? "Aujourd'hui" : 'Aperçu'}</T>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h1" style={{ flex: 1, textTransform: 'capitalize' }}>
            {formatLong(date)}
          </T>
          {session && (
            <Pill
              tone="accent"
              text={
                session.absoluteWeek > program.weeks
                  ? `Sem. ${session.absoluteWeek} · rythme S${program.weeks}`
                  : `Semaine ${session.week}/${program.weeks}`
              }
            />
          )}
        </Row>
      </View>

      {beforeStart && (
        <Card>
          <T v="body">
            Le programme démarre le {formatLongWithYear(startDate)}. Tu peux déjà découvrir les séances ou changer la date
            dans les Réglages.
          </T>
        </Card>
      )}

      <WeekStrip
        program={program}
        startDate={startDate}
        today={today}
        selected={selected}
        doneDates={doneDates}
        onSelect={setSelected}
      />

      {session ? (
        <Card>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <T v="title">{session.session.name}</T>
              <T v="muted">{session.session.description}</T>
            </View>
          </Row>
          <Row>
            <T v="big">≈ {session.estimatedMinutes}</T>
            <T v="muted">min</T>
            {doneLog && <Pill tone="done" text="✓ Faite" />}
          </Row>
          <BlockList blocks={session.blocks} warmupTitle={program.warmup.title} />
          <Button
            big
            variant={doneLog && !activeHere ? 'secondary' : 'primary'}
            title={activeHere ? 'Reprendre la séance' : doneLog ? 'Refaire la séance' : 'Démarrer'}
            onPress={() => startOrResume(session, date)}
          />
        </Card>
      ) : (
        <Card>
          <T v="title">Repos</T>
          <T v="muted">Pas de séance prévue ce jour-là.</T>
        </Card>
      )}

      {active && !activeHere && (
        <Button variant="secondary" title="Reprendre la séance en cours" onPress={() => router.push('/seance')} />
      )}

      {!isToday && <Button variant="ghost" title="Revenir à aujourd'hui" onPress={() => setSelected(today)} />}

      <Button variant="ghost" title="Voir toutes les séances" onPress={() => router.push('/seances')} />
      <View style={{ height: space.sm }} />
    </Screen>
  );
}
