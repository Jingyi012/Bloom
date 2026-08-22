import { StyleSheet } from 'react-native';
import { shadows, spacing, typography } from '@/styles/tokens';

export const alertStyles = StyleSheet.create({
  container: { ...shadows.card, alignItems: 'center', backgroundColor: '#FFFDFC', borderColor: '#F3D8D2', borderRadius: 18, borderWidth: 1, elevation: 8, flexDirection: 'row', gap: spacing.md, left: spacing.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.md, position: 'absolute', right: spacing.xl, top: spacing.sm, zIndex: 100 },
  successContainer: { backgroundColor: '#FCFFFD', borderColor: '#CBE4D2' },
  iconWrap: { alignItems: 'center', borderRadius: 18, height: 34, justifyContent: 'center', width: 34 },
  errorIconWrap: { backgroundColor: '#FCE4E0' },
  successIconWrap: { backgroundColor: '#DDF2E3' },
  message: { color: '#8F2118', flex: 1, fontFamily: typography.uiMedium, fontSize: 13, lineHeight: 18 },
  successMessage: { color: '#2F6B52' },
  close: { alignItems: 'center', backgroundColor: '#FFF1EE', borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  successClose: { backgroundColor: '#EDF8F0' },
});
