import { StyleSheet } from 'react-native';
import { colors, spacing } from '@/styles/tokens';

export const homeStyles = StyleSheet.create({
  eyebrow: { color: colors.coralDark, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700', marginTop: spacing.sm },
  titleDecor: { fontSize: 24 },
  cta: { backgroundColor: colors.coral, borderRadius: 22, marginTop: spacing.xl, padding: spacing.xl },
  ctaTitle: { color: colors.card, fontSize: 20, fontWeight: '700' },
  ctaBody: { color: colors.card, fontSize: 13, marginTop: spacing.sm, opacity: 0.9 },
  ctaAction: { color: colors.card, fontSize: 12, fontWeight: '800', marginTop: spacing.lg },
  error: { color: colors.coralDark, fontSize: 13, marginTop: spacing.md },
  loading: { alignItems: 'center', minHeight: 180, justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  stat: { backgroundColor: colors.sageLight, borderRadius: 16, flex: 1, padding: spacing.md },
  statValue: { color: colors.sageDark, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.sageDark, fontSize: 10, fontWeight: '700', marginTop: spacing.xs },
  section: { color: colors.inkSoft, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: spacing.xxl, textTransform: 'uppercase' },
  card: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.line, borderRadius: 22, borderWidth: 1, flexDirection: 'row', marginTop: spacing.md, padding: spacing.lg },
  cardEmoji: { fontSize: 30, marginRight: spacing.md },
  cardCopy: { flex: 1 },
  cardTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  cardBody: { color: colors.inkSoft, fontSize: 12, marginTop: spacing.xs },
  cardMeta: { color: colors.sageDark, fontSize: 11, fontWeight: '700', marginTop: spacing.sm },
  chevron: { color: colors.coralDark, fontSize: 28, fontWeight: '300' },
});
