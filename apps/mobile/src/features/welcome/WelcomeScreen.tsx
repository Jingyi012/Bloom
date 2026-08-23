import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '@/auth/AuthProvider';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Screen } from '@/components/Screen';
import { colors } from '@/styles/tokens';
import { welcomeStyles as styles } from '@/styles/screens/welcome.styles';
import { InlineAlert } from '@/components/InlineAlert';
import { useSettings } from '@/settings/SettingsProvider';

export default function WelcomeScreen() {
  const { clearError, error, isLoading, session, signInWithGoogle } = useAuth();
  const { t } = useSettings();

  if (session) return <Redirect href="/(tabs)" />;
  if (isLoading) return <Screen scroll={false}><View style={styles.loading}><ActivityIndicator color={colors.coralDark} /><Text style={styles.note}>{t('openingBloom')}</Text></View></Screen>;

  return (
    <Screen>
      <View style={styles.container}>
        <Image
          accessibilityLabel="Bloom sprout logo"
          contentFit="contain"
          source={require('../../../assets/bloom-icon.png')}
          style={styles.logo}
        />
        <Text style={styles.eyebrow}>BLOOM</Text>
        <Text style={styles.title}>{t('welcomeTitle')}</Text>
        <Text style={styles.body}>{t('welcomeBody')}</Text>
        <View style={styles.spacer} />
        <GoogleSignInButton disabled={isLoading} onPress={() => void signInWithGoogle()} />
        {error ? <InlineAlert message={error} onDismiss={clearError} /> : null}
        <Text style={styles.note}>{t('googleOnlyNote')}</Text>
      </View>
    </Screen>
  );
}
