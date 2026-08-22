import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { bloomApi } from '@/api/client';
import type { UserStatsResponse } from '@/types/api';
import { colors } from '@/styles/tokens';
import { profileStyles as styles } from '@/styles/screens/profile.styles';

export default function ProfileScreen() {
  const { session, user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [timeZoneId, setTimeZoneId] = useState(user?.timeZoneId ?? 'UTC');
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!session?.accessToken) return;
    try { setStats(await bloomApi.stats(session.accessToken)); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Could not load your stats.'); }
    finally { setIsLoading(false); }
  }, [session?.accessToken]);

  useEffect(() => { void loadStats(); }, [loadStats]);
  useEffect(() => { setDisplayName(user?.displayName ?? ''); setTimeZoneId(user?.timeZoneId ?? 'UTC'); }, [user?.displayName, user?.timeZoneId]);

  const save = useCallback(async () => {
    if (!session?.accessToken) return;
    setIsSaving(true); setError(null); setNotice(null);
    try { await bloomApi.updateProfile(session.accessToken, displayName.trim(), timeZoneId.trim()); setNotice('Profile saved.'); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Could not save your profile.'); }
    finally { setIsSaving(false); }
  }, [displayName, session?.accessToken, timeZoneId]);

  const deleteAccount = useCallback(() => {
    if (!session?.accessToken) return;
    Alert.alert('Delete your Bloom account?', 'Your account will be deactivated and your active sessions revoked.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete account', style: 'destructive', onPress: () => void (async () => { await bloomApi.deleteAccount(session.accessToken); await signOut(); })() },
    ]);
  }, [session?.accessToken, signOut]);

  return <Screen>
    <Text style={styles.eyebrow}>YOUR PROFILE</Text>
    <Text style={styles.title}>A quiet place for you.</Text>
    <Text style={styles.body}>Your Google account is the only way into Bloom. We never show sealed writing here.</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    <View style={styles.card}>
      <Text style={styles.label}>Display name</Text>
      <TextInput accessibilityLabel="Display name" onChangeText={setDisplayName} style={styles.input} value={displayName} />
      <Text style={styles.labelSpaced}>IANA time zone</Text>
      <TextInput accessibilityLabel="Time zone" autoCapitalize="none" onChangeText={setTimeZoneId} style={styles.input} value={timeZoneId} />
      <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => void save()} style={styles.save}>{isSaving ? <ActivityIndicator color={colors.card} /> : <Text style={styles.saveText}>Save profile</Text>}</Pressable>
    </View>
    {isLoading ? <ActivityIndicator color={colors.coralDark} /> : <View style={styles.statsRow}>
      <Stat value={stats?.totalEntries ?? 0} label="Pages sealed" />
      <Stat value={stats?.activeCircles ?? 0} label="Active circles" />
      <Stat value={stats?.bloomedCircles ?? 0} label="Bloomed" />
    </View>}
    <Pressable accessibilityRole="button" onPress={deleteAccount} style={styles.danger}><Text style={styles.dangerText}>Delete account</Text></Pressable>
  </Screen>;
}

function Stat({ value, label }: { value: number; label: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
