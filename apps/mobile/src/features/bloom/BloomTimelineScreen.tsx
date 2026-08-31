import { FlashList } from "@shopify/flash-list";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ActivityIndicator,
  Animated,
  useWindowDimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { BottomSheet } from "@/components/BottomSheet";
import { useAuth } from "@/auth/AuthProvider";
import { bloomApi } from "@/api/client";
import type { TimelineDay, TimelineEntry, TimelineResponse } from "@/types/api";
import { colors } from "@/styles/tokens";
import { bloomStyles as styles } from "@/styles/screens/bloom.styles";
import { InlineAlert } from "@/components/InlineAlert";
import { Avatar } from "@/components/Avatar";
import { useSettings } from "@/settings/SettingsProvider";
import {
  REACTION_OPTIONS,
  type ReactionCode,
} from "@/features/bloom/reactions";
import {
  formatLocalDate,
  formatLocalTime,
  parseLocalDateValue,
  toLocalDateValue,
} from "@/utils/date";
import { queryKeys } from "@/query/queryKeys";

export default function BloomTimelineScreen() {
  const { circleId, circleName, circleEmoji } = useLocalSearchParams<{
    circleId: string;
    circleName?: string;
    circleEmoji?: string;
  }>();
  const router = useRouter();
  const { session } = useAuth();
  const { t } = useSettings();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState<Date | null>(null);
  const [draftAuthorId, setDraftAuthorId] = useState<string | null>(null);
  const reactionInFlightRef = useRef(new Set<string>());

  const timelineQuery = useInfiniteQuery({
    queryKey: queryKeys.timeline(circleId ?? "", selectedDate ?? undefined, selectedAuthorId ?? undefined),
    queryFn: ({ pageParam }) => bloomApi.getTimeline(
      session!.accessToken,
      circleId!,
      pageParam,
      selectedDate ?? undefined,
      selectedAuthorId ?? undefined,
    ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(session?.accessToken && circleId),
  });
  const days = useMemo(
    () => timelineQuery.data?.pages.flatMap((page) => page.days) ?? [],
    [timelineQuery.data],
  );
  const isLoading = timelineQuery.isPending;
  const isRefreshing = timelineQuery.isRefetching && !timelineQuery.isPending;
  const isLoadingMore = timelineQuery.isFetchingNextPage;
  const nextCursor = timelineQuery.hasNextPage ? "available" : null;
  const circleQuery = useQuery({
    queryKey: queryKeys.circle(circleId ?? ""),
    queryFn: () => bloomApi.getCircle(session!.accessToken, circleId!),
    enabled: Boolean(session?.accessToken && circleId),
  });
  const members = useMemo(
    () => circleQuery.data?.members.filter((member) => member.isActive) ?? [],
    [circleQuery.data],
  );
  const load = useCallback(async () => {
    setError(null);
    await timelineQuery.refetch();
  }, [timelineQuery]);
  const loadMore = useCallback(async () => {
    if (timelineQuery.hasNextPage && !timelineQuery.isFetchingNextPage) {
      await timelineQuery.fetchNextPage();
    }
  }, [timelineQuery]);

  const openFilterSheet = useCallback(() => {
    setDraftDate(selectedDate ? parseLocalDateValue(selectedDate) : null);
    setDraftAuthorId(selectedAuthorId);
    setShowDatePicker(false);
    setFilterSheetVisible(true);
  }, [selectedAuthorId, selectedDate]);

  const applyFilters = useCallback(() => {
    const nextDate = draftDate ? toLocalDateValue(draftDate) : null;
    setSelectedDate(nextDate);
    setSelectedAuthorId(draftAuthorId);
    setFilterSheetVisible(false);
    setShowDatePicker(false);
  }, [draftAuthorId, draftDate]);

  const resetFilters = useCallback(() => {
    setDraftDate(null);
    setDraftAuthorId(null);
    setSelectedDate(null);
    setSelectedAuthorId(null);
    setFilterSheetVisible(false);
    setShowDatePicker(false);
  }, []);

  const selectedMemberName = selectedAuthorId
    ? members.find((member) => member.userId === selectedAuthorId)?.displayName
    : null;

  const updateReaction = useCallback(
    async (entry: TimelineEntry, code: ReactionCode) => {
      if (!session?.accessToken) return;
      // A fast double tap can otherwise issue add/remove requests against the
      // same stale reaction state. Serialize reaction changes per post until
      // the server has returned the authoritative result.
      if (reactionInFlightRef.current.has(entry.publicationId)) return;
      reactionInFlightRef.current.add(entry.publicationId);
      setError(null);
      const current = entry.reactions.find(
        (reaction) => reaction.emojiCode === code,
      );
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
        queryClient.setQueryData<InfiniteData<TimelineResponse>>(
          queryKeys.timeline(circleId ?? "", selectedDate ?? undefined, selectedAuthorId ?? undefined),
          (currentData) => currentData
            ? {
                ...currentData,
                pages: currentData.pages.map((page) => ({
                  ...page,
                  days: page.days.map((day) => ({
                    ...day,
                    entries: day.entries.map((item) =>
                      item.publicationId === entry.publicationId
                        ? {
                            ...item,
                            reactions: [
                              ...item.reactions.filter((reaction) => reaction.emojiCode !== code),
                              result,
                            ],
                          }
                        : item,
                    ),
                  })),
                })),
              }
            : currentData,
        );
        void queryClient.invalidateQueries({ queryKey: queryKeys.entry(entry.publicationId) });
      } catch (reactionError) {
        setError(
          reactionError instanceof Error
            ? reactionError.message
          : t("reactionUpdateFailed"),
        );
      } finally {
        reactionInFlightRef.current.delete(entry.publicationId);
      }
    },
    [circleId, queryClient, selectedAuthorId, selectedDate, session?.accessToken, t],
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
          <MaterialCommunityIcons
            color={colors.ink}
            name="arrow-left"
            size={19}
          />
        </Pressable>
        <Text numberOfLines={1} style={styles.topBarTitle}>
          {circleName || t("timelineTitle")} {circleEmoji || "🌸"}
        </Text>
        <Text style={styles.bloomBadge}>{t("bloomedStatus")}</Text>
      </View>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.subtitle, styles.headerCopy]}>
            {t("timelineSubtitle")}
          </Text>
          <Pressable
            accessibilityLabel={t("filter")}
            accessibilityRole="button"
            onPress={openFilterSheet}
            style={styles.filterButton}
          >
            <MaterialCommunityIcons
              color={colors.ink}
              name="filter-variant"
              size={16}
            />
            <Text style={styles.filterButtonText}>{t("filter")}</Text>
          </Pressable>
        </View>
        {selectedDate || selectedAuthorId ? (
          <View style={styles.filterChips}>
            {selectedDate ? (
              <View style={styles.filterChip}>
                <MaterialCommunityIcons
                  color={colors.sageDark}
                  name="calendar-outline"
                  size={14}
                />
                <Text style={styles.filterChipText}>
                  {formatDate(selectedDate)}
                </Text>
              </View>
            ) : null}
            {selectedAuthorId ? (
              <View style={styles.filterChip}>
                <MaterialCommunityIcons
                  color={colors.sageDark}
                  name="account-outline"
                  size={14}
                />
                <Text style={styles.filterChipText}>
                  {selectedMemberName ?? t("person")}
                </Text>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={resetFilters}
              style={styles.filterReset}
            >
              <Text style={styles.filterResetText}>{t("resetFilters")}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {error || timelineQuery.error ? (
        <InlineAlert
          message={error ?? (timelineQuery.error instanceof Error ? timelineQuery.error.message : t("timelineLoadFailed"))}
          onDismiss={() => void load()}
        />
      ) : null}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.coralDark} />
        </View>
      ) : (
        <FlashList
          data={days}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.date}
          ListEmptyComponent={
            <Text style={styles.empty}>{t("noSharedEntries")}</Text>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadMoreFooter}>
                <ActivityIndicator color={colors.coralDark} />
                <Text style={styles.loadMoreText}>{t("loadingMore")}</Text>
              </View>
            ) : nextCursor === null && days.length > 0 ? (
              <Text style={styles.timelineEnd}>{t("timelineEnd")}</Text>
            ) : null
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.6}
          onRefresh={() => void load()}
          refreshing={isRefreshing}
          renderItem={({ item }) => (
            <DaySection
              accessToken={session?.accessToken}
              day={item}
              onOpen={(entry) =>
                router.push({
                  pathname: "/entry/[publicationId]",
                  params: { publicationId: entry.publicationId },
                })
              }
              onSelectReaction={(entry, code) =>
                void updateReaction(entry, code)
              }
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
      <BottomSheet
        backdropStyle={styles.sheetBackdrop}
        onClose={() => setFilterSheetVisible(false)}
        sheetStyle={styles.sheet}
        visible={filterSheetVisible}
      >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t("filter")}</Text>
              <Pressable
                accessibilityLabel={t("cancel")}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setFilterSheetVisible(false)}
                style={styles.sheetClose}
              >
                <MaterialCommunityIcons
                  color={colors.inkSoft}
                  name="close"
                  size={20}
                />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.filterSectionTitle}>{t("filterByDate")}</Text>
              <View style={styles.filterDateRow}>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={styles.filterDateButton}
                >
                  <MaterialCommunityIcons
                    color={colors.sageDark}
                    name="calendar-outline"
                    size={18}
                  />
                  <Text style={styles.filterDateText}>
                    {draftDate
                      ? formatDate(toLocalDateValue(draftDate))
                      : t("anyDate")}
                  </Text>
                </Pressable>
                {draftDate ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDraftDate(null)}
                    style={styles.filterClearButton}
                  >
                    <MaterialCommunityIcons
                      color={colors.inkSoft}
                      name="close-circle-outline"
                      size={20}
                    />
                  </Pressable>
                ) : null}
              </View>
              {showDatePicker ? (
                <View style={styles.pickerPanel}>
                  <DateTimePicker
                    display="spinner"
                    mode="date"
                    onDismiss={() => setShowDatePicker(false)}
                    onValueChange={(_, value) => {
                      if (!value) return;
                      setDraftDate(value);
                      setShowDatePicker(false);
                    }}
                    value={draftDate ?? new Date()}
                  />
                </View>
              ) : null}

              <Text style={styles.filterSectionTitle}>
                {t("filterByPerson")}
              </Text>
              <Pressable
                onPress={() => setDraftAuthorId(null)}
                style={[
                  styles.filterMember,
                  draftAuthorId === null ? styles.filterMemberSelected : null,
                ]}
              >
                <View style={styles.filterMemberAvatar}>
                  <MaterialCommunityIcons
                    color={colors.sageDark}
                    name="account-group-outline"
                    size={18}
                  />
                </View>
                <Text style={styles.filterMemberName}>{t("everyone")}</Text>
                {draftAuthorId === null ? (
                  <MaterialCommunityIcons
                    color={colors.sageDark}
                    name="check"
                    size={19}
                  />
                ) : null}
              </Pressable>
              {members.map((member) => {
                const isSelected = draftAuthorId === member.userId;
                const initial =
                  member.displayName.trim().charAt(0).toUpperCase() || "?";
                return (
                  <Pressable
                    key={member.userId}
                    onPress={() => setDraftAuthorId(member.userId)}
                    style={[
                      styles.filterMember,
                      isSelected ? styles.filterMemberSelected : null,
                    ]}
                  >
                  <Avatar
                    accessibilityLabel={member.displayName}
                    containerStyle={styles.filterMemberAvatar}
                    imageStyle={styles.filterMemberAvatarImage}
                    initial={initial}
                    textStyle={styles.filterMemberAvatarText}
                    uri={member.avatarUrl}
                  />
                    <Text numberOfLines={1} style={styles.filterMemberName}>
                      {member.displayName}
                    </Text>
                    {isSelected ? (
                      <MaterialCommunityIcons
                        color={colors.sageDark}
                        name="check"
                        size={19}
                      />
                    ) : null}
                  </Pressable>
                );
              })}

              <View style={styles.filterActions}>
                <Pressable
                  onPress={resetFilters}
                  style={styles.filterResetButton}
                >
                  <Text style={styles.filterResetButtonText}>
                    {t("resetFilters")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={applyFilters}
                  style={styles.filterApplyButton}
                >
                  <Text style={styles.filterApplyButtonText}>
                    {t("applyFilters")}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
      </BottomSheet>
    </Screen>
  );
}

