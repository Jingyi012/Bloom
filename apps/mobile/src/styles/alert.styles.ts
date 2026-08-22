import { StyleSheet } from 'react-native';
import { typography } from '@/styles/tokens';

export const alertStyles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: '#FDECEC', borderColor: '#F5B9B5', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 16, paddingHorizontal: 12, paddingVertical: 10 },
  message: { color: '#8F2118', flex: 1, fontFamily: typography.uiMedium, fontSize: 12, lineHeight: 17 },
  close: { alignItems: 'center', justifyContent: 'center' },
});
