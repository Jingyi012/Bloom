import { FlashList } from "@shopify/flash-list";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/auth/AuthProvider";
import { bloomApi } from "@/api/client";
import type { TimelineEntry } from "@/types/api";
import { colors } from "@/styles/tokens";
import { bloomStyles as styles } from "@/styles/screens/bloom.styles";
import { InlineAlert } from "@/components/InlineAlert";
import { useSettings } from "@/settings/SettingsProvider";
import { REACTION_OPTIONS, type ReactionCode } from "@/features/bloom/reactions";

export default function BloomTimelineScreen() {
  const { circleId, circleName, circleEmoji } = useLocalSearchParams<{
    circleId: string;
    circleName?: string;
    circleEmoji?: string;
  }>();
  const router = useRouter();
  const { session } = useAuth();
  const { t } = useSettings();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!session?.accessToken || !circleId) return;
      refresh ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);
      try {
        const page = await bloomApi.getTimeline(session.accessToken, circleId);
        setEntries(page.items);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("timelineLoadFailed"),
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [circleId, session?.accessToken, t],
  );

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void load(true);
    });
    return () => subscription.remove();
  }, [load]);

  const updateReaction = useCallback(
    async (entry: TimelineEntry, code: ReactionCode) => {
      if (!session?.accessToken) return;
      const current = entry.reactions.find((reaction) => reaction.emojiCode === code);
      try {
        const result = current?.reactedByCurrentUser
          ? await bloomApi.removeReaction(
              session.accessToken,
              entry.publicationId,
              code,
            )
          : await bloomApi.addReaction(
              session.accessToken,
              entry.publicationId,
              code,
            );
        setEntries((items) =>
          items.map((item) =>
            item.publicationId === entry.publicationId
              ? {
                  ...item,
                  reactions: [
                    ...item.reactions.filter(
                      (reaction) => reaction.emojiCode !== code,
                    ),
                    result,
                  ],
                }
              : item,
          ),
        );
      } catch (reactionError) {
        setError(
          reactionError instanceof Error
            ? reactionError.message
            : t("reactionUpdateFailed"),
        );
      }
    },
    [session?.accessToken, t],
  );

  return (
    <Screen scroll={false}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel={t("backToCircles")}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons color={colors.ink} name="arrow-left" size={19} />
        </Pressable>
        <Text numberOfLines={1} style={styles.topBarTitle}>
          {circleName || t("timelineTitle")} {circleEmoji || "🌸"}
        </Text>
        <Text style={styles.bloomBadge}>{t("bloomedStatus")}</Text>
      </View>
      <View style={styles.header}>
        <Text style={styles.subtitle}>{t("timelineSubtitle")}</Text>
      </View>
      {error ? (
        <InlineAlert message={error} onDismiss={() => setError(null)} />
      ) : null}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.coralDark} />
        </View>
      ) : (
        <FlashList
          data={entries}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.publicationId}
          ListEmptyComponent={
            <Text style={styles.empty}>{t("noSharedEntries")}</Text>
          }
          onRefresh={() => void load(true)}
          refreshing={isRefreshing}
          renderItem={({ item, index }) => (
            <View>
              {index === 0 ||
              entries[index - 1]?.authorLocalDate !== item.authorLocalDate ? (
                <DateDivider date={item.authorLocalDate} />
              ) : null}
              <TimelineCard
                accessToken={session?.accessToken}
                entry={item}
                onOpen={() =>
                  router.push({
                    pathname: "/entry/[publicationId]",
                    params: { publicationId: item.publicationId },
                  })
                }
                onSelectReaction={(code) => void updateReaction(item, code)}
              />
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const TimelineCard = memo(function TimelineCard({
  accessToken,
  entry,
  onOpen,
  onSelectReaction,
}: {
  accessToken?: string;
  entry: TimelineEntry;
  onOpen: () => void;
  onSelectReaction: (code: ReactionCode) => void;
}) {
  const { t } = useSettings();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const suppressNextReactionPress = useRef(false);
  const reaction = entry.reactions.find(
    (item) => item.emojiCode === REACTION_OPTIONS[0].code,
  );
  const currentUserReaction = entry.reactions.find((item) => item.reactedByCurrentUser);
  const selectedReaction = REACTION_OPTIONS.find((option) => option.code === currentUserReaction?.emojiCode) ?? REACTION_OPTIONS[0];
  const initial = entry.authorDisplayName.trim().charAt(0).toUpperCase() || "?";
  return (
    <View style={[styles.card, showReactionPicker ? styles.cardOpen : null]}>
      <Pressable
        accessibilityHint={t("openDiaryEntry")}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [pressed ? styles.cardPressed : null]}
      >
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.authorCopy}>
            <Text style={styles.author}>{entry.authorDisplayName}</Text>
            <Text style={styles.date}>
              {formatTime(entry.submittedAtUtc)}
              {entry.mood ? ` · ${t("felt")} ${moodEmoji(entry.mood)}` : ""}
            </Text>
          </View>
          {entry.mood ? (
            <Text style={styles.mood}>{moodEmoji(entry.mood)}</Text>
          ) : null}
        </View>
        <Text style={styles.body}>{entry.text}</Text>
      </Pressable>
      {entry.mediaIds.length > 0 && accessToken ? (
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
              accessibilityLabel={`${t("diaryPhoto")} ${index + 1} ${t("of")} ${entry.mediaIds.length}`}
              contentFit="cover"
              source={{
                uri: bloomApi.mediaUrl(mediaId),
                headers: { Authorization: `Bearer ${accessToken}` },
              }}
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
              onPress={() => {
                onSelectReaction(option.code);
                setShowReactionPicker(false);
              }}
              style={styles.reactionOption}
            >
              <Text style={styles.reactionOptionText}>{option.icon}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityLabel={t("reactWithHeart")}
          accessibilityRole="button"
          accessibilityState={{
            selected: currentUserReaction !== undefined,
          }}
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
            onSelectReaction(selectedReaction.code);
          }}
          style={[
            styles.reaction,
            currentUserReaction ? styles.reactionActive : null,
          ]}
        >
          <Text style={styles.reactionText}>{selectedReaction.icon}</Text>
          <Text style={styles.reactionCount}>{currentUserReaction?.count ?? reaction?.count ?? 0}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`${entry.commentCount} ${entry.commentCount === 1 ? t("comment") : t("comments")}`}
          accessibilityRole="button"
          onPress={onOpen}
        >
          <Text style={styles.commentAction}>
            {entry.commentCount}{" "}
            {entry.commentCount === 1 ? t("comment") : t("comments")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const DateDivider = memo(function DateDivider({ date }: { date: string }) {
  return (
    <View style={styles.dayDivider}>
      <View style={styles.dayDividerLine} />
      <Text style={styles.dayDividerText}>{formatDate(date)}</Text>
      <View style={styles.dayDividerLine} />
    </View>
  );
});

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(
    new Date(value),
  );
}

function moodEmoji(mood: string): string {
  return (
    {
      heavy: "😢",
      restless: "😐",
      calm: "🙂",
      joyful: "😄",
      radiant: "🤩",
    }[mood] ?? mood
  );
}
