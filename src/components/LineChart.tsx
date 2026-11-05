import { useState } from 'react';
import { Platform, Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { formatShort, parseISODate } from '../domain/dates';
import { usePalette } from '../theme';
import { T } from './ui';

const FONT = Platform.OS === 'web' ? 'Nunito_700Bold, system-ui, sans-serif' : 'Nunito_700Bold';

export interface Point {
  date: string;
  value: number;
}

/**
 * Courbe simple (une série) avec ligne d'objectif en pointillés.
 * Toucher le graphique affiche la valeur la plus proche.
 */
export function LineChart({
  points,
  goal,
  unit,
  height = 200,
}: {
  points: Point[];
  goal?: number;
  unit: string;
  height?: number;
}) {
  const c = usePalette();
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<number | null>(null);

  const data = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const fmt = (v: number) => `${String(Math.round(v * 10) / 10).replace('.', ',')} ${unit}`;

  if (data.length === 0) {
    return (
      <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <T v="muted">Aucune mesure pour l'instant.</T>
      </View>
    );
  }

  const padL = 44;
  const padR = 12;
  const padT = 16;
  const padB = 26;
  const values = data.map((p) => p.value).concat(goal !== undefined ? [goal] : []);
  let min = Math.min(...values);
  let max = Math.max(...values);
  const span = Math.max(max - min, 2);
  min -= span * 0.15;
  max += span * 0.15;

  const t0 = parseISODate(data[0].date).getTime();
  const t1 = parseISODate(data[data.length - 1].date).getTime();
  const plotW = Math.max(1, width - padL - padR);
  const plotH = height - padT - padB;
  const x = (iso: string) =>
    t1 === t0 ? padL + plotW / 2 : padL + ((parseISODate(iso).getTime() - t0) / (t1 - t0)) * plotW;
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * plotH;

  const path = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const rawStep = (max - min) / 3;
  const step = rawStep <= 1 ? 1 : rawStep <= 2 ? 2 : rawStep <= 5 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) ticks.push(t);

  const onPress = (lx: number) => {
    let best = 0;
    data.forEach((p, i) => {
      if (Math.abs(x(p.date) - lx) < Math.abs(x(data[best].date) - lx)) best = i;
    });
    setSel(best === sel ? null : best);
  };

  const s = sel !== null ? data[sel] : null;
  const last = data[data.length - 1];

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <T v="small" style={{ marginBottom: 4, minHeight: 20 }}>
        {s ? `${formatShort(s.date)} : ${fmt(s.value)}` : `Dernière : ${fmt(last.value)} · touche la courbe pour le détail`}
      </T>
      {width > 0 && (
        <Pressable
          onPress={(e) => onPress(e.nativeEvent.locationX)}
          accessibilityLabel={`Graphique, dernière valeur ${fmt(last.value)}${goal !== undefined ? `, objectif ${fmt(goal)}` : ''}`}
        >
          <Svg width={width} height={height}>
            {ticks.map((t) => (
              <Line key={t} x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke={c.grid} strokeWidth={1} />
            ))}
            {ticks.map((t) => (
              <SvgText fontFamily={FONT} key={`l${t}`} x={padL - 6} y={y(t) + 4} fontSize={11} fill={c.textFaint} textAnchor="end">
                {String(Math.round(t * 10) / 10).replace('.', ',')}
              </SvgText>
            ))}
            {goal !== undefined && (
              <>
                <Line
                  x1={padL}
                  x2={width - padR}
                  y1={y(goal)}
                  y2={y(goal)}
                  stroke={c.done}
                  strokeWidth={2}
                  strokeDasharray="6 5"
                />
                <SvgText fontFamily={FONT} x={width - padR} y={y(goal) - 6} fontSize={12} fontWeight="700" fill={c.textMuted} textAnchor="end">
                  {`Objectif ${fmt(goal)}`}
                </SvgText>
              </>
            )}
            <Path d={path} stroke={c.accent} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {data.map((p, i) => (
              <Circle
                key={p.date}
                cx={x(p.date)}
                cy={y(p.value)}
                r={sel === i ? 6 : 4}
                fill={c.accent}
                stroke={c.surface}
                strokeWidth={2}
              />
            ))}
            {s && <Line x1={x(s.date)} x2={x(s.date)} y1={padT} y2={height - padB} stroke={c.textFaint} strokeWidth={1} />}
            <SvgText fontFamily={FONT} x={padL} y={height - 6} fontSize={11} fill={c.textFaint}>
              {formatShort(data[0].date)}
            </SvgText>
            {data.length > 1 && (
              <SvgText fontFamily={FONT} x={width - padR} y={height - 6} fontSize={11} fill={c.textFaint} textAnchor="end">
                {formatShort(last.date)}
              </SvgText>
            )}
          </Svg>
        </Pressable>
      )}
    </View>
  );
}
