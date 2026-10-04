/**
 * Design-Tokens. Alle Farben existieren in einer hellen und einer dunklen Variante;
 * Komponenten greifen ausschließlich über `useTheme()` darauf zu.
 */

const accent = '#2563EB';

export const palette = {
  light: {
    accent,
    accentSoft: '#DBEAFE',
    onAccent: '#FFFFFF',
    background: '#F8F7F4', // warmes Off-White
    card: '#FFFFFF',
    border: '#ECEAE4',
    text: '#1C1B19',
    textSecondary: '#6B6862',
    danger: '#DC2626',
    warning: '#D97706',
    success: '#16A34A',
    carbs: '#F59E0B',
    protein: accent,
    fat: '#EC4899',
    over: '#DC2626',
    ringTrack: '#EEECE7',
    shadow: 'rgba(28, 27, 25, 0.08)',
  },
  dark: {
    accent: '#3B82F6',
    accentSoft: '#1E2A44',
    onAccent: '#FFFFFF',
    background: '#121212',
    card: '#1C1C1E',
    border: '#2C2C2E',
    text: '#F5F5F4',
    textSecondary: '#A8A29E',
    danger: '#F87171',
    warning: '#FBBF24',
    success: '#4ADE80',
    carbs: '#FBBF24',
    protein: '#60A5FA',
    fat: '#F472B6',
    over: '#F87171',
    ringTrack: '#2C2C2E',
    shadow: 'rgba(0, 0, 0, 0.4)',
  },
} as const;

export type ThemeColors = { [K in keyof typeof palette.light]: string };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;
