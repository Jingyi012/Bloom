import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { InlineAlert } from '@/components/InlineAlert';
import { useAuth } from '@/auth/AuthProvider';
import { bloomApi } from '@/api/client';
import type { Comment as ApiComment, TimelineEntry } from '@/types/api';
import { colors } from '@/styles/tokens';
import { entryDetailStyles as styles } from '@/styles/screens/entry-detail.styles';
import { useSettings } from '@/settings/SettingsProvider';
import { REACTION_OPTIONS, type ReactionCode } from '@/features/bloom/reactions';
import { formatLocalCommentTime, formatLocalDate, formatLocalTime } from '@/utils/date';

export default function EntryDetailScreen() {
  const { publicationId: rawPublicationId } = useLocalSearchParams<{ publicationId?: string | string[] }>();
  const publicationId = Array.isArray(rawPublicationId) ? rawPublicationId[0] : rawPublicationId;
  const router = useRouter();
  const { session } = useAuth();
  const { language, t } = useSettings();
  const [entry, setEntry] = useState<TimelineEntry | null>(null);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const suppressNextReactionPress = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!session?.accessToken || !publicationId) return;
    refresh ? setIsRefreshing(true) : setIsLoading(true);
    setError(null);
    try {
      const result = await bloomApi.getEntry(session.accessToken, publicationId);
      setEntry(result);
      try {
        const commentPage = await bloomApi.getComments(session.accessToken, publicationId);
        setComments(commentPage.items);
      } catch (commentError) {
        setError(commentError instanceof Error ? commentError.message : t('commentsLoadFailed'));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('entryLoadFailed'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [publicationId, session?.accessToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateReaction = useCallback(async (code: ReactionCode) => {
    if (!session?.accessToken || !entry) return;
    const current = entry.reactions.find((reaction) => reaction.emojiCode === code);
    try {
      const result = current?.reactedByCurrentUser
        ? await bloomApi.removeReaction(session.accessToken, entry.publicationId, code)
        : await bloomApi.addReaction(session.accessToken, entry.publicationId, code);
      setEntry((currentEntry) => currentEntry ? {
        ...currentEntry,
        reactions: [
          ...currentEntry.reactions.filter((reaction) => reaction.emojiCode !== code),
          result,
        ],
      } : currentEntry);
      setShowReactionPicker(false);
    } catch (reactionError) {
      setError(reactionError instanceof Error ? reactionError.message : t('reactionUpdateFailed'));
    }
  }, [entry, session?.accessToken, t]);

  const currentUserReaction = entry?.reactions.find((reaction) => reaction.reactedByCurrentUser);
  const selectedReaction = REACTION_OPTIONS.find((option) => option.code === currentUserReaction?.emojiCode) ?? REACTION_OPTIONS[0];

  const addComment = useCallback(async () => {
    const body = draft.trim();
    if (!body || !session?.accessToken || !entry || isPosting) return;
    setIsPosting(true);
    setError(null);
    try {
      const comment = await bloomApi.addComment(session.accessToken, entry.publicationId, body);
      setComments((current) => [...current, comment]);
      setDraft('');
      setEntry((currentEntry) => currentEntry ? { ...currentEntry, commentCount: currentEntry.commentCount + 1 } : currentEntry);
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : t('commentAddFailed'));
    } finally {
      setIsPosting(false);
    }
  }, [draft, entry, isPosting, session?.accessToken, t]);

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
          refreshControl={<RefreshControl onRefresh={() => void load(true)} refreshing={isRefreshing} />}
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
          {error ? <InlineAlert message={error} onDismiss={() => setError(null)} /> : null}
          {!entry ? (
            <InlineAlert message={t('entryLoadFailed')} onDismiss={() => setError(null)} />
          ) : (
            <View>
              <View style={[styles.card, showReactionPicker ? styles.cardOpen : null]}>
                <View style={styles.authorRow}>
                  <Avatar uri={entry.authorAvatarUrl} style={styles.avatar} imageStyle={styles.avatarImage} />
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
                    <Avatar uri={comment.authorAvatarUrl} style={styles.commentAvatar} imageStyle={styles.commentAvatarImage} />
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
          <View style={styles.composerDock}>
            <View style={styles.composer}>
              <TextInput
                accessibilityLabel={t('comment')}
                editable={!isPosting}
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
                disabled={!draft.trim() || isPosting}
                onPress={() => void addComment()}
                style={[styles.sendButton, !draft.trim() || isPosting ? styles.sendButtonDisabled : null]}
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

function Avatar({ uri, style, imageStyle }: { uri: string | null; style: object; imageStyle: object }) {
  return (
    <View style={style}>
      {uri ? <Image contentFit="cover" source={{ uri }} style={imageStyle} /> : <MaterialCommunityIcons color={colors.sageDark} name="account-circle" size={26} />}
    </View>
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
