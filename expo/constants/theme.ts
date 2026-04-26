export const Colors = {
  primary: '#6D4C41',
  primaryLight: '#8D6E63',
  primaryDark: '#4E342E',
  secondary: '#D7A86E',
  secondaryLight: '#E6C9A8',
  background: '#FFF8F0',
  surface: '#FFF3E0',
  surfaceVariant: '#F5E6D3',
  onPrimary: '#FFFFFF',
  onBackground: '#3E2723',
  onSurface: '#3E2723',
  onSurfaceVariant: '#5D4037',
  accent: '#4CAF50',
  accentLight: '#81C784',
  error: '#D32F2F',
  warning: '#F57C00',
  info: '#1976D2',
  pending: '#F57C00',
  confirmed: '#4CAF50',
  cancelled: '#9E9E9E',
  border: '#D7CCC8',
  divider: '#E0E0E0',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;
