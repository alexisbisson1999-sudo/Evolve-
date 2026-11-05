import { Modal, Pressable, ScrollView, View } from 'react-native';
import { create } from 'zustand';
import { radius, space, usePalette } from '../theme';
import { Button, T } from './ui';

/**
 * Boîte de dialogue intégrée à l'app (remplace Alert.alert / window.confirm,
 * qui ne fonctionnent pas sur le web ni dans un aperçu intégré).
 */
export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface DialogState {
  current: { title: string; message?: string; buttons: DialogButton[] } | null;
  show: (title: string, message?: string, buttons?: DialogButton[]) => void;
  close: () => void;
}

const useDialog = create<DialogState>((set) => ({
  current: null,
  show: (title, message, buttons = [{ text: 'OK' }]) => set({ current: { title, message, buttons } }),
  close: () => set({ current: null }),
}));

/** Affiche une boîte de dialogue (utilisable hors composant). */
export function showDialog(title: string, message?: string, buttons?: DialogButton[]) {
  useDialog.getState().show(title, message, buttons);
}

/** À placer une fois à la racine de l'app. */
export function DialogHost() {
  const c = usePalette();
  const current = useDialog((s) => s.current);
  const close = useDialog((s) => s.close);
  if (!current) return null;
  const cancel = current.buttons.find((b) => b.style === 'cancel');

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => { close(); cancel?.onPress?.(); }}>
      <Pressable
        onPress={() => {
          close();
          cancel?.onPress?.();
        }}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', padding: space.lg }}
        accessibilityLabel="Fermer"
      >
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: c.surface, borderRadius: radius.xl, padding: space.xl, gap: space.md, marginBottom: space.lg }}
          accessibilityRole="alert"
        >
          <T v="title">{current.title}</T>
          {current.message ? (
            <ScrollView style={{ maxHeight: 360 }}>
              <T v="muted" selectable>
                {current.message}
              </T>
            </ScrollView>
          ) : null}
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            {current.buttons.map((b) => (
              <Button
                key={b.text}
                title={b.text}
                big
                variant={b.style === 'destructive' ? 'danger' : b.style === 'cancel' ? 'secondary' : 'primary'}
                onPress={() => {
                  close();
                  b.onPress?.();
                }}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
