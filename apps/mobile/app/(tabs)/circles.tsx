import { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { bloomApi, type CircleInvitation, type CircleSummary } from '@/api/client';
import { colors, spacing } from '@/theme/colors';

const DURATION_OPTIONS = [1, 3, 6, 12] as const;

export default function CirclesScreen() {
  const { session } = useAuth();
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [invitations, setInvitations] = useState<CircleInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [durationMonths, setDurationMonths] = useState<number>(6);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!session?.accessToken) return;
    refresh ? setIsRefreshing(true) : setIsLoading(true);
    setError(null);
    try {
      const [nextCircles, nextInvitations] = await Promise.all([
        bloomApi.listCircles(session.accessToken),
        bloomApi.listCircleInvitations(session.accessToken),
      ]);
      setCircles(nextCircles);
      setInvitations(nextInvitations);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load circles.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.accessToken]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async () => {
    if (!session?.accessToken || !name.trim()) {
      setError('Give your circle a name first.');
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      await bloomApi.createCircle(session.accessToken, {
        name: name.trim(),
        emoji: '🌱',
        durationMonths,
        timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });
      setName('');
      setShowCreateForm(false);
      await load(true);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not plant the circle.');
    } finally {
      setIsCreating(false);
    }
  }, [durationMonths, load, name, session?.accessToken]);

  const respond = useCallback(async (invitationId: string, accept: boolean) => {
    if (!session?.accessToken) return;
    try {
      await bloomApi.respondToCircleInvitation(session.accessToken, invitationId, accept);
      await load(true);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Could not update the invitation.');
    }
  }, [load, session?.accessToken]);

  const header = useMemo(() => (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>YOUR GARDEN</Text>
          <Text style={styles.title}>Your circles</Text>
          <Text style={styles.subtitle}>Small groups, sealed seasons, shared memories.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Plant a new circle" style={styles.addButton} onPress={() => setShowCreateForm((visible) => !visible)}>
          <Text style={styles.addButtonText}>＋</Text>
        </Pressable>
      </View>

      {showCreateForm ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Plant a circle</Text>
          <TextInput
            accessibilityLabel="Circle name"
            autoCapitalize="sentences"
            placeholder="e.g. The six-month season"
            placeholderTextColor={colors.inkSoft}
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
          <Text style={styles.label}>Bloom after</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((option) => (
              <Pressable key={option} accessibilityRole="button" style={[styles.durationChip, durationMonths === option && styles.durationChipActive]} onPress={() => setDurationMonths(option)}>
                <Text style={[styles.durationText, durationMonths === option && styles.durationTextActive]}>{option === 12 ? '1 year' : `${option} mo`}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" disabled={isCreating} style={styles.primaryButton} onPress={() => void create()}>
            {isCreating ? <ActivityIndicator color={colors.card} /> : <Text style={styles.primaryButtonText}>Plant circle</Text>}
          </Pressable>
        </View>
      ) : null}

      {invitations.length > 0 ? (
        <View style={styles.invitations}>
          <Text style={styles.sectionTitle}>Invitations</Text>
          {invitations.map((invitation) => (
            <View key={invitation.id} style={styles.invitationCard}>
              <Text style={styles.invitationEmoji}>{invitation.circleEmoji}</Text>
              <View style={styles.invitationCopy}>
                <Text style={styles.cardTitle}>{invitation.circleName}</Text>
                <Text style={styles.cardBody}>Join this sealed circle?</Text>
              </View>
              <View style={styles.invitationActions}>
                <Pressable accessibilityRole="button" onPress={() => void respond(invitation.id, false)}><Text style={styles.decline}>Decline</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => void respond(invitation.id, true)}><Text style={styles.accept}>Join</Text></Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Text style={styles.sectionTitle}>Active circles</Text>
    </View>
  ), [create, durationMonths, error, invitations, isCreating, name, respond, showCreateForm]);

  return (
    <Screen scroll={false}>
      {isLoading ? <View style={styles.loading}><ActivityIndicator color={colors.coralDark} /></View> : (
        <FlashList
          data={circles}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No circles yet. Plant one for your favorite people.</Text>}
          ListHeaderComponent={header}
          onRefresh={() => void load(true)}
          refreshing={isRefreshing}
          renderItem={({ item }) => <CircleCard circle={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

function CircleCard({ circle }: { circle: CircleSummary }) {
  const bloomed = circle.status === 'Bloomed';
  return (
    <View style={styles.circleCard}>
      <Text style={styles.circleEmoji}>{circle.emoji}</Text>
      <View style={styles.circleCopy}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{circle.name}</Text>
          <Text style={[styles.status, bloomed && styles.statusBloomed]}>{bloomed ? 'BLOOMED' : 'SEALED'}</Text>
        </View>
        <Text style={styles.cardBody}>{bloomed ? 'Your shared timeline is ready.' : `Blooms ${formatDate(circle.bloomAtUtc)}`}</Text>
        <Text style={styles.memberCount}>{circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}</Text>
      </View>
    </View>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

const styles = StyleSheet.create({
  headerRow: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.lg },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.coralDark, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700', marginTop: spacing.sm },
  subtitle: { color: colors.inkSoft, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  addButton: { alignItems: 'center', backgroundColor: colors.coral, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  addButtonText: { color: colors.card, fontSize: 28, fontWeight: '300', lineHeight: 30 },
  form: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 20, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg },
  formTitle: { color: colors.ink, fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  input: { borderColor: colors.line, borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 15, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  label: { color: colors.inkSoft, fontSize: 12, fontWeight: '700', marginTop: spacing.md },
  durationRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  durationChip: { borderColor: colors.line, borderRadius: 16, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  durationChipActive: { backgroundColor: colors.sageLight, borderColor: colors.sage },
  durationText: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
  durationTextActive: { color: colors.sageDark },
  primaryButton: { alignItems: 'center', backgroundColor: colors.coral, borderRadius: 14, marginTop: spacing.lg, minHeight: 48, justifyContent: 'center' },
  primaryButtonText: { color: colors.card, fontSize: 15, fontWeight: '700' },
  invitations: { marginBottom: spacing.lg },
  sectionTitle: { color: colors.inkSoft, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: spacing.md, marginTop: spacing.md, textTransform: 'uppercase' },
  invitationCard: { alignItems: 'center', backgroundColor: colors.lavenderLight, borderRadius: 18, flexDirection: 'row', marginBottom: spacing.sm, padding: spacing.md },
  invitationEmoji: { fontSize: 26, marginRight: spacing.md },
  invitationCopy: { flex: 1 },
  invitationActions: { alignItems: 'flex-end', gap: spacing.sm },
  accept: { color: colors.sageDark, fontSize: 13, fontWeight: '800' },
  decline: { color: colors.inkSoft, fontSize: 12 },
  error: { color: colors.coralDark, fontSize: 12, marginBottom: spacing.md },
  empty: { color: colors.inkSoft, fontSize: 14, lineHeight: 21, paddingVertical: spacing.xl },
  circleCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.line, borderRadius: 20, borderWidth: 1, flexDirection: 'row', marginBottom: spacing.md, padding: spacing.lg },
  circleEmoji: { fontSize: 34, marginRight: spacing.md },
  circleCopy: { flex: 1 },
  cardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  cardTitle: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '700' },
  cardBody: { color: colors.inkSoft, fontSize: 12, marginTop: spacing.xs },
  memberCount: { color: colors.sageDark, fontSize: 11, fontWeight: '700', marginTop: spacing.sm },
  status: { color: colors.coralDark, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  statusBloomed: { color: colors.sageDark },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
});
