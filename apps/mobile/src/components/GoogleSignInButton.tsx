import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme/colors';

export function GoogleSignInButton({ onPress, disabled = false }: { onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityLabel="Continue with Google"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <View style={styles.googleMark}><Text style={styles.googleText}>G</Text></View>
      <Text style={styles.label}>Continue with Google</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  googleMark: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  googleText: { color: '#4285F4', fontSize: 18, fontWeight: '800' },
  label: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  pressed: { backgroundColor: colors.cardWarm },
  disabled: { opacity: 0.5 },
});
