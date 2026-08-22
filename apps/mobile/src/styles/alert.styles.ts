import { StyleSheet } from 'react-native';
import { shadows, spacing, typography } from '@/styles/tokens';

export const alertStyles = StyleSheet.create({
  container: { ...shadows.card, alignItems: 'center', backgroundColor: '#FDECEC', borderColor: '#F5B9B5', borderRadius: 14, borderWidth: 1, elevation: 8, flexDirection: 'row', gap: 8, left: spacing.xl, paddingHorizontal: 12, paddingVertical: 10, position: 'absolute', right: spacing.xl, top: spacing.sm, zIndex: 100 },
  successContainer: { backgroundColor: '#EAF5EE', borderColor: '#B8DCC6' },
  message: { color: '#8F2118', flex: 1, fontFamily: typography.uiMedium, fontSize: 12, lineHeight: 17 },
  successMessage: { color: '#2F6B52' },
  close: { alignItems: 'center', justifyContent: 'center' },
});
