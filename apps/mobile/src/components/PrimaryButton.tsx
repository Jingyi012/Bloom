import type { PropsWithChildren } from 'react';
import { Pressable, Text } from 'react-native';
import { primaryButtonStyles } from '@/styles/components.styles';

export function PrimaryButton({ children, onPress, disabled = false }: PropsWithChildren<{ onPress: () => void; disabled?: boolean }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [primaryButtonStyles.button, pressed && primaryButtonStyles.pressed, disabled && primaryButtonStyles.disabled]}
    >
      <Text style={primaryButtonStyles.label}>{children}</Text>
    </Pressable>
  );
}
