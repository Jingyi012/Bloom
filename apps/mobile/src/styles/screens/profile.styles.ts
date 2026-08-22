import { StyleSheet } from 'react-native';
import { colors, shadows, typography } from '@/styles/tokens';

export const profileStyles = StyleSheet.create({
  eyebrow: { color: colors.coralDark, fontFamily: typography.display, fontSize: 11, letterSpacing: 2 },
  title: { color: colors.ink, fontFamily: typography.display, fontSize: 29, marginTop: 8 },
  body: { color: colors.inkSoft, fontFamily: typography.ui, fontSize: 14, lineHeight: 21, marginTop: 8 },
  card: { ...shadows.card, backgroundColor: colors.card, borderColor: colors.line, borderRadius: 18, borderWidth: 1, marginTop: 20, padding: 16 },
  label: { color: colors.inkSoft, fontFamily: typography.uiBold, fontSize: 11, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  labelSpaced: { color: colors.inkSoft, fontFamily: typography.uiBold, fontSize: 11, letterSpacing: 1, marginBottom: 8, marginTop: 14, textTransform: 'uppercase' },
  input: { borderColor: colors.line, borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 15, paddingHorizontal: 12, paddingVertical: 11 },
  save: { alignItems: 'center', backgroundColor: colors.coral, borderRadius: 13, marginTop: 14, minHeight: 46, justifyContent: 'center' },
  saveText: { color: colors.card, fontSize: 14, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  stat: { backgroundColor: colors.sageLight, borderRadius: 16, flex: 1, padding: 13 },
  statValue: { color: colors.sageDark, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.sageDark, fontSize: 10, fontWeight: '700', marginTop: 3 },
  notice: { color: colors.sageDark, fontSize: 13, marginTop: 12 },
  error: { color: colors.coralDark, fontSize: 13, marginTop: 12 },
  danger: { alignItems: 'center', borderColor: colors.coralDark, borderRadius: 13, borderWidth: 1, marginTop: 24, minHeight: 46, justifyContent: 'center' },
  dangerText: { color: colors.coralDark, fontSize: 14, fontWeight: '800' },
});
