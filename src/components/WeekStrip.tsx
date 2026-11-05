import { Pressable, View } from 'react-native';
import { addDays, dayShort, mondayOf, parseISODate } from '../domain/dates';
import { sessionIdForDate } from '../domain/program';
import type { Program } from '../domain/types';
import { usePalette } from '../theme';
import { Text } from './ui';

/** Semaine en pastilles rondes : jour, type de séance, coche si faite. */
export function WeekStrip({
  program,
  startDate,
  today,
  selected,
  doneDates,
  onSelect,
}: {
  program: Program;
  startDate: string;
  today: string;
  selected: string;
  doneDates: Set<string>;
  onSelect: (date: string) => void;
}) {
  const c = usePalette();
  const monday = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {days.map((d) => {
        const sid = sessionIdForDate(program, startDate, d);
        const short = sid ? program.sessions[sid].shortName : '–';
        const done = doneDates.has(d);
        const isToday = d === today;
        const isSel = d === selected;
        const kindLabel = sid ? program.sessions[sid].name : 'Repos';
        const bg = isSel ? c.accent : done ? c.done : c.surfaceAlt;
        const fg = isSel ? c.accentText : done ? (c.scheme === 'dark' ? '#0D0F12' : '#FFFFFF') : c.text;
        return (
          <Pressable
            key={d}
            onPress={() => onSelect(d)}
            accessibilityRole="button"
            accessibilityLabel={`${dayShort(d)} ${parseISODate(d).getDate()} : ${kindLabel}${done ? ', faite' : ''}`}
            accessibilityState={{ selected: isSel }}
            style={{ alignItems: 'center', gap: 6, minWidth: 44 }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: isToday ? c.accent : c.textFaint }}>
              {dayShort(d)}
            </Text>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: bg,
                borderWidth: isToday && !isSel ? 2 : 0,
                borderColor: c.accent,
              }}
            >
              <Text style={{ fontSize: done && !isSel ? 20 : 17, fontWeight: '900', color: fg }}>
                {done && !isSel ? '✓' : short}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
