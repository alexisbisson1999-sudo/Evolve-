import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { usePalette } from '../theme';
import { Text } from './ui';

/** Anneau de progression (ex. séances faites cette semaine). */
export function ProgressRing({ value, total, size = 84 }: { value: number; total: number; size?: number }) {
  const c = usePalette();
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityLabel={`${value} sur ${total}`}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.surfaceAlt} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={c.done}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: 22, fontWeight: '900', color: c.text }}>
        {value}
        <Text style={{ fontSize: 14, fontWeight: '700', color: c.textFaint }}>/{total}</Text>
      </Text>
    </View>
  );
}
