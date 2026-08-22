import { Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { homeStyles as styles } from '@/styles/screens/home.styles';

export default function HomeScreen() {
  return (
    <Screen>
      <Text style={styles.eyebrow}>GOOD EVENING</Text>
      <Text style={styles.title}>Hi there 🌙</Text>
      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>Write today's page</Text>
        <Text style={styles.ctaBody}>Your next entry will stay sealed until bloom day.</Text>
      </View>
      <Text style={styles.section}>Coming up</Text>
      <View style={styles.card}>
        <Text style={styles.cardEmoji}>🌿</Text>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>No circles yet</Text>
          <Text style={styles.cardBody}>Plant your first circle to begin.</Text>
        </View>
      </View>
    </Screen>
  );
}
