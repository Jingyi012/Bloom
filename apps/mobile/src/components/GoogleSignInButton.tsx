import { Pressable, Text, View } from 'react-native';
import { googleSignInButtonStyles } from '@/styles/components.styles';
import { useSettings } from '@/settings/SettingsProvider';

export function GoogleSignInButton({ onPress, disabled = false }: { onPress: () => void; disabled?: boolean }) {
  const { t } = useSettings();
  return (
    <Pressable
      accessibilityLabel={t('continueWithGoogle')}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [googleSignInButtonStyles.button, pressed && googleSignInButtonStyles.pressed, disabled && googleSignInButtonStyles.disabled]}
    >
      <View style={googleSignInButtonStyles.googleMark}><Text style={googleSignInButtonStyles.googleText}>G</Text></View>
      <Text style={googleSignInButtonStyles.label}>{t('continueWithGoogle')}</Text>
    </Pressable>
  );
}
