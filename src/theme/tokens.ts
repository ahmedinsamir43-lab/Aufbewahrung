/**
 * Design-Tokens. Alle Farben existieren in einer hellen und einer dunklen Variante;
 * Komponenten greifen ausschließlich über `useTheme()` darauf zu.
 */
import type { TextStyle } from 'react-native';

const accent = '#2563EB';

export const palette = {
  light: {
    accent,
    accentPressed: '#1D4ED8',
    /** Fläche mit weißer Schrift (Kontrast ≥ 4,5 : 1 in beiden Modi). */
    hero: accent,
    accentSoft: '#E8EFFD',
    onAccent: '#FFFFFF',
    background: '#F7F6F3', // warmes Off-White
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    border: '#ECE9E3',
    borderStrong: '#DAD6CE',
    text: '#1A1917',
    textSecondary: '#6E6A63',
    textTertiary: '#A19C93',
    danger: '#DC2626',
    dangerSoft: '#FDECEC',
    warning: '#B45309',
    warningSoft: '#FDF3E3',
    success: '#15803D',
    successSoft: '#E7F6EC',
    carbs: '#F59E0B',
    protein: accent,
    fat: '#E11D74',
    over: '#DC2626',
    ringTrack: '#EFECE6',
    shadow: '#3B2F1E',
  },
  dark: {
    accent: '#4F86F7',
    accentPressed: '#3B74EE',
    hero: '#2557D6',
    accentSoft: '#1B2740',
    onAccent: '#FFFFFF',
    background: '#0F0F10',
    card: '#1A1A1C',
    cardElevated: '#222225',
    border: '#2A2A2D',
    borderStrong: '#3A3A3E',
    text: '#F4F3F0',
    textSecondary: '#A9A49C',
    textTertiary: '#77736C',
    danger: '#F87171',
    dangerSoft: '#3A1A1A',
    warning: '#FBBF24',
    warningSoft: '#33270F',
    success: '#4ADE80',
    successSoft: '#12291A',
    carbs: '#FBBF24',
    protein: '#60A5FA',
    fat: '#F472B6',
    over: '#F87171',
    ringTrack: '#2A2A2D',
    shadow: '#000000',
  },
} as const;

export type ThemeColors = { [K in keyof typeof palette.light]: string };

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

/** Auf Android wählt `fontWeight` keine Schriftschnitte aus – daher eine Familie je Schnitt. */
export const typography = {
  hero: { fontFamily: fonts.extrabold, fontSize: 52, lineHeight: 58, letterSpacing: -1.5 },
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  headline: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8 },
  number: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export const motion = {
  spring: { damping: 18, stiffness: 220, mass: 0.8 },
  ringDurationMs: 900,
  stepDurationMs: 260,
} as const;
