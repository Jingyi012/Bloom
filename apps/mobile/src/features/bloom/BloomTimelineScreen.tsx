import { FlashList } from "@shopify/flash-list";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ActivityIndicator,
  Animated,
  AppState,
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
import type { CircleMember, TimelineDay, TimelineEntry } from "@/types/api";
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

export default function BloomTimelineScreen() {
  const { circleId, circleName, circleEmoji } = useLocalSearchParams<{
    circleId: string;
    circleName?: string;
    circleEmoji?: string;
  }>();
  const router = useRouter();
  const { session } = useAuth();
  const { t } = useSettings();
  const [days, setDays] = useState<TimelineDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState<Date | null>(null);
  const [draftAuthorId, setDraftAuthorId] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  const load = useCallback(
    async (refresh = false) => {
      if (!session?.accessToken || !circleId) return;
      refresh ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);
      try {
        const page = await bloomApi.getTimeline(
          session.accessToken,
          circleId,
          undefined,
          selectedDate ?? undefined,
          selectedAuthorId ?? undefined,
        );
        setDays(page.days);
        setNextCursor(page.nextCursor);
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
    [circleId, selectedAuthorId, selectedDate, session?.accessToken, t],
  );

  const loadMore = useCallback(async () => {
    if (
      !session?.accessToken ||
      !circleId ||
      !nextCursor ||
      isLoading ||
      isRefreshing ||
      loadingMoreRef.current
    )
      return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const page = await bloomApi.getTimeline(
        session.accessToken,
        circleId,
        nextCursor,
        selectedDate ?? undefined,
        selectedAuthorId ?? undefined,
      );
      setDays((current) => {
        const merged = current.map((day) => ({
          ...day,
          entries: [...day.entries],
        }));
        for (const incomingDay of page.days) {
          const existingDay = merged.find(
            (day) => day.date === incomingDay.date,
          );
          if (!existingDay) {
            merged.push(incomingDay);
            continue;
          }
          const existingIds = new Set(
            existingDay.entries.map((entry) => entry.publicationId),
          );
          existingDay.entries = [
            ...existingDay.entries,
            ...incomingDay.entries.filter(
              (entry) => !existingIds.has(entry.publicationId),
            ),
          ];
        }
        return merged;
      });
      setNextCursor(page.nextCursor);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("timelineLoadFailed"),
      );
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [
    circleId,
    isLoading,
    isRefreshing,
    nextCursor,
    selectedAuthorId,
    selectedDate,
    session?.accessToken,
    t,
  ]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void load(true);
    });
    return () => subscription.remove();
  }, [load]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!session?.accessToken || !circleId) return;
      try {
        const detail = await bloomApi.getCircle(session.accessToken, circleId);
        setMembers(detail.members.filter((member) => member.isActive));
      } catch {
        // Timeline data remains useful when the member list cannot be loaded.
      }
    };
    void loadMembers();
  }, [circleId, session?.accessToken]);

  const openFilterSheet = useCallback(() => {
    setDraftDate(selectedDate ? parseLocalDateValue(selectedDate) : null);
    setDraftAuthorId(selectedAuthorId);
    setShowDatePicker(false);
    setFilterSheetVisible(true);
  }, [selectedAuthorId, selectedDate]);

  const applyFilters = useCallback(() => {
    const nextDate = draftDate ? toLocalDateValue(draftDate) : null;
    const filtersChanged =
      nextDate !== selectedDate || draftAuthorId !== selectedAuthorId;
    setSelectedDate(nextDate);
    setSelectedAuthorId(draftAuthorId);
    setFilterSheetVisible(false);
    setShowDatePicker(false);
    if (filtersChanged) {
      setDays([]);
      setNextCursor(null);
      loadingMoreRef.current = false;
    } else {
      void load(true);
    }
  }, [draftAuthorId, draftDate, load, selectedAuthorId, selectedDate]);

  const resetFilters = useCallback(() => {
    const filtersWereActive =
      selectedDate !== null || selectedAuthorId !== null;
    setDraftDate(null);
    setDraftAuthorId(null);
    setSelectedDate(null);
    setSelectedAuthorId(null);
    setFilterSheetVisible(false);
    setShowDatePicker(false);
    if (filtersWereActive) {
      setDays([]);
      setNextCursor(null);
      loadingMoreRef.current = false;
    } else {
      void load(true);
    }
  }, [load, selectedAuthorId, selectedDate]);

  const selectedMemberName = selectedAuthorId
    ? members.find((member) => member.userId === selectedAuthorId)?.displayName
    : null;

  const updateReaction = useCallback(
    async (entry: TimelineEntry, code: ReactionCode) => {
      if (!session?.accessToken) return;
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
        setDays((currentDays) =>
          currentDays.map((day) => ({
            ...day,
            entries: day.entries.map((item) =>
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
          })),
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
      {error ? (
        <InlineAlert message={error} onDismiss={() => setError(null)} />
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
          onRefresh={() => void load(true)}
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
