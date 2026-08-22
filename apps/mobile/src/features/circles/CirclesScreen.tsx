import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { bloomApi } from '@/api/client';
import type { CircleInvitation, CircleSummary } from '@/types/api';
import { colors } from '@/styles/tokens';
import { circlesStyles as styles } from '@/styles/screens/circles.styles';
import { useSettings } from '@/settings/SettingsProvider';
import { InlineAlert } from '@/components/InlineAlert';
import { getDeviceTimeZone } from '@/utils/device';

const DURATION_OPTIONS = [1, 3, 6, 12] as const;

export default function CirclesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { t } = useSettings();
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
        timeZoneId: getDeviceTimeZone(),
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
          <Text style={styles.eyebrow}>{t('yourGarden')}</Text>
          <Text style={styles.title}>{t('yourCircles')}</Text>
          <Text style={styles.subtitle}>{t('circlesSubtitle')}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('plantCircle')} style={styles.addButton} onPress={() => setShowCreateForm((visible) => !visible)}>
          <Text style={styles.addButtonText}>＋</Text>
        </Pressable>
      </View>

      {showCreateForm ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>{t('plantCircle')}</Text>
          <TextInput
            accessibilityLabel="Circle name"
            autoCapitalize="sentences"
            placeholder="e.g. The six-month season"
            placeholderTextColor={colors.inkSoft}
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
          <Text style={styles.label}>{t('bloomAfter')}</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((option) => (
              <Pressable key={option} accessibilityRole="button" style={[styles.durationChip, durationMonths === option && styles.durationChipActive]} onPress={() => setDurationMonths(option)}>
                <Text style={[styles.durationText, durationMonths === option && styles.durationTextActive]}>{option === 12 ? '1 year' : `${option} mo`}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" disabled={isCreating} style={styles.primaryButton} onPress={() => void create()}>
            {isCreating ? <ActivityIndicator color={colors.card} /> : <Text style={styles.primaryButtonText}>{t('plantCircle')}</Text>}
          </Pressable>
        </View>
      ) : null}

      {invitations.length > 0 ? (
        <View style={styles.invitations}>
          <Text style={styles.sectionTitle}>{t('invitations')}</Text>
          {invitations.map((invitation) => (
            <View key={invitation.id} style={styles.invitationCard}>
              <Text style={styles.invitationEmoji}>{invitation.circleEmoji}</Text>
              <View style={styles.invitationCopy}>
                <Text style={styles.cardTitle}>{invitation.circleName}</Text>
                <Text style={styles.cardBody}>{t('joinQuestion')}</Text>
              </View>
              <View style={styles.invitationActions}>
                <Pressable accessibilityRole="button" onPress={() => void respond(invitation.id, false)}><Text style={styles.decline}>{t('decline')}</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => void respond(invitation.id, true)}><Text style={styles.accept}>{t('join')}</Text></Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {error ? <InlineAlert message={error} onDismiss={() => setError(null)} /> : null}
      <Text style={styles.sectionTitle}>{t('activeCirclesTitle')}</Text>
    </View>
  ), [create, durationMonths, error, invitations, isCreating, name, respond, showCreateForm, t]);

  return (
    <Screen scroll={false}>
      {isLoading ? <View style={styles.loading}><ActivityIndicator color={colors.coralDark} /></View> : (
        <FlashList
          data={circles}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No circles yet. Plant one for your favorite people.</Text>}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          onRefresh={() => void load(true)}
          refreshing={isRefreshing}
          renderItem={({ item }) => <CircleCard circle={item} onPress={() => router.push({ pathname: '/circle-detail/[circleId]', params: { circleId: item.id } })} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

function CircleCard({ circle, onPress }: { circle: CircleSummary; onPress?: () => void }) {
  const bloomed = circle.status === 'Bloomed';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${circle.name}`} disabled={!onPress} onPress={onPress} style={styles.circleCard}>
      <Text style={styles.circleEmoji}>{circle.emoji}</Text>
      <View style={styles.circleCopy}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{circle.name}</Text>
          <Text style={[styles.status, bloomed && styles.statusBloomed]}>{bloomed ? 'BLOOMED' : 'SEALED'}</Text>
        </View>
        <Text style={styles.cardBody}>{bloomed ? 'Your shared timeline is ready.' : `Blooms ${formatDate(circle.bloomAtUtc)}`}</Text>
        <Text style={styles.memberCount}>{circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}</Text>
      </View>
    </Pressable>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}
