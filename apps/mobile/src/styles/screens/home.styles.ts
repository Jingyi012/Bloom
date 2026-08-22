import { StyleSheet } from 'react-native';
import { colors, spacing } from '@/styles/tokens';

export const homeStyles = StyleSheet.create({
  eyebrow: { color: colors.coralDark, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700', marginTop: spacing.sm },
  cta: { backgroundColor: colors.coral, borderRadius: 22, marginTop: spacing.xl, padding: spacing.xl },
  ctaTitle: { color: colors.card, fontSize: 20, fontWeight: '700' },
  ctaBody: { color: colors.card, fontSize: 13, marginTop: spacing.sm, opacity: 0.9 },
  section: { color: colors.inkSoft, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: spacing.xxl, textTransform: 'uppercase' },
  card: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.line, borderRadius: 22, borderWidth: 1, flexDirection: 'row', marginTop: spacing.md, padding: spacing.lg },
  cardEmoji: { fontSize: 30, marginRight: spacing.md },
  cardCopy: { flex: 1 },
  cardTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  cardBody: { color: colors.inkSoft, fontSize: 12, marginTop: spacing.xs },
});
