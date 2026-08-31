import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { Avatar } from '@/components/Avatar';
import { InlineAlert } from '@/components/InlineAlert';
import { useAuth } from '@/auth/AuthProvider';
import { bloomApi } from '@/api/client';
import type { Comment as ApiComment, TimelineEntry } from '@/types/api';
import { colors } from '@/styles/tokens';
import { entryDetailStyles as styles } from '@/styles/screens/entry-detail.styles';
import { useSettings } from '@/settings/SettingsProvider';
import { REACTION_OPTIONS, type ReactionCode } from '@/features/bloom/reactions';
import { formatLocalCommentTime, formatLocalDate, formatLocalTime } from '@/utils/date';
import { queryKeys } from '@/query/queryKeys';

export default function EntryDetailScreen() {
  const { publicationId: rawPublicationId } = useLocalSearchParams<{ publicationId?: string | string[] }>();
  const publicationId = Array.isArray(rawPublicationId) ? rawPublicationId[0] : rawPublicationId;
  const router = useRouter();
  const { session } = useAuth();
  const { language, t } = useSettings();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const entryQuery = useQuery({
    queryKey: queryKeys.entry(publicationId ?? ''),
    queryFn: () => bloomApi.getEntry(session!.accessToken, publicationId!),
    enabled: Boolean(session?.accessToken && publicationId),
  });
  const commentsQuery = useQuery({
    queryKey: queryKeys.comments(publicationId ?? ''),
    queryFn: () => bloomApi.getComments(session!.accessToken, publicationId!),
    enabled: Boolean(session?.accessToken && publicationId),
  });
  const entry = entryQuery.data ?? null;
  const comments: ApiComment[] = commentsQuery.data?.items ?? [];
  const [draft, setDraft] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const suppressNextReactionPress = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = entryQuery.isPending;
  const isRefreshing = (entryQuery.isRefetching || commentsQuery.isRefetching) && !isLoading;
  const refresh = useCallback(async () => {
    setError(null);
    await Promise.all([entryQuery.refetch(), commentsQuery.refetch()]);
  }, [commentsQuery, entryQuery]);

  const reactionMutation = useMutation({
    mutationFn: async (code: ReactionCode) => {
      if (!session?.accessToken || !entry) throw new Error(t('entryLoadFailed'));
      const current = entry.reactions.find((reaction) => reaction.emojiCode === code);
      return current?.reactedByCurrentUser
        ? bloomApi.removeReaction(session.accessToken, entry.publicationId, code)
        : bloomApi.addReaction(session.accessToken, entry.publicationId, code);
    },
    onSuccess: (result, code) => {
      if (!publicationId) return;
      queryClient.setQueryData<TimelineEntry>(queryKeys.entry(publicationId), (currentEntry) => currentEntry
        ? {
            ...currentEntry,
            reactions: [
              ...currentEntry.reactions.filter((reaction) => reaction.emojiCode !== code),
              result,
            ],
          }
        : currentEntry);
      void queryClient.invalidateQueries({ queryKey: ["timeline"] });
      setShowReactionPicker(false);
    },
    onError: (reactionError) => setError(reactionError instanceof Error ? reactionError.message : t('reactionUpdateFailed')),
  });

  const updateReaction = useCallback((code: ReactionCode) => {
    if (reactionMutation.isPending || !entry) return;
    setError(null);
    reactionMutation.mutate(code);
  }, [entry, reactionMutation]);

  const currentUserReaction = entry?.reactions.find((reaction) => reaction.reactedByCurrentUser);
  const selectedReaction = REACTION_OPTIONS.find((option) => option.code === currentUserReaction?.emojiCode) ?? REACTION_OPTIONS[0];

  const commentMutation = useMutation({
    mutationFn: (body: string) => {
      if (!session?.accessToken || !entry) throw new Error(t('entryLoadFailed'));
      return bloomApi.addComment(session.accessToken, entry.publicationId, body);
    },
    onSuccess: (comment) => {
      if (!publicationId) return;
      queryClient.setQueryData(queryKeys.comments(publicationId), (current: { items: ApiComment[]; nextCursor?: string | null } | undefined) => current
        ? { ...current, items: [...current.items, comment] }
        : { items: [comment], nextCursor: null });
      queryClient.setQueryData<TimelineEntry>(queryKeys.entry(publicationId), (currentEntry) => currentEntry
        ? { ...currentEntry, commentCount: currentEntry.commentCount + 1 }
        : currentEntry);
      void queryClient.invalidateQueries({ queryKey: ["timeline"] });
      setDraft('');
    },
    onError: (commentError) => setError(commentError instanceof Error ? commentError.message : t('commentAddFailed')),
  });

  const addComment = useCallback(() => {
    const body = draft.trim();
    if (!body || !entry || commentMutation.isPending) return;
    setError(null);
    commentMutation.mutate(body);
  }, [commentMutation, draft, entry]);

  const posting = commentMutation.isPending;

  if (isLoading) {
    return (
      <Screen bottomPadding={0} scroll={false}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.coralDark} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen bottomPadding={0} scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.detailLayout}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl onRefresh={() => void refresh()} refreshing={isRefreshing} />}
          style={styles.detailScroll}
          contentContainerStyle={styles.detailScrollContent}
        >
          <View style={styles.topBar}>
            <Pressable
              accessibilityLabel={t('backToTimeline')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <MaterialCommunityIcons color={colors.ink} name="arrow-left" size={19} />
            </Pressable>
            <Text style={styles.title}>{entry?.authorDisplayName ?? t('entryDetail')}</Text>
          </View>
          {error || entryQuery.error || commentsQuery.error ? (
            <InlineAlert
              message={error ?? (entryQuery.error instanceof Error ? entryQuery.error.message : commentsQuery.error instanceof Error ? commentsQuery.error.message : t('entryLoadFailed'))}
              onDismiss={() => setError(null)}
            />
          ) : null}
          {!entry ? (
            <InlineAlert message={t('entryLoadFailed')} onDismiss={() => setError(null)} />
          ) : (
            <View>
              <View style={[styles.card, showReactionPicker ? styles.cardOpen : null]}>
                <View style={styles.authorRow}>
                  <Avatar
                    accessibilityLabel={entry.authorDisplayName}
                    containerStyle={styles.avatar}
                    imageStyle={styles.avatarImage}
                    initial={entry.authorDisplayName.trim().charAt(0).toUpperCase() || '?'}
                    textStyle={styles.avatarText}
                    uri={entry.authorAvatarUrl}
                  />
                  <View style={styles.authorCopy}>
                    <Text style={styles.author}>{entry.authorDisplayName}</Text>
                    <Text style={styles.when}>
                      {formatDate(entry.authorLocalDate)} {'\u00B7'} {formatTime(entry.submittedAtUtc)}
                      {entry.mood ? ` ${moodEmoji(entry.mood)}` : ''}
                    </Text>
                  </View>
                  {entry.mood ? <Text style={styles.mood}>{moodEmoji(entry.mood)}</Text> : null}
                </View>
                <Text style={styles.body}>{entry.text}</Text>
                {entry.mediaIds.length > 0 && session?.accessToken ? (
                  <ScrollView
                    directionalLockEnabled
                    horizontal
                    nestedScrollEnabled
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.mediaGallery}
                  >
                    {entry.mediaIds.map((mediaId, index) => (
                      <Image
                        key={mediaId}
                        accessibilityLabel={`${t('diaryPhoto')} ${index + 1} ${t('of')} ${entry.mediaIds.length}`}
                        contentFit="cover"
                        source={{ uri: bloomApi.mediaUrl(mediaId), headers: { Authorization: `Bearer ${session.accessToken}` } }}
                        style={styles.media}
                      />
                    ))}
                  </ScrollView>
                ) : null}
                {showReactionPicker ? (
                  <View style={styles.reactionPicker}>
                    {REACTION_OPTIONS.map((option) => (
                      <Pressable
                        key={option.code}
                        accessibilityRole="button"
                        onPress={() => void updateReaction(option.code)}
                        style={styles.reactionOption}
                      >
                        <Text style={styles.reactionOptionText}>{option.icon}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <View style={styles.reactions}>
                  <Pressable
                    accessibilityLabel={t('reactWithHeart')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: currentUserReaction !== undefined }}
                    delayLongPress={250}
                    onLongPress={() => {
                      suppressNextReactionPress.current = true;
                      setShowReactionPicker(true);
                    }}
                    onPress={() => {
                      if (suppressNextReactionPress.current) {
                        suppressNextReactionPress.current = false;
                        return;
                      }
                      void updateReaction(selectedReaction.code);
                    }}
                    style={[styles.reaction, currentUserReaction ? styles.reactionActive : null]}
                  >
                    <Text style={styles.reactionText}>{selectedReaction.icon}</Text>
                    <Text style={styles.reactionCount}>{currentUserReaction?.count ?? entry.reactions.find((reaction) => reaction.emojiCode === REACTION_OPTIONS[0].code)?.count ?? 0}</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.commentsSection}>
                <Text style={styles.sectionLabel}>{t('commentsTitle')} {'\u00B7'} {entry.commentCount}</Text>
                {comments.length === 0 ? <Text style={styles.noComments}>{t('noComments')}</Text> : comments.map((comment) => (
                  <View key={comment.id} style={styles.comment}>
                    <Avatar
                      accessibilityLabel={comment.authorDisplayName}
                      containerStyle={styles.commentAvatar}
                      imageStyle={styles.commentAvatarImage}
                      initial={comment.authorDisplayName.trim().charAt(0).toUpperCase() || '?'}
                      textStyle={styles.commentAvatarText}
                      uri={comment.authorAvatarUrl}
                    />
                    <View style={styles.commentBubble}>
                      <View style={styles.commentMeta}>
                        <Text style={styles.commentAuthor}>{comment.authorDisplayName}</Text>
                        <Text style={styles.commentTime}>{formatLocalCommentTime(comment.createdAtUtc, language)}</Text>
                      </View>
                      <Text style={styles.commentBody}>{comment.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {entry ? (
          <View style={[styles.composerDock, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <View style={styles.composer}>
              <TextInput
                accessibilityLabel={t('comment')}
                editable={!posting}
                maxLength={1000}
                multiline
                onChangeText={setDraft}
                onSubmitEditing={() => void addComment()}
                placeholder={t('commentPlaceholder')}
                placeholderTextColor={colors.inkSoft}
                style={styles.input}
                value={draft}
              />
              <Pressable
                accessibilityLabel={t('post')}
                accessibilityRole="button"
                disabled={!draft.trim() || posting}
                onPress={() => void addComment()}
                style={[styles.sendButton, !draft.trim() || posting ? styles.sendButtonDisabled : null]}
              >
                <MaterialCommunityIcons color={colors.card} name="send" size={17} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function formatDate(value: string): string {
  return formatLocalDate(value);
}

function formatTime(value: string): string {
  return formatLocalTime(value);
}

function moodEmoji(mood: string): string {
  return {
    heavy: '\u{1F622}',
    restless: '\u{1F610}',
    calm: '\u{1F642}',
    joyful: '\u{1F604}',
    radiant: '\u{1F929}',
  }[mood] ?? mood;
}
