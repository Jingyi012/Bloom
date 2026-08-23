import { StyleSheet } from 'react-native';
import { colors, shadows, spacing, typography } from '@/styles/tokens';

export const screenStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardRoot: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xl, backgroundColor: colors.background },
});

export const primaryButtonStyles = StyleSheet.create({
  button: { ...shadows.button, backgroundColor: colors.coral, borderRadius: 16, padding: spacing.lg, alignItems: 'center' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.5 },
  label: { color: colors.card, fontFamily: typography.uiBold, fontSize: 15 },
});

export const googleSignInButtonStyles = StyleSheet.create({
  button: { ...shadows.card, flexDirection: 'row', gap: spacing.md, alignItems: 'center', justifyContent: 'center', minHeight: 56, borderRadius: 17, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  googleMark: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#F7F9FF', borderWidth: 1, borderColor: '#E2E8FF' },
  label: { color: colors.ink, fontFamily: typography.uiSemiBold, fontSize: 15, letterSpacing: 0.1 },
  pressed: { backgroundColor: colors.cardWarm, borderColor: '#D9C8B9', transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});
