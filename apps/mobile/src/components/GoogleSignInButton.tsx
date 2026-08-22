import { Pressable, Text, View } from 'react-native';
import { googleSignInButtonStyles } from '@/styles/components.styles';

export function GoogleSignInButton({ onPress, disabled = false }: { onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityLabel="Continue with Google"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [googleSignInButtonStyles.button, pressed && googleSignInButtonStyles.pressed, disabled && googleSignInButtonStyles.disabled]}
    >
      <View style={googleSignInButtonStyles.googleMark}><Text style={googleSignInButtonStyles.googleText}>G</Text></View>
      <Text style={googleSignInButtonStyles.label}>Continue with Google</Text>
    </Pressable>
  );
}
