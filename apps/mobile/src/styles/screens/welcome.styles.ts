import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/styles/tokens';

export const welcomeStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 72 },
  emoji: { fontSize: 64, marginBottom: spacing.xl },
  eyebrow: { color: colors.coralDark, fontFamily: typography.display, fontSize: 12, letterSpacing: 3, marginBottom: spacing.sm },
  title: { color: colors.ink, fontFamily: typography.display, fontSize: 30, textAlign: 'center', lineHeight: 38 },
  body: { color: colors.inkSoft, fontFamily: typography.ui, fontSize: 15, lineHeight: 23, marginTop: spacing.lg, maxWidth: 320, textAlign: 'center' },
  spacer: { flex: 1, minHeight: 120 },
  note: { color: colors.inkSoft, fontSize: 11, marginTop: spacing.md, textAlign: 'center' },
  error: { color: colors.coralDark, fontSize: 12, marginTop: spacing.md, textAlign: 'center' },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center', gap: spacing.md },
});
