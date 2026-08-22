import { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { bloomApi } from '@/api/client';
import type { Comment as ApiComment, TimelineEntry } from '@/types/api';
import { colors } from '@/styles/tokens';
import { bloomStyles as styles } from '@/styles/screens/bloom.styles';

const PRIMARY_REACTION = '❤️';

export default function BloomTimelineScreen() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const { session } = useAuth();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [comments, setComments] = useState<Record<string, ApiComment[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!session?.accessToken || !circleId) return;
    refresh ? setIsRefreshing(true) : setIsLoading(true);
    setError(null);
    try {
      const page = await bloomApi.getTimeline(session.accessToken, circleId);
      setEntries(page.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not open this timeline.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [circleId, session?.accessToken]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void load(true); });
    return () => subscription.remove();
  }, [load]);

  const toggleReaction = useCallback(async (entry: TimelineEntry) => {
    if (!session?.accessToken) return;
    const current = entry.reactions.find(reaction => reaction.emojiCode === PRIMARY_REACTION);
    try {
      const result = current?.reactedByCurrentUser
        ? await bloomApi.removeReaction(session.accessToken, entry.publicationId, PRIMARY_REACTION)
        : await bloomApi.addReaction(session.accessToken, entry.publicationId, PRIMARY_REACTION);
      setEntries(items => items.map(item => item.publicationId === entry.publicationId
        ? { ...item, reactions: [...item.reactions.filter(reaction => reaction.emojiCode !== PRIMARY_REACTION), result] }
        : item));
    } catch (reactionError) {
      setError(reactionError instanceof Error ? reactionError.message : 'Could not update your reaction.');
    }
  }, [session?.accessToken]);

  const toggleComments = useCallback(async (entry: TimelineEntry) => {
    const nextOpen = !openComments[entry.publicationId];
    setOpenComments(current => ({ ...current, [entry.publicationId]: nextOpen }));
    if (!nextOpen || comments[entry.publicationId]) return;
    if (!session?.accessToken) return;
    try {
      const page = await bloomApi.getComments(session.accessToken, entry.publicationId);
      setComments(current => ({ ...current, [entry.publicationId]: page.items }));
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : 'Could not load comments.');
    }
  }, [comments, openComments, session?.accessToken]);

  const addComment = useCallback(async (entry: TimelineEntry) => {
    const body = drafts[entry.publicationId]?.trim();
    if (!body || !session?.accessToken) return;
    try {
      const comment = await bloomApi.addComment(session.accessToken, entry.publicationId, body);
      setComments(current => ({ ...current, [entry.publicationId]: [...(current[entry.publicationId] ?? []), comment] }));
      setDrafts(current => ({ ...current, [entry.publicationId]: '' }));
      setEntries(items => items.map(item => item.publicationId === entry.publicationId ? { ...item, commentCount: item.commentCount + 1 } : item));
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : 'Could not add your comment.');
    }
  }, [drafts, session?.accessToken]);

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>THE BLOOM</Text>
        <Text style={styles.title}>Together, then.</Text>
        <Text style={styles.subtitle}>Everything written in this circle is open now.</Text>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {isLoading ? <View style={styles.loading}><ActivityIndicator color={colors.coralDark} /></View> : (
        <FlashList
          data={entries}
          keyExtractor={item => item.publicationId}
          ListEmptyComponent={<Text style={styles.empty}>No diary entries were shared in this circle.</Text>}
          onRefresh={() => void load(true)}
          refreshing={isRefreshing}
          renderItem={({ item }) => <TimelineCard accessToken={session?.accessToken} entry={item} comments={comments[item.publicationId] ?? []} draft={drafts[item.publicationId] ?? ''} isCommentsOpen={openComments[item.publicationId] === true} onChangeDraft={value => setDrafts(current => ({ ...current, [item.publicationId]: value }))} onAddComment={() => void addComment(item)} onToggleComments={() => void toggleComments(item)} onToggleReaction={() => void toggleReaction(item)} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

function TimelineCard({ accessToken, entry, comments, draft, isCommentsOpen, onChangeDraft, onAddComment, onToggleComments, onToggleReaction }: { accessToken?: string; entry: TimelineEntry; comments: ApiComment[]; draft: string; isCommentsOpen: boolean; onChangeDraft: (value: string) => void; onAddComment: () => void; onToggleComments: () => void; onToggleReaction: () => void }) {
  const reaction = entry.reactions.find(item => item.emojiCode === PRIMARY_REACTION);
  const initial = entry.authorDisplayName.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={styles.card}>
      <View style={styles.authorRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
        <View style={styles.authorCopy}><Text style={styles.author}>{entry.authorDisplayName}</Text><Text style={styles.date}>{formatDate(entry.authorLocalDate)}</Text></View>
        {entry.mood ? <Text style={styles.mood}>{entry.mood}</Text> : null}
      </View>
      <Text style={styles.body}>{entry.text}</Text>
      {entry.mediaId && accessToken ? <Image accessibilityLabel="Diary photo" contentFit="cover" source={{ uri: bloomApi.mediaUrl(entry.mediaId), headers: { Authorization: `Bearer ${accessToken}` } }} style={styles.media} /> : null}
      <View style={styles.actionRow}>
        <Pressable accessibilityLabel="React with heart" accessibilityRole="button" accessibilityState={{ selected: reaction?.reactedByCurrentUser === true }} onPress={onToggleReaction} style={[styles.reaction, reaction?.reactedByCurrentUser ? styles.reactionActive : null]}><Text style={styles.reactionText}>❤️</Text><Text style={styles.reactionCount}>{reaction?.count ?? 0}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={onToggleComments}><Text style={styles.commentAction}>{entry.commentCount} {entry.commentCount === 1 ? 'comment' : 'comments'}</Text></Pressable>
      </View>
      {isCommentsOpen ? <View style={styles.comments}>
        {comments.map(comment => <View key={comment.id} style={styles.comment}><Text style={styles.commentAuthor}>{comment.authorDisplayName}</Text><Text style={styles.commentBody}>{comment.body}</Text></View>)}
        <View style={styles.commentInputRow}><TextInput accessibilityLabel="Comment" maxLength={1000} onChangeText={onChangeDraft} placeholder="Say something kind" placeholderTextColor={colors.inkSoft} style={styles.commentInput} value={draft} /><Pressable accessibilityLabel="Post comment" accessibilityRole="button" disabled={!draft.trim()} onPress={onAddComment}><Text style={styles.commentSend}>Post</Text></Pressable></View>
      </View> : null}
    </View>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`));
}
