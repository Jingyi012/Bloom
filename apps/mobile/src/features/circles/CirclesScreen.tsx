import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Screen } from "@/components/Screen";
import { BottomSheet } from "@/components/BottomSheet";
import { useAuth } from "@/auth/AuthProvider";
import { bloomApi } from "@/api/client";
import type { CircleSummary } from "@/types/api";
import { colors } from "@/styles/tokens";
import { circlesStyles as styles } from "@/styles/screens/circles.styles";
import { useSettings } from "@/settings/SettingsProvider";
import { InlineAlert } from "@/components/InlineAlert";
import { getDeviceTimeZone } from "@/utils/device";
import { formatLocalDate, formatLocalTime } from "@/utils/date";
import { CIRCLE_EMOJIS } from "@/features/circles/circleEmojis";
import { queryKeys } from "@/query/queryKeys";

function getDefaultBloomDate(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setSeconds(0, 0);
  return date;
}

function formatBloomDate(value: Date): string {
  return formatLocalDate(value);
}

function formatBloomTime(value: Date): string {
  return formatLocalTime(value);
}

export default function CirclesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { t } = useSettings();
  const deviceTimeZone = useMemo(() => getDeviceTimeZone(), []);
  const queryClient = useQueryClient();
  const circlesQuery = useQuery({
    queryKey: queryKeys.circles,
    queryFn: () => bloomApi.listCircles(session!.accessToken),
    enabled: Boolean(session?.accessToken),
  });
  const invitationsQuery = useQuery({
    queryKey: queryKeys.invitations,
    queryFn: () => bloomApi.listCircleInvitations(session!.accessToken),
    enabled: Boolean(session?.accessToken),
  });
  const circles = circlesQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];
  const isLoading = circlesQuery.isPending || invitationsQuery.isPending;
  const isRefreshing = (circlesQuery.isFetching || invitationsQuery.isFetching) && !isLoading;
  const queryError = circlesQuery.error ?? invitationsQuery.error;
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string>(CIRCLE_EMOJIS[0]);
  const [bloomAt, setBloomAt] = useState<Date>(getDefaultBloomDate);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [circleToArchive, setCircleToArchive] = useState<CircleSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createMutation = useMutation({
    mutationFn: (request: Parameters<typeof bloomApi.createCircle>[1]) =>
      bloomApi.createCircle(session!.accessToken, request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.circles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
      ]);
    },
  });
  const respondMutation = useMutation({
    mutationFn: ({ invitationId, accept }: { invitationId: string; accept: boolean }) =>
      bloomApi.respondToCircleInvitation(session!.accessToken, invitationId, accept),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.invitations }),
        queryClient.invalidateQueries({ queryKey: queryKeys.circles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
      ]);
    },
  });
  const archiveMutation = useMutation({
    mutationFn: (circleId: string) => bloomApi.archiveCircle(session!.accessToken, circleId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.circles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.archivedCircles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
      ]);
    },
    onError: (archiveError) => setError(archiveError instanceof Error ? archiveError.message : t("requestFailed")),
  });

  const load = useCallback(async () => {
    await Promise.all([circlesQuery.refetch(), invitationsQuery.refetch()]);
  }, [circlesQuery, invitationsQuery]);

  const create = useCallback(async () => {
    if (!session?.accessToken || !name.trim()) {
      setError(t("circleNameRequired"));
      return;
    }
    if (createMutation.isPending) return;
    setError(null);
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        emoji,
        bloomAtUtc: bloomAt.toISOString(),
        timeZoneId: deviceTimeZone,
      });
      setName("");
      setEmoji(CIRCLE_EMOJIS[0]);
      setBloomAt(getDefaultBloomDate());
      setShowCreateForm(false);
      await load();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : t("circleCreateFailed"),
      );
    } finally {
    }
  }, [bloomAt, createMutation, deviceTimeZone, emoji, load, name, session?.accessToken, t]);

  const handleBloomPickerValueChange = useCallback(
    (_event: DateTimePickerChangeEvent, selected: Date) => {
      setBloomAt(selected);
      if (Platform.OS === "android") setPickerMode(null);
    },
    [],
  );

  const dismissBloomPicker = useCallback(() => setPickerMode(null), []);

  const respond = useCallback(
    async (invitationId: string, accept: boolean) => {
      if (!session?.accessToken) return;
      try {
        await respondMutation.mutateAsync({ invitationId, accept });
        await load();
      } catch (responseError) {
        setError(
          responseError instanceof Error
            ? responseError.message
          : t("invitationUpdateFailed"),
        );
      }
    },
    [load, respondMutation, session?.accessToken, t],
  );

  const archive = useCallback((circle: CircleSummary) => {
    if (circle.status !== "Bloomed" || archiveMutation.isPending) return;
    setCircleToArchive(circle);
  }, [archiveMutation.isPending]);

  const confirmArchive = useCallback(async () => {
    if (!circleToArchive || archiveMutation.isPending) return;
    try {
      await archiveMutation.mutateAsync(circleToArchive.id);
      setCircleToArchive(null);
    } catch {
      // Close the confirmation sheet so the shared InlineAlert can be seen.
      setCircleToArchive(null);
    }
  }, [archiveMutation, circleToArchive]);

  const header = useMemo(
    () => (
      <View>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{t("yourGarden")}</Text>
            <Text style={styles.title}>{t("yourCircles")}</Text>
            <Text style={styles.subtitle}>{t("circlesSubtitle")}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("plantCircle")}
            style={styles.addButton}
            onPress={() => setShowCreateForm((visible) => !visible)}
          >
            <Text style={styles.addButtonText}>＋</Text>
          </Pressable>
        </View>

        {invitations.length > 0 ? (
          <View style={styles.invitations}>
            <Text style={styles.sectionTitle}>{t("invitations")}</Text>
            {invitations.map((invitation) => (
              <View key={invitation.id} style={styles.invitationCard}>
                <Text style={styles.invitationEmoji}>
                  {invitation.circleEmoji}
                </Text>
                <View style={styles.invitationCopy}>
                  <Text style={styles.cardTitle}>{invitation.circleName}</Text>
                  <Text style={styles.cardBody}>{t("joinQuestion")}</Text>
                </View>
                <View style={styles.invitationActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void respond(invitation.id, false)}
                  >
                    <Text style={styles.decline}>{t("decline")}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void respond(invitation.id, true)}
                  >
                    <Text style={styles.accept}>{t("join")}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {error || queryError ? (
          <InlineAlert
            message={error ?? (queryError instanceof Error ? queryError.message : t("circleLoadFailed"))}
            onDismiss={() => {
              setError(null);
              void load();
            }}
          />
        ) : null}
        <Text style={styles.sectionTitle}>{t("activeCirclesTitle")}</Text>
      </View>
    ),
    [
      bloomAt,
      create,
      deviceTimeZone,
      dismissBloomPicker,
      error,
      handleBloomPickerValueChange,
      invitations,
      createMutation.isPending,
      name,
      pickerMode,
      respond,
      showCreateForm,
      t,
    ],
  );

  return (
    <Screen bottomPadding={96} scroll={false}>
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.coralDark} />
        </View>
      ) : (
        <FlashList
          data={circles}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.empty}>{t("noCirclesYet")}</Text>
          }
          ListHeaderComponent={header}
          onRefresh={() => void load()}
          refreshing={isRefreshing}
          renderItem={({ item }) => (
            <CircleCard
              circle={item}
              onArchive={item.status === "Bloomed" ? () => archive(item) : undefined}
              onPress={() =>
                router.push({
                  pathname: "/circle-detail/[circleId]",
                  params: { circleId: item.id },
                })
              }
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
      <BottomSheet
        backdropStyle={styles.sheetBackdrop}
        onClose={() => setShowCreateForm(false)}
        sheetStyle={styles.sheet}
        visible={showCreateForm}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{t("plantCircle")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("cancel")}
            hitSlop={8}
            onPress={() => setShowCreateForm(false)}
            style={styles.sheetClose}
          >
            <MaterialCommunityIcons color={colors.inkSoft} name="close" size={20} />
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
              <TextInput
                accessibilityLabel={t("circleName")}
                autoCapitalize="sentences"
                placeholder={t("circleNamePlaceholder")}
                placeholderTextColor={colors.inkSoft}
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
              <Text style={styles.label}>{t("circleEmoji")}</Text>
              <View style={styles.emojiGrid}>
                {CIRCLE_EMOJIS.map((option) => (
                  <Pressable
                    accessibilityLabel={`${t("circleEmoji")} ${option}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: emoji === option }}
                    key={option}
                    onPress={() => setEmoji(option)}
                    style={[
                      styles.emojiOption,
                      emoji === option ? styles.emojiOptionSelected : null,
                    ]}
                  >
                    <Text style={styles.emojiOptionText}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>{t("bloomAfter")}</Text>
              <View style={styles.bloomPickerRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("bloomDate")}
                  onPress={() => setPickerMode("date")}
                  style={styles.bloomPickerButton}
                >
                  <Text style={styles.bloomPickerLabel}>{t("bloomDate")}</Text>
                  <Text style={styles.bloomPickerValue}>
                    {formatBloomDate(bloomAt)}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("bloomTime")}
                  onPress={() => setPickerMode("time")}
                  style={styles.bloomPickerButton}
                >
                  <Text style={styles.bloomPickerLabel}>{t("bloomTime")}</Text>
                  <Text style={styles.bloomPickerValue}>
                    {formatBloomTime(bloomAt)}
                  </Text>
                </Pressable>
              </View>
              {pickerMode ? (
                <View style={styles.pickerPanel}>
                  <DateTimePicker
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={pickerMode === "date" ? new Date() : undefined}
                    mode={pickerMode}
                    onDismiss={dismissBloomPicker}
                    onValueChange={handleBloomPickerValueChange}
                    timeZoneName={deviceTimeZone}
                    value={bloomAt}
                  />
                  {Platform.OS === "ios" ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={dismissBloomPicker}
                      style={styles.pickerDone}
                    >
                      <Text style={styles.pickerDoneText}>{t("done")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={createMutation.isPending}
                style={styles.primaryButton}
                onPress={() => void create()}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color={colors.card} />
                ) : (
                  <Text style={styles.primaryButtonText}>{t("plantCircle")}</Text>
                )}
              </Pressable>
        </ScrollView>
      </BottomSheet>
      <BottomSheet
        backdropStyle={styles.sheetBackdrop}
        onClose={() => setCircleToArchive(null)}
        sheetStyle={styles.sheet}
        visible={circleToArchive !== null}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.archiveConfirmIcon}>
          <MaterialCommunityIcons color={colors.sageDark} name="archive-outline" size={28} />
        </View>
        <Text style={styles.confirmTitle}>{t("archiveCircleTitle")}</Text>
        <Text style={styles.confirmBody}>{t("archiveCircleBody")}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={archiveMutation.isPending}
          onPress={() => void confirmArchive()}
          style={[styles.primaryButton, archiveMutation.isPending ? styles.saveButtonDisabled : null]}
        >
          {archiveMutation.isPending ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={styles.primaryButtonText}>{t("archiveCircle")}</Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={archiveMutation.isPending}
          onPress={() => setCircleToArchive(null)}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>{t("cancel")}</Text>
        </Pressable>
      </BottomSheet>
    </Screen>
  );
}

function CircleCard({
  circle,
  onPress,
  onArchive,
}: {
  circle: CircleSummary;
  onPress?: () => void;
  onArchive?: () => void;
}) {
  const { t } = useSettings();
  const bloomed = circle.status === "Bloomed";
  return (
    <View style={styles.circleCardContainer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("openCircle")} ${circle.name}`}
        disabled={!onPress}
        onPress={onPress}
        style={styles.circleCard}
      >
        <Text style={styles.circleEmoji}>{circle.emoji}</Text>
        <View style={styles.circleCopy}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{circle.name}</Text>
            <Text style={[styles.status, bloomed && styles.statusBloomed]}>
              {bloomed ? t("bloomedStatus") : t("sealedStatus")}
            </Text>
          </View>
          <Text style={styles.cardBody}>
            {bloomed
              ? t("sharedTimelineReady")
              : `${t("circleBlooms")} ${formatLocalDate(circle.bloomAtUtc)}`}
          </Text>
          <Text style={styles.memberCount}>
            {circle.memberCount}{" "}
            {circle.memberCount === 1 ? t("member") : t("memberPlural")}
          </Text>
        </View>
      </Pressable>
      {onArchive ? (
        <Pressable
          accessibilityLabel={t("archiveCircle")}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onArchive}
          style={styles.archiveButton}
        >
          <MaterialCommunityIcons color={colors.inkSoft} name="close" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}
