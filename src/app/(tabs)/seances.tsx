import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Card, Pill, Row, Screen, T } from '../../components/ui';
import { programWeek, resolveSession } from '../../domain/program';
import type { Weekday } from '../../domain/types';
import { useProgram, useResolveOptions, useToday } from '../../hooks/useProgram';
import { useAppStore } from '../../store/useAppStore';
import { space, usePalette } from '../../theme';

const DAY_NAMES: Record<Weekday, string> = {
  '1': 'lun', '2': 'mar', '3': 'mer', '4': 'jeu', '5': 'ven', '6': 'sam', '0': 'dim',
};
const ORDER: Weekday[] = ['1', '2', '3', '4', '5', '6', '0'];

export default function SessionsScreen() {
  const c = usePalette();
  const program = useProgram();
  const startDate = useAppStore((s) => s.settings.startDate);
  const opts = useResolveOptions();
  const today = useToday();
  const week = programWeek(program, startDate, today);

  const daysFor = (sid: string) =>
    ORDER.filter((d) => {
      const v = program.schedule.weekdays[d];
      if (v === sid) return true;
      return v.startsWith('rotation:') && program.schedule.rotations[v.slice(9)]?.includes(sid);
    }).map((d) => DAY_NAMES[d]);

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <T v="title">{program.name}</T>
        <T v="muted">{program.description}</T>
        <Row style={{ flexWrap: 'wrap', marginTop: 4 }}>
          <Pill tone="accent" text={`Semaine ${week}/${program.weeks}`} />
          {program.equipment.map((e) => (
            <Pill key={e} text={e} />
          ))}
        </Row>
      </View>

      {Object.values(program.sessions).map((s) => {
        const r = resolveSession(program, s.id, week, opts);
        const days = daysFor(s.id);
        const rotates = Object.values(program.schedule.rotations).some((rot) => rot.includes(s.id));
        return (
          <Pressable
            key={s.id}
            onPress={() => router.push(`/apercu/${s.id}`)}
            accessibilityRole="button"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Card>
              <Row style={{ alignItems: 'flex-start' }} gap={space.md}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: c.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <T v="title" style={{ color: c.text }}>
                    {s.shortName}
                  </T>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <T v="title">{s.name}</T>
                  <T v="muted">{s.description}</T>
                  <Row style={{ flexWrap: 'wrap', marginTop: 4 }}>
                    <Pill text={`≈ ${r.estimatedMinutes} min`} />
                    <Pill text={`${r.blocks.filter((b) => b.section === 'main').length} blocs`} />
                    {days.length > 0 && <Pill text={`${days.join(', ')}${rotates ? ' (en alternance)' : ''}`} />}
                  </Row>
                </View>
              </Row>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
