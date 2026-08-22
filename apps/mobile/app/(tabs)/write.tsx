import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme/colors';

export default function WriteScreen() {
  return <Screen><Text style={styles.title}>Today's page</Text><Text style={styles.body}>The sealed editor is the next vertical slice.</Text></Screen>;
}

const styles = StyleSheet.create({ title: { color: colors.ink, fontSize: 26, fontWeight: '700' }, body: { color: colors.inkSoft, fontSize: 14, marginTop: 12 } });
