import { Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { profileStyles as styles } from '@/styles/screens/profile.styles';

export default function ProfileScreen() {
  return <Screen><Text style={styles.title}>Profile</Text><Text style={styles.body}>Google profile and privacy settings will live here.</Text></Screen>;
}
