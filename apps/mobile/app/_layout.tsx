import { Stack } from 'expo-router';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/styles/tokens';
import { AuthProvider } from '@/auth/AuthProvider';
import { SettingsProvider } from '@/settings/SettingsProvider';
import { QueryProvider } from '@/query/QueryProvider';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.coralDark} /></View>;
  }

  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor={colors.background} barStyle="dark-content" />
      <SettingsProvider>
        <QueryProvider>
          <AuthProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </AuthProvider>
        </QueryProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
