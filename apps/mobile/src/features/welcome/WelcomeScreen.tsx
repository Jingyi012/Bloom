import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Screen } from '@/components/Screen';
import { colors } from '@/styles/tokens';
import { welcomeStyles as styles } from '@/styles/screens/welcome.styles';
import { InlineAlert } from '@/components/InlineAlert';

export default function WelcomeScreen() {
  const { clearError, error, isLoading, session, signInWithGoogle } = useAuth();

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
        {error ? <InlineAlert message={error} onDismiss={clearError} /> : null}
        <Text style={styles.note}>Your Google account is used only to sign in to Bloom.</Text>
      </View>
    </Screen>
  );
}
