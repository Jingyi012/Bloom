import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';
import { alertStyles as styles } from '@/styles/alert.styles';
import { useSettings } from '@/settings/SettingsProvider';

export type InlineAlertVariant = 'error' | 'success';

export function InlineAlert({ message, onDismiss, variant = 'error' }: { message: string; onDismiss: () => void; variant?: InlineAlertVariant }) {
  const isSuccess = variant === 'success';
  const { t } = useSettings();
  const iconColor = isSuccess ? '#2F6B52' : '#B42318';
  return (
    <View accessibilityRole="alert" style={[styles.container, isSuccess ? styles.successContainer : null]}>
      <MaterialCommunityIcons color={iconColor} name={isSuccess ? 'check-circle-outline' : 'alert-circle-outline'} size={20} />
      <Text style={[styles.message, isSuccess ? styles.successMessage : null]}>{message}</Text>
      <Pressable accessibilityLabel={t(isSuccess ? 'dismissNotice' : 'dismissError')} hitSlop={8} onPress={onDismiss} style={styles.close}>
        <MaterialCommunityIcons color={iconColor} name="close" size={18} />
      </Pressable>
    </View>
  );
}
