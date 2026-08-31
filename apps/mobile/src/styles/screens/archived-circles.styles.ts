import { StyleSheet } from "react-native";
import { colors, shadows, spacing, typography } from "@/styles/tokens";

export const archivedCirclesStyles = StyleSheet.create({
  topBar: { alignItems: "center", flexDirection: "row", minHeight: 44 },
  backButton: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.line, borderRadius: 18, borderWidth: 1, height: 36, justifyContent: "center", width: 36 },
  topBarTitle: { color: colors.ink, flex: 1, fontFamily: typography.display, fontSize: 22, textAlign: "center" },
  topBarSpacer: { width: 36 },
  subtitle: { color: colors.inkSoft, fontFamily: typography.ui, fontSize: 13, lineHeight: 20, marginBottom: spacing.lg, marginTop: spacing.sm, textAlign: "center" },
  listContent: { paddingBottom: spacing.xl, paddingTop: spacing.sm },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
  card: { ...shadows.card, alignItems: "center", backgroundColor: colors.card, borderColor: colors.line, borderRadius: 20, borderWidth: 1, flexDirection: "row", marginBottom: spacing.md, padding: spacing.lg },
  cardPressed: { opacity: 0.78 },
  emoji: { fontSize: 32, marginRight: spacing.md },
  cardCopy: { flex: 1, paddingRight: spacing.sm },
  cardTitleRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  cardTitle: { color: colors.ink, flex: 1, fontFamily: typography.uiBold, fontSize: 15 },
  badge: { backgroundColor: colors.lavenderLight, borderRadius: 10, color: colors.lavender, fontFamily: typography.uiBold, fontSize: 9, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 },
  cardMeta: { color: colors.inkSoft, fontFamily: typography.ui, fontSize: 11, marginTop: spacing.xs },
  emptyCard: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.line, borderRadius: 20, borderWidth: 1, marginTop: spacing.xl, padding: spacing.xl },
  emptyTitle: { color: colors.ink, fontFamily: typography.display, fontSize: 18, marginTop: spacing.md },
  emptyBody: { color: colors.inkSoft, fontFamily: typography.ui, fontSize: 12, lineHeight: 18, marginTop: spacing.sm, textAlign: "center" },
});
