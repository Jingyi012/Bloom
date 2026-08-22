import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme/colors';

export default function ProfileScreen() {
  return <Screen><Text style={styles.title}>Profile</Text><Text style={styles.body}>Google profile and privacy settings will live here.</Text></Screen>;
}

const styles = StyleSheet.create({ title: { color: colors.ink, fontSize: 26, fontWeight: '700' }, body: { color: colors.inkSoft, fontSize: 14, marginTop: 12 } });
