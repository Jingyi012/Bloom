export const colors = {
  page: '#F3E7DD',
  background: '#FFF9F3',
  ink: '#33262E',
  inkSoft: '#7A6B72',
  coral: '#FF6F81',
  coralDark: '#E8536A',
  sage: '#6FA97C',
  sageDark: '#39533F',
  sageLight: '#DEEBE0',
  butter: '#FFC857',
  lavender: '#A996CF',
  lavenderLight: '#ECE6F7',
  cardWarm: '#FFEADC',
  card: '#FFFFFF',
  line: '#F0DFCE',
} as const;

// The mockup pairs a friendly serif display face with a clean rounded sans-serif.
// These names are registered by the Expo Google Fonts loader in app/_layout.tsx.
export const typography = {
  ui: 'PlusJakartaSans_400Regular',
  uiMedium: 'PlusJakartaSans_500Medium',
  uiSemiBold: 'PlusJakartaSans_600SemiBold',
  uiBold: 'PlusJakartaSans_700Bold',
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
} as const;

export const shadows = {
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  button: {
    shadowColor: colors.coralDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
