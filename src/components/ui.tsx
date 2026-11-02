import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap } from '../services/feedback';
import { font, radius, space, TOUCH, usePalette } from '../theme';

/* ---------- Texte ---------- */

type Variant = 'h1' | 'title' | 'body' | 'muted' | 'small' | 'big' | 'huge' | 'label';

export function T({
  v = 'body',
  style,
  children,
  numberOfLines,
  selectable,
  adjustsFontSizeToFit,
}: {
  v?: Variant;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
  selectable?: boolean;
  adjustsFontSizeToFit?: boolean;
}) {
  const c = usePalette();
  const base: Record<Variant, TextStyle> = {
    h1: { fontSize: font.h1, fontWeight: '800', color: c.text },
    title: { fontSize: font.title, fontWeight: '700', color: c.text },
    body: { fontSize: font.body, color: c.text, lineHeight: 23 },
    muted: { fontSize: font.body, color: c.textMuted, lineHeight: 23 },
    small: { fontSize: font.small, color: c.textMuted },
    label: { fontSize: 13, fontWeight: '700', color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase' },
    big: { fontSize: font.big, fontWeight: '800', color: c.text, fontVariant: ['tabular-nums'] },
    huge: { fontSize: font.huge, fontWeight: '800', color: c.text, fontVariant: ['tabular-nums'] },
  };
  return (
    <Text
      style={[base[v], style]}
      numberOfLines={numberOfLines}
      selectable={selectable}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
    >
      {children}
    </Text>
  );
}

/* ---------- Mise en page ---------- */

export function Screen({
  children,
  footer,
  scroll = true,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const content = <View style={{ padding: space.lg, gap: space.lg }}>{children}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: footer ? space.lg : insets.bottom + space.xl }}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
      {footer ? (
        <View
          style={{
            paddingHorizontal: space.lg,
            paddingTop: space.md,
            paddingBottom: insets.bottom + space.md,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
            backgroundColor: c.surface,
            gap: space.sm,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: radius.lg,
          padding: space.lg,
          gap: space.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Row({
  children,
  style,
  gap = space.sm,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

/* ---------- Boutons ---------- */

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'done';

export function Button({
  title,
  onPress,
  variant = 'primary',
  big,
  disabled,
  style,
  icon,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: BtnVariant;
  big?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
  accessibilityLabel?: string;
}) {
  const c = usePalette();
  const bg: Record<BtnVariant, string> = {
    primary: c.accent,
    secondary: c.surfaceAlt,
    ghost: 'transparent',
    danger: 'transparent',
    done: c.done,
  };
  const fg: Record<BtnVariant, string> = {
    primary: c.accentText,
    secondary: c.text,
    ghost: c.accent,
    danger: c.danger,
    done: c.scheme === 'dark' ? '#0D0F12' : '#FFFFFF',
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        {
          minHeight: big ? 64 : TOUCH - 8,
          borderRadius: radius.md,
          backgroundColor: bg[variant],
          paddingHorizontal: space.lg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space.sm,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
          borderWidth: variant === 'danger' ? 1 : 0,
          borderColor: c.danger,
        },
        style,
      ]}
    >
      {icon}
      <Text style={{ color: fg[variant], fontSize: big ? 20 : 17, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}

/** Bouton carré compact (−/+), zone tactile ≥ 48 pt. */
export function IconButton({
  label,
  onPress,
  accessibilityLabel,
  size = 52,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        tap();
        onPress();
      }}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: c.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

/* ---------- Saisie ---------- */

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  format = (v: number) => String(v),
  label,
  bigValue,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  label: string;
  bigValue?: boolean;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v * 100) / 100));
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <IconButton label="−" accessibilityLabel={`Diminuer ${label}`} onPress={() => onChange(clamp(value - step))} />
      <View style={{ alignItems: 'center', flex: 1 }} accessible accessibilityLabel={`${label} : ${format(value)}`}>
        <T v={bigValue ? 'big' : 'title'}>{format(value)}</T>
      </View>
      <IconButton label="+" accessibilityLabel={`Augmenter ${label}`} onPress={() => onChange(clamp(value + step))} />
    </Row>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const c = usePalette();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: space.xs, flex: 1 }}>
      <T v="small">{label}</T>
      <TextInput
        placeholderTextColor={c.textFaint}
        style={[
          {
            minHeight: 52,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surfaceAlt,
            color: c.text,
            paddingHorizontal: space.md,
            fontSize: 18,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  const c = usePalette();
  return (
    <Row gap={4} style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 4 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? c.surface : 'transparent',
            }}
          >
            <Text style={{ color: active ? c.text : c.textMuted, fontWeight: active ? '700' : '500', fontSize: 15 }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

export function Pill({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'accent' | 'done' }) {
  const c = usePalette();
  const bg = tone === 'accent' ? c.accentSoft : tone === 'done' ? c.doneSoft : c.surfaceAlt;
  const fg = tone === 'accent' ? c.accent : tone === 'done' ? c.done : c.textMuted;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: fg, fontSize: 13, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

/** Parse un nombre saisi à la française (« 89,5 »). */
export function parseNumber(s: string): number | undefined {
  const v = Number(s.replace(',', '.').trim());
  return s.trim() && Number.isFinite(v) ? v : undefined;
}

export function formatKg(v: number): string {
  return `${String(v).replace('.', ',')} kg`;
}
