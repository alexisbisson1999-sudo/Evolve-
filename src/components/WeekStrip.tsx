import { Pressable, Text, View } from 'react-native';
import { addDays, dayShort, mondayOf, parseISODate } from '../domain/dates';
import { sessionIdForDate } from '../domain/program';
import type { Program } from '../domain/types';
import { radius, usePalette } from '../theme';

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
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {days.map((d) => {
        const sid = sessionIdForDate(program, startDate, d);
        const short = sid ? program.sessions[sid].shortName : '–';
        const done = doneDates.has(d);
        const isToday = d === today;
        const isSel = d === selected;
        const kindLabel = sid ? program.sessions[sid].name : 'Repos';
        return (
          <Pressable
            key={d}
            onPress={() => onSelect(d)}
            accessibilityRole="button"
            accessibilityLabel={`${dayShort(d)} ${parseISODate(d).getDate()} : ${kindLabel}${done ? ', faite' : ''}`}
            accessibilityState={{ selected: isSel }}
            style={{
              flex: 1,
              minHeight: 78,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              backgroundColor: isSel ? c.accent : done ? c.doneSoft : c.surface,
              borderWidth: isToday && !isSel ? 2 : 0,
              borderColor: c.accent,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: isSel ? c.accentText : c.textMuted }}>
              {dayShort(d)}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: isSel ? c.accentText : c.text }}>{short}</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: isSel ? c.accentText : c.done, height: 18 }}>
              {done ? '✓' : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
