import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '@/theme/colors';

export function PrimaryButton({ children, onPress, disabled = false }: PropsWithChildren<{ onPress: () => void; disabled?: boolean }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: colors.coral, borderRadius: 16, padding: spacing.lg, alignItems: 'center' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.5 },
  label: { color: colors.card, fontSize: 15, fontWeight: '700' },
});
