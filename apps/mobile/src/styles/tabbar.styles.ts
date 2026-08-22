import { StyleSheet } from 'react-native';
import { colors, shadows, typography } from '@/styles/tokens';

export const tabBarStyles = StyleSheet.create({
  bar: { ...shadows.card, alignItems: 'center', backgroundColor: colors.background, borderColor: colors.line, borderRadius: 24, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-around', left: 14, paddingHorizontal: 6, paddingTop: 6, position: 'absolute', right: 14 },
  item: { alignItems: 'center', borderRadius: 16, flex: 1, gap: 2, paddingHorizontal: 8, paddingVertical: 6 },
  itemActive: { backgroundColor: colors.card },
  label: { color: colors.inkSoft, fontFamily: typography.uiSemiBold, fontSize: 10 },
  labelActive: { color: colors.coralDark },
});
