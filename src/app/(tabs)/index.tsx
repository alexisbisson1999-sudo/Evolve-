import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BlockList } from '../../components/BlockList';
import { Pictogram } from '../../components/Pictogram';
import { ProgressRing } from '../../components/ProgressRing';
import { Button, Card, Pill, Row, Screen, softShadow, T, Text } from '../../components/ui';
import { WeekStrip } from '../../components/WeekStrip';
import { addDays, diffDays, formatLong, formatLongWithYear, mondayOf } from '../../domain/dates';
import { sessionIdForDate } from '../../domain/program';
import { useProgram, useSessionForDate, useToday } from '../../hooks/useProgram';
import { startOrResume } from '../../services/workout';
import { useAppStore } from '../../store/useAppStore';
import { radius, space, usePalette } from '../../theme';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5 || h >= 18) return 'Bonsoir';
  return 'Bonjour';
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function TodayScreen() {
  const c = usePalette();
  const today = useToday();
  const [selected, setSelected] = useState(today);
  const [showDetail, setShowDetail] = useState(false);
  const program = useProgram();
  const startDate = useAppStore((s) => s.settings.startDate);
  const history = useAppStore((s) => s.history);
  const active = useAppStore((s) => s.active);
  const measurements = useAppStore((s) => s.measurements);
  const goalWeight = useAppStore((s) => s.settings.goalWeight);

  const date = selected;
  const session = useSessionForDate(date);
  const doneDates = useMemo(() => new Set(history.map((h) => h.date)), [history]);
  const doneLog = history.find((h) => h.date === date);
  const beforeStart = diffDays(startDate, today) < 0;
  const isToday = date === today;
  const activeHere = active && session && active.sessionId === session.sessionId && active.date === date;

  // Progression de la semaine
  const week = Array.from({ length: 7 }, (_, i) => addDays(mondayOf(today), i));
  const planned = week.filter((d) => sessionIdForDate(program, startDate, d)).length;
  const doneThisWeek = week.filter((d) => doneDates.has(d)).length;
  const lastWeight = [...measurements].reverse().find((m) => m.weight !== undefined)?.weight;

  const kind = session?.session.kind ?? 'force';
  const firstMain = session?.blocks.find((b) => b.section === 'main');
  const mainCount = session?.blocks.filter((b) => b.section === 'main').length ?? 0;

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <T v="h1">{greeting()} 👋</T>
        <T v="muted">{capitalize(formatLong(today))}</T>
      </View>

      {/* Ma semaine */}
      <Card>
        <Row gap={space.lg}>
          <ProgressRing value={doneThisWeek} total={planned} />
          <View style={{ flex: 1, gap: 4 }}>
            <T v="title">
              {doneThisWeek === 0
                ? 'Ta semaine commence'
                : doneThisWeek >= planned
                  ? 'Semaine bouclée, bravo !'
                  : `${doneThisWeek} séance${doneThisWeek > 1 ? 's' : ''} cette semaine`}
            </T>
            <T v="small">
              {session
                ? session.absoluteWeek > program.weeks
                  ? `Semaine ${session.absoluteWeek} · rythme de la semaine ${program.weeks}`
                  : `Semaine ${session.week} sur ${program.weeks}`
                : program.name}
              {lastWeight !== undefined ? ` · ${String(lastWeight).replace('.', ',')} kg → ${String(goalWeight).replace('.', ',')} kg` : ''}
            </T>
          </View>
        </Row>
        <WeekStrip
          program={program}
          startDate={startDate}
          today={today}
          selected={selected}
          doneDates={doneDates}
          onSelect={setSelected}
        />
      </Card>

      {beforeStart && (
        <T v="small" style={{ textAlign: 'center' }}>
          Le programme démarre le {formatLongWithYear(startDate)} (modifiable dans Réglages).
        </T>
      )}

      {/* Séance du jour */}
      {session ? (
        <View style={{ backgroundColor: c.tiles[kind], borderRadius: radius.xl, padding: space.xl, gap: space.md, ...softShadow(c.scheme) }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 6 }}>
              <T v="label" style={{ color: c.accent }}>
                {isToday ? 'Séance du jour' : capitalize(formatLong(date))}
              </T>
              <T v="h1" style={{ fontSize: 26 }}>
                {session.session.name}
              </T>
              <Row style={{ flexWrap: 'wrap' }} gap={6}>
                <Pill text={`⏱ ${session.estimatedMinutes} min`} />
                <Pill text={`${mainCount} exercice${mainCount > 1 ? 's' : ''}`} />
                {doneLog ? <Pill tone="done" text="✓ Faite" /> : null}
              </Row>
            </View>
            {firstMain ? <Pictogram exerciseId={firstMain.exerciseId} size={110} framed={false} /> : null}
          </Row>

          <Button
            big
            variant={doneLog && !activeHere ? 'secondary' : 'primary'}
            title={activeHere ? 'Reprendre' : doneLog ? 'Refaire la séance' : 'Commencer'}
            onPress={() => startOrResume(session, date)}
          />

          <Pressable
            onPress={() => setShowDetail((v) => !v)}
            accessibilityRole="button"
            style={{ alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12, minHeight: 36 }}
          >
            <Text style={{ fontWeight: '800', color: c.textMuted }}>{showDetail ? 'Masquer le détail ▲' : 'Voir le détail ▼'}</Text>
          </Pressable>
          {showDetail && (
            <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.md }}>
              <BlockList blocks={session.blocks} warmupTitle={program.warmup.title} />
            </View>
          )}
        </View>
      ) : (
        <View style={{ backgroundColor: c.tiles.mobilite, borderRadius: radius.xl, padding: space.xl, gap: 6, ...softShadow(c.scheme) }}>
          <T v="h1" style={{ fontSize: 26 }}>
            Jour de repos 🌿
          </T>
          <T v="muted">Récupère bien : une petite marche fait toujours du bien.</T>
        </View>
      )}

      {active && !activeHere && (
        <Button variant="secondary" title="Reprendre la séance en cours" onPress={() => router.push('/seance')} />
      )}
      {!isToday && <Button variant="ghost" title="Revenir à aujourd'hui" onPress={() => setSelected(today)} />}
      <Button variant="ghost" title="Toutes les séances" onPress={() => router.push('/seances')} />
    </Screen>
  );
}
