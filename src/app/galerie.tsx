import { Stack } from 'expo-router';
import { View } from 'react-native';
import { Pictogram } from '../components/Pictogram';
import { Screen, T } from '../components/ui';
import { listPrograms } from '../../content';

/** Galerie de tous les pictogrammes animés (vérification du contenu). */
export default function GalleryScreen() {
  const exercises = Object.assign({}, ...listPrograms().map((p) => p.exercises)) as Record<string, { name: string }>;
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Mouvements' }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {Object.entries(exercises).map(([id, ex]) => (
          <View key={id} style={{ width: 160, gap: 4 }}>
            <Pictogram exerciseId={id} size={160} />
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Pictogram exerciseId={id} size={78} frame={0} />
              <Pictogram exerciseId={id} size={78} frame={1} />
            </View>
            <T v="small" numberOfLines={2}>
              {ex.name}
            </T>
          </View>
        ))}
      </View>
    </Screen>
  );
}
