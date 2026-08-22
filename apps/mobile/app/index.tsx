import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/theme/colors';

export default function WelcomeScreen() {
  const { error, isLoading, session, signInWithGoogle } = useAuth();

  if (session) return <Redirect href="/(tabs)" />;
  if (isLoading) return <Screen scroll={false}><View style={styles.loading}><ActivityIndicator color={colors.coralDark} /><Text style={styles.note}>Opening Bloom…</Text></View></Screen>;

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.emoji}>🌱</Text>
        <Text style={styles.eyebrow}>BLOOM</Text>
        <Text style={styles.title}>Write now. Read together later.</Text>
        <Text style={styles.body}>
          Keep a sealed daily diary with your closest people. Choose a bloom date,
          write freely, and open the whole season together.
        </Text>
        <View style={styles.spacer} />
        <GoogleSignInButton disabled={isLoading} onPress={() => void signInWithGoogle()} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Text style={styles.note}>Your Google account is used only to sign in to Bloom.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 72 },
  emoji: { fontSize: 64, marginBottom: spacing.xl },
  eyebrow: { color: colors.coralDark, fontSize: 12, fontWeight: '800', letterSpacing: 3, marginBottom: spacing.sm },
  title: { color: colors.ink, fontSize: 30, fontWeight: '700', textAlign: 'center', lineHeight: 38 },
  body: { color: colors.inkSoft, fontSize: 15, lineHeight: 23, marginTop: spacing.lg, maxWidth: 320, textAlign: 'center' },
  spacer: { flex: 1, minHeight: 120 },
  note: { color: colors.inkSoft, fontSize: 11, marginTop: spacing.md, textAlign: 'center' },
  error: { color: colors.coralDark, fontSize: 12, marginTop: spacing.md, textAlign: 'center' },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center', gap: spacing.md },
});
