import { StyleSheet } from 'react-native';
import { colors, shadows, spacing, typography } from '@/styles/tokens';

export const screenStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.xl, backgroundColor: colors.background },
});

export const primaryButtonStyles = StyleSheet.create({
  button: { ...shadows.button, backgroundColor: colors.coral, borderRadius: 16, padding: spacing.lg, alignItems: 'center' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.5 },
  label: { color: colors.card, fontFamily: typography.uiBold, fontSize: 15 },
});

export const googleSignInButtonStyles = StyleSheet.create({
  button: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  googleMark: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  googleText: { color: '#4285F4', fontFamily: typography.uiBold, fontSize: 18 },
  label: { color: colors.ink, fontFamily: typography.uiBold, fontSize: 15 },
  pressed: { backgroundColor: colors.cardWarm },
  disabled: { opacity: 0.5 },
});
