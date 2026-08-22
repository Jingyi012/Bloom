import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { bloomApi } from '@/api/client';
import type { CircleDetail } from '@/types/api';
import { colors } from '@/styles/tokens';
import { circleDetailStyles as styles } from '@/styles/screens/circle-detail.styles';

export default function CircleDetailScreen() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [detail, setDetail] = useState<CircleDetail | null>(null);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.accessToken || !circleId) return;
    setIsLoading(true); setError(null);
    try { setDetail(await bloomApi.getCircle(session.accessToken, circleId)); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Could not load this circle.'); }
    finally { setIsLoading(false); }
  }, [circleId, session?.accessToken]);

  useEffect(() => { void load(); }, [load]);

  const progress = useMemo(() => {
    if (!detail) return 0;
    if (detail.circle.status === 'Bloomed') return 1;
    const now = Date.now();
    const bloom = new Date(detail.circle.bloomAtUtc).getTime();
    const assumedStart = bloom - 180 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.min(0.99, (now - assumedStart) / (bloom - assumedStart)));
  }, [detail]);

  const invite = useCallback(async () => {
    if (!session?.accessToken || !circleId || !email.trim()) return;
    setIsBusy(true); setError(null); setNotice(null);
    try { await bloomApi.inviteToCircle(session.accessToken, circleId, email.trim()); setEmail(''); setNotice('Invitation sent.'); await load(); }
    catch (inviteError) { setError(inviteError instanceof Error ? inviteError.message : 'Could not send the invitation.'); }
    finally { setIsBusy(false); }
  }, [circleId, email, load, session?.accessToken]);

  const leave = useCallback(() => {
    if (!session?.accessToken || !circleId) return;
    Alert.alert('Leave this circle?', 'Your sealed pages stay private and will not be revealed to the remaining members.', [
      { text: 'Keep circle', style: 'cancel' },
      { text: 'Leave circle', style: 'destructive', onPress: () => void (async () => { setIsBusy(true); try { await bloomApi.leaveCircle(session.accessToken, circleId); router.back(); } catch (leaveError) { setError(leaveError instanceof Error ? leaveError.message : 'Could not leave the circle.'); } finally { setIsBusy(false); } })() },
    ]);
  }, [circleId, router, session?.accessToken]);

  if (isLoading) return <Screen scroll={false}><View style={styles.loading}><ActivityIndicator color={colors.coralDark} /></View></Screen>;
  if (!detail) return <Screen><Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable><Text style={styles.error}>{error ?? 'Circle not found.'}</Text></Screen>;

  const { circle, members } = detail;
  return <Screen>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to circles" onPress={() => router.back()}><Text style={styles.back}>‹ Back to circles</Text></Pressable>
    <View style={styles.hero}>
      <Text style={styles.emoji}>{circle.emoji}</Text>
      <Text style={styles.title}>{circle.name}</Text>
      <Text style={styles.status}>{circle.status.toUpperCase()}</Text>
      <Text style={styles.bloomDate}>{circle.status === 'Bloomed' ? 'Your shared timeline is open.' : `Blooms ${formatDate(circle.bloomAtUtc)}`}</Text>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} /></View>
      <Text style={styles.progressLabel}>{circle.status === 'Bloomed' ? 'Fully bloomed' : `${Math.round(progress * 100)}% through this season`}</Text>
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {notice ? <Text style={styles.progressLabel}>{notice}</Text> : null}
    <Text style={styles.section}>Members · {members.length}</Text>
    {members.map(member => <View key={member.userId} style={styles.member}><View style={styles.avatar}><Text style={styles.avatarText}>{member.displayName.charAt(0).toUpperCase()}</Text></View><View style={styles.memberCopy}><Text style={styles.memberName}>{member.displayName}</Text><Text style={styles.memberMeta}>{member.role} · joined {formatDate(member.joinedAtUtc)}</Text></View></View>)}
    {circle.isCreator && circle.status !== 'Bloomed' ? <View style={styles.form}><TextInput accessibilityLabel="Invitee email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="friend@example.com" placeholderTextColor={colors.inkSoft} style={styles.input} value={email} /><Pressable accessibilityRole="button" disabled={isBusy || !email.trim()} onPress={() => void invite()} style={styles.inviteButton}><Text style={styles.inviteButtonText}>{isBusy ? 'Sending…' : 'Invite a friend'}</Text></Pressable></View> : null}
    {circle.status === 'Bloomed' ? <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/circle/[circleId]', params: { circleId: circle.id } })} style={styles.action}><Text style={styles.actionText}>Open shared timeline</Text></Pressable> : null}
    {circle.canLeave ? <Pressable accessibilityRole="button" disabled={isBusy} onPress={leave} style={styles.danger}><Text style={styles.dangerText}>Leave circle</Text></Pressable> : null}
  </Screen>;
}

function formatDate(value: string): string { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)); }
