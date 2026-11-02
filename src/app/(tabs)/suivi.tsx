import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { LineChart } from '../../components/LineChart';
import { Button, Card, Field, Pill, Row, Screen, Segmented, T, formatKg, parseNumber } from '../../components/ui';
import { formatDuration, formatLongWithYear, formatShort, todayISO } from '../../domain/dates';
import { useAppStore } from '../../store/useAppStore';
import { space, usePalette } from '../../theme';

function confirmDelete(message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(message)) onYes();
    return;
  }
  Alert.alert('Supprimer', message, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: onYes },
  ]);
}

const fmt1 = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

export default function TrackingScreen() {
  const c = usePalette();
  const measurements = useAppStore((s) => s.measurements);
  const history = useAppStore((s) => s.history);
  const settings = useAppStore((s) => s.settings);
  const saveMeasurement = useAppStore((s) => s.saveMeasurement);
  const deleteMeasurement = useAppStore((s) => s.deleteMeasurement);
  const deleteLog = useAppStore((s) => s.deleteLog);

  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [metric, setMetric] = useState<'weight' | 'waist'>('weight');
  const [openLog, setOpenLog] = useState<string | null>(null);

  const weights = measurements.filter((m) => m.weight !== undefined).map((m) => ({ date: m.date, value: m.weight! }));
  const waists = measurements.filter((m) => m.waist !== undefined).map((m) => ({ date: m.date, value: m.waist! }));
  const firstW = weights[0]?.value;
  const lastW = weights[weights.length - 1]?.value;

  const save = () => {
    const w = parseNumber(weight);
    const t = parseNumber(waist);
    if (w === undefined && t === undefined) return;
    if ((w !== undefined && (w < 30 || w > 300)) || (t !== undefined && (t < 40 || t > 250))) {
      Alert.alert('Valeur inhabituelle', 'Vérifie la saisie (poids en kg, tour de taille en cm).');
      return;
    }
    saveMeasurement({ date: todayISO(), weight: w, waist: t });
    setWeight('');
    setWaist('');
  };

  return (
    <Screen>
      {/* Saisie */}
      <Card>
        <T v="title">Mesure du jour</T>
        <Row gap={space.md}>
          <Field label="Poids (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder={lastW ? fmt1(lastW) : '89,5'} />
          <Field label="Tour de taille (cm)" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" placeholder="—" />
        </Row>
        <Button title="Enregistrer" onPress={save} disabled={!weight.trim() && !waist.trim()} />
        <T v="small">Conseil : pèse-toi le matin à jeun, au même moment, 1 à 2 fois par semaine.</T>
      </Card>

      {/* Synthèse */}
      {lastW !== undefined && (
        <Row gap={space.md}>
          <Card style={{ flex: 1, gap: 2 }}>
            <T v="label">Actuel</T>
            <T v="h1" style={{ fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>{fmt1(lastW)}</T>
            <T v="small">kg</T>
          </Card>
          <Card style={{ flex: 1, gap: 2 }}>
            <T v="label">Depuis le début</T>
            <T v="h1" style={{ fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>{firstW !== undefined ? `${lastW - firstW > 0 ? '+' : ''}${fmt1(lastW - firstW)}` : '—'}</T>
            <T v="small">kg</T>
          </Card>
          <Card style={{ flex: 1, gap: 2 }}>
            <T v="label">Objectif</T>
            <T v="h1" style={{ fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>{fmt1(Math.max(0, lastW - settings.goalWeight))}</T>
            <T v="small">kg restants</T>
          </Card>
        </Row>
      )}

      {/* Courbe */}
      <Card>
        <Segmented
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'weight', label: 'Poids' },
            { value: 'waist', label: 'Tour de taille' },
          ]}
        />
        {metric === 'weight' ? (
          <LineChart points={weights} goal={settings.goalWeight} unit="kg" />
        ) : (
          <LineChart points={waists} goal={settings.goalWaist} unit="cm" />
        )}
      </Card>

      {/* Historique des mesures */}
      {measurements.length > 0 && (
        <Card>
          <T v="title">Mesures</T>
          {[...measurements].reverse().map((m) => (
            <Pressable
              key={m.id}
              onLongPress={() => confirmDelete(`Supprimer la mesure du ${formatShort(m.date)} ?`, () => deleteMeasurement(m.id))}
              accessibilityHint="Appui long pour supprimer"
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                minHeight: 44,
                alignItems: 'center',
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderColor: c.border,
              }}
            >
              <T v="body">{formatShort(m.date)}</T>
              <T v="body" style={{ fontVariant: ['tabular-nums'] }}>
                {m.weight !== undefined ? formatKg(m.weight) : '—'} · {m.waist !== undefined ? `${fmt1(m.waist)} cm` : '—'}
              </T>
            </Pressable>
          ))}
          <T v="small">Appui long sur une ligne pour la supprimer.</T>
        </Card>
      )}

      {/* Historique des séances */}
      <Card>
        <T v="title">Historique des séances</T>
        {history.length === 0 && <T v="muted">Aucune séance enregistrée pour l'instant.</T>}
        {history.map((h) => {
          const validated = h.blocks.filter((b) => b.validated).length;
          const open = openLog === h.id;
          return (
            <View key={h.id} style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border, paddingVertical: space.sm, gap: 6 }}>
              <Pressable
                onPress={() => setOpenLog(open ? null : h.id)}
                onLongPress={() => confirmDelete('Supprimer cette séance de l’historique ?', () => deleteLog(h.id))}
                accessibilityRole="button"
                style={{ minHeight: 48, gap: 4 }}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="body" style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>
                    {h.feeling ? `${{ hard: '😮‍💨', ok: '🙂', easy: '💪' }[h.feeling]} ` : ''}
                    {h.sessionName}
                  </T>
                  <Pill tone={validated === h.blocks.length ? 'done' : 'neutral'} text={`${validated}/${h.blocks.length} blocs`} />
                </Row>
                <T v="small">
                  {formatLongWithYear(h.date)} · {formatDuration(h.durationSec)} · semaine {h.week}
                </T>
              </Pressable>
              {open &&
                h.blocks.map((b) => (
                  <Row key={b.key} style={{ justifyContent: 'space-between' }}>
                    <T v="small" style={{ flex: 1 }}>
                      {b.validated ? '✓' : '○'} {b.name}
                    </T>
                    <T v="small">
                      {b.setsDone}/{b.setsTotal}
                      {b.load !== undefined ? ` · ${formatKg(b.load)}` : ''}
                    </T>
                  </Row>
                ))}
            </View>
          );
        })}
        {history.length > 0 && <T v="small">Touche une séance pour le détail, appui long pour la supprimer.</T>}
      </Card>
    </Screen>
  );
}
