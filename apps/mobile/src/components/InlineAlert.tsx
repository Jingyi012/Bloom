import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';
import { alertStyles as styles } from '@/styles/alert.styles';

export function InlineAlert({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View accessibilityRole="alert" style={styles.container}>
      <MaterialCommunityIcons color="#B42318" name="alert-circle-outline" size={20} />
      <Text style={styles.message}>{message}</Text>
      <Pressable accessibilityLabel="Dismiss error" hitSlop={8} onPress={onDismiss} style={styles.close}>
        <MaterialCommunityIcons color="#B42318" name="close" size={18} />
      </Pressable>
    </View>
  );
}