const DaySection = memo(function DaySection({
  accessToken,
  day,
  onOpen,
  onSelectReaction,
}: {
  accessToken?: string;
  day: TimelineDay;
  onOpen: (entry: TimelineEntry) => void;
  onSelectReaction: (entry: TimelineEntry, code: ReactionCode) => void;
}) {
  return (
    <View style={styles.daySection}>
      <DateDivider date={day.date} />
      <DayCarousel
        accessToken={accessToken}
        entries={day.entries}
        onOpen={onOpen}
        onSelectReaction={onSelectReaction}
      />
    </View>
  );
});

const DayCarousel = memo(function DayCarousel({
  accessToken,
  entries,
  onOpen,
  onSelectReaction,
}: {
  accessToken?: string;
  entries: TimelineEntry[];
  onOpen: (entry: TimelineEntry) => void;
  onSelectReaction: (entry: TimelineEntry, code: ReactionCode) => void;
}) {
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const itemWidth = Math.max(280, width - 64);
  const itemSize = itemWidth + 12;
  const [activeIndex, setActiveIndex] = useState(0);
  const { t } = useSettings();

  return (
    <View>
      <Animated.ScrollView
        contentContainerStyle={styles.carouselContent}
        decelerationRate="fast"
        directionalLockEnabled
        horizontal
        nestedScrollEnabled
        onMomentumScrollEnd={(event) => {
          setActiveIndex(
            Math.round(event.nativeEvent.contentOffset.x / itemSize),
          );
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemSize}
      >
        {entries.map((entry, index) => {
          const inputRange = [
            (index - 1) * itemSize,
            index * itemSize,
            (index + 1) * itemSize,
          ];
          const animatedStyle = {
            opacity: scrollX.interpolate({
              inputRange,
              outputRange: [0.72, 1, 0.72],
              extrapolate: "clamp" as const,
            }),
            transform: [
              {
                scale: scrollX.interpolate({
                  inputRange,
                  outputRange: [0.96, 1, 0.96],
                  extrapolate: "clamp" as const,
                }),
              },
            ],
          };
          return (
            <Animated.View
              key={entry.publicationId}
              style={[styles.carouselItem, { width: itemWidth }, animatedStyle]}
            >
              <TimelineCard
                accessToken={accessToken}
                entry={entry}
                onOpen={() => onOpen(entry)}
                onSelectReaction={(code) => onSelectReaction(entry, code)}
              />
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
      {entries.length > 1 ? (
        <View
          accessibilityLabel={`${activeIndex + 1} ${t("of")} ${entries.length}`}
          style={styles.carouselIndicatorRow}
        >
          <View style={styles.carouselDots}>
            {entries.map((entry, index) => (
              <View
                key={entry.publicationId}
                style={[
                  styles.carouselDot,
                  index === activeIndex ? styles.carouselDotActive : null,
                ]}
              />
            ))}
          </View>
          <Text style={styles.carouselCount}>
            {activeIndex + 1} / {entries.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

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
  const currentUserReaction = entry.reactions.find(
    (item) => item.reactedByCurrentUser,
  );
  const selectedReaction =
    REACTION_OPTIONS.find(
      (option) => option.code === currentUserReaction?.emojiCode,
    ) ?? REACTION_OPTIONS[0];
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
          <Avatar
            accessibilityLabel={entry.authorDisplayName}
            containerStyle={styles.avatar}
            imageStyle={styles.avatarImage}
            initial={initial}
            textStyle={styles.avatarText}
            uri={entry.authorAvatarUrl}
          />
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
          <Text style={styles.reactionCount}>
            {currentUserReaction?.count ?? reaction?.count ?? 0}
          </Text>
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
  return formatLocalDate(value);
}

function formatTime(value: string): string {
  return formatLocalTime(value);
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
