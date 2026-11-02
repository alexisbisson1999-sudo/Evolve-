import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { targetLabel } from '../domain/program';
import { Pictogram } from './Pictogram';
import type { ResolvedBlock } from '../domain/types';
import { space, usePalette } from '../theme';
import { T } from './ui';

export function BlockList({ blocks, warmupTitle }: { blocks: ResolvedBlock[]; warmupTitle: string }) {
  const c = usePalette();
  const warmup = blocks.filter((b) => b.section === 'warmup');
  const main = blocks.filter((b) => b.section === 'main');

  const item = (b: ResolvedBlock) => (
    <Pressable
      key={b.key}
      onPress={() => router.push(`/exercice/${b.exerciseId}`)}
      accessibilityRole="button"
      accessibilityHint="Voir l'explication"
      style={({ pressed }) => ({
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 52,
        paddingVertical: space.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: c.border,
        opacity: pressed ? 0.6 : 1,
        gap: space.md,
      })}
    >
      <Pictogram exerciseId={b.exerciseId} size={52} animate={false} />
      <T v="body" style={{ flex: 1 }}>
        {b.exercise.name}
      </T>
      <T v="body" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {targetLabel(b)}
      </T>
    </Pressable>
  );

  return (
    <View style={{ gap: space.md }}>
      {warmup.length > 0 && (
        <View>
          <T v="label">
            {warmupTitle} · {warmup.length} mouvements
          </T>
          {warmup.map(item)}
        </View>
      )}
      <View>
        <T v="label">Séance · {main.length} blocs</T>
        {main.map(item)}
      </View>
    </View>
  );
}
