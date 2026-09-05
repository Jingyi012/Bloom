import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, { type DateTimePickerChangeEvent } from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { BottomSheet } from "@/components/BottomSheet";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/auth/AuthProvider";
import { bloomApi } from "@/api/client";
import { colors } from "@/styles/tokens";
import type { CircleMember } from "@/types/api";
import { circleDetailStyles as styles } from "@/styles/screens/circle-detail.styles";
import { InlineAlert } from "@/components/InlineAlert";
import { useSettings } from "@/settings/SettingsProvider";
import { formatLocalDate, formatLocalDateTime, formatLocalTime } from "@/utils/date";
import { CIRCLE_EMOJIS } from "@/features/circles/circleEmojis";
import { queryKeys } from "@/query/queryKeys";

export default function CircleDetailScreen() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { t } = useSettings();
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: queryKeys.circle(circleId ?? ""),
    queryFn: () => bloomApi.getCircle(session!.accessToken, circleId!),
    enabled: Boolean(session?.accessToken && circleId),
  });
  const detail = detailQuery.data ?? null;
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showArchivedNotice, setShowArchivedNotice] = useState(true);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editBloomAt, setEditBloomAt] = useState(new Date());
  const [editPickerMode, setEditPickerMode] = useState<"date" | "time" | null>(null);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const updateMutation = useMutation({
    mutationFn: (request: Parameters<typeof bloomApi.updateCircle>[2]) =>
      bloomApi.updateCircle(session!.accessToken, circleId!, request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.circle(circleId!) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.circles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
      ]);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => bloomApi.deleteCircle(session!.accessToken, circleId!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.circles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.archivedCircles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
      ]);
    },
  });
  const inviteMutation = useMutation({
    mutationFn: (inviteeEmail: string) => bloomApi.inviteToCircle(session!.accessToken, circleId!, inviteeEmail),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.circle(circleId!) });
    },
  });
  const removeMemberMutation = useMutation({
    mutationFn: (memberUserId: string) => bloomApi.removeCircleMember(session!.accessToken, circleId!, memberUserId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.circle(circleId!) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.circles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
      ]);
    },
  });
  const leaveMutation = useMutation({
    mutationFn: () => bloomApi.leaveCircle(session!.accessToken, circleId!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.circles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
      ]);
    },
  });
  const unarchiveMutation = useMutation({
    mutationFn: () => bloomApi.unarchiveCircle(session!.accessToken, circleId!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.circle(circleId!) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.circles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.archivedCircles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
      ]);
    },
  });
  const isLoading = detailQuery.isPending;
  const isRefreshing = detailQuery.isFetching && !detailQuery.isPending;
  const isBusy = inviteMutation.isPending || leaveMutation.isPending || removeMemberMutation.isPending || unarchiveMutation.isPending;
  const load = useCallback(async () => {
    await detailQuery.refetch();
  }, [detailQuery]);

  const openEditSheet = useCallback(() => {
    if (!detail || detail.circle.status !== "Sealed" || detail.circle.isArchivedForCurrentUser) return;
    setEditName(detail.circle.name);
    setEditEmoji(CIRCLE_EMOJIS.includes(detail.circle.emoji as (typeof CIRCLE_EMOJIS)[number]) ? detail.circle.emoji : CIRCLE_EMOJIS[0]);
    setEditBloomAt(new Date(detail.circle.bloomAtUtc));
    setEditPickerMode(null);
    setShowEditSheet(true);
  }, [detail]);

  const saveCircle = useCallback(async () => {
    if (!session?.accessToken || !circleId || !detail || !editName.trim()) return;
    if (updateMutation.isPending) return;
    setError(null);
    setNotice(null);
    try {
      await updateMutation.mutateAsync({
        name: editName.trim(),
        emoji: editEmoji.trim(),
        bloomAtUtc: editBloomAt.toISOString(),
        timeZoneId: detail.circle.timeZoneId,
      });
      setShowEditSheet(false);
      setNotice(t("circleSaved"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("circleSaveFailed"));
    }
  }, [circleId, detail, editBloomAt, editEmoji, editName, session?.accessToken, t, updateMutation]);

  const handleEditPickerValueChange = useCallback(
    (_event: DateTimePickerChangeEvent, selected: Date) => {
      setEditBloomAt(selected);
      if (Platform.OS === "android") setEditPickerMode(null);
    },
    [],
  );

  const openDeleteSheet = useCallback(() => {
    if (!detail || !detail.circle.isCreator || detail.circle.status !== "Sealed" || detail.circle.isArchivedForCurrentUser) return;
    setDeleteConfirmation("");
    setShowDeleteSheet(true);
  }, [detail]);

  const confirmDelete = useCallback(async () => {
    if (!session?.accessToken || !circleId || !detail || deleteConfirmation.trim() !== detail.circle.name.trim()) return;
    if (deleteMutation.isPending) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync();
      setShowDeleteSheet(false);
      router.back();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t("circleSaveFailed"));
    }
  }, [circleId, deleteConfirmation, deleteMutation, detail, router, session?.accessToken, t]);

  const progress = useMemo(() => {
    if (!detail) return 0;
    if (detail.circle.status === "Bloomed") return 1;
    const now = Date.now();
    const bloom = new Date(detail.circle.bloomAtUtc).getTime();
    const assumedStart = bloom - 180 * 24 * 60 * 60 * 1000;
    return Math.max(
      0,
      Math.min(0.99, (now - assumedStart) / (bloom - assumedStart)),
    );
  }, [detail]);

  const invite = useCallback(async () => {
    if (!session?.accessToken || !circleId || !email.trim()) return;
    if (inviteMutation.isPending) return;
    setError(null);
    setNotice(null);
    try {
      await inviteMutation.mutateAsync(email.trim());
      setEmail("");
      setNotice(t("invitationSent"));
      await load();
    } catch (inviteError) {
      setError(
        inviteError instanceof Error ? inviteError.message : t("inviteFailed"),
      );
    }
  }, [circleId, email, inviteMutation, load, session?.accessToken, t]);

  const leave = useCallback(() => {
    if (!session?.accessToken || !circleId) return;
    Alert.alert(t("leaveCircleTitle"), t("leaveCircleBody"), [
      { text: t("keepCircle"), style: "cancel" },
      {
        text: t("leaveCircle"),
        style: "destructive",
        onPress: () =>
          void (async () => {
            if (leaveMutation.isPending) return;
            try {
              await leaveMutation.mutateAsync();
              router.back();
            } catch (leaveError) {
              setError(
                leaveError instanceof Error
                  ? leaveError.message
                  : t("leaveFailed"),
              );
            }
          })(),
      },
    ]);
  }, [circleId, leaveMutation, router, session?.accessToken, t]);

  const restoreArchive = useCallback(async () => {
    if (!session?.accessToken || !circleId || !detail?.circle.isArchivedForCurrentUser || unarchiveMutation.isPending) return;
    setError(null);
    setNotice(null);
    try {
      await unarchiveMutation.mutateAsync();
      // Always return to the active circles list after restoring, including
      // when the detail was opened from Profile's archived list.
      router.replace("/circles");
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : t("circleRestoreFailed"));
    }
  }, [circleId, detail?.circle.isArchivedForCurrentUser, router, session?.accessToken, t, unarchiveMutation]);

  const removeMember = useCallback((member: CircleMember) => {
    if (!detail || !detail.circle.isCreator || detail.circle.status !== "Sealed" || member.role === "Creator" || removeMemberMutation.isPending) return;
    Alert.alert(
      t("removeMemberTitle"),
      t("removeMemberBody").replace("{name}", member.displayName),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("removeMember"),
          style: "destructive",
          onPress: () => void removeMemberMutation.mutateAsync(member.userId).catch((removeError) => {
            setError(removeError instanceof Error ? removeError.message : t("removeMemberFailed"));
          }),
        },
      ],
    );
  }, [detail, removeMemberMutation, t]);

  if (isLoading)
    return (
      <Screen scroll={false}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.coralDark} />
        </View>
      </Screen>
    );
  if (!detail)
    return (
      <Screen onRefresh={() => void load()} refreshing={isRefreshing}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("backToCircles")}
            hitSlop={8}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons color={colors.ink} name="arrow-left" size={19} />
          </Pressable>
        </View>
        <InlineAlert
          message={error ?? (detailQuery.error instanceof Error ? detailQuery.error.message : t("circleNotFound"))}
          onDismiss={() => void load()}
        />
      </Screen>
    );

  const { circle, members } = detail;
  return (
    <Screen onRefresh={() => void load()} refreshing={isRefreshing}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("backToCircles")}
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons color={colors.ink} name="arrow-left" size={19} />
        </Pressable>
        <Text numberOfLines={1} style={styles.topBarTitle}>{circle.name}</Text>
        {circle.isCreator && circle.status === "Sealed" && !circle.isArchivedForCurrentUser ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("editCircle")} hitSlop={8} onPress={openEditSheet} style={styles.topBarAction}>
            <MaterialCommunityIcons color={colors.sageDark} name="pencil-outline" size={19} />
          </Pressable>
        ) : <View style={styles.topBarActionPlaceholder} />}
      </View>
      <View style={styles.hero}>
        <Text style={styles.emoji}>{circle.emoji}</Text>
        <Text style={styles.title}>{circle.name}</Text>
        <Text style={styles.status}>
          {circle.status === "Bloomed"
            ? t("bloomedStatus")
            : circle.status === "Archived" || circle.isArchivedForCurrentUser
              ? t("archivedStatus")
              : t("sealedStatus")}
        </Text>
        <Text style={styles.bloomDate}>
          {circle.status === "Bloomed"
            ? t("sharedTimelineReady")
            : circle.status === "Archived" || circle.isArchivedForCurrentUser
              ? t("scheduledBloom")
              : t("circleBlooms")}
        </Text>
        <Text style={styles.bloomDateValue}>{formatLocalDateTime(circle.bloomAtUtc)}</Text>
        <View style={styles.heroMeta}>
          <Text style={styles.heroMetaText}>{members.length} {members.length === 1 ? t("member") : t("memberPlural")}</Text>
          <Text style={styles.heroMetaDot}>·</Text>
          <Text style={styles.heroMetaText}>{t("circleTimezone")}: {circle.timeZoneId}</Text>
        </View>
        {circle.status !== "Archived" && !circle.isArchivedForCurrentUser ? (
          <>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(progress * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {circle.status === "Bloomed"
                ? t("fullyBloomed")
                : `${Math.round(progress * 100)}% ${t("throughSeason")}`}
            </Text>
          </>
        ) : null}
      </View>
      {error ? (
        <InlineAlert message={error} onDismiss={() => setError(null)} />
      ) : null}
      {notice ? (
        <InlineAlert
          message={notice}
          onDismiss={() => setNotice(null)}
          variant="success"
        />
      ) : null}
      {circle.status === "Archived" && showArchivedNotice ? (
        <InlineAlert message={t("archivedReadOnly")} onDismiss={() => setShowArchivedNotice(false)} variant="success" />
      ) : null}
      {circle.isArchivedForCurrentUser && circle.status !== "Archived" && showArchivedNotice ? (
        <InlineAlert message={t("personalArchivedReadOnly")} onDismiss={() => setShowArchivedNotice(false)} variant="success" />
      ) : null}
      <Text style={styles.section}>
        {t("members")} · {members.length}
      </Text>
      {members.map((member) => (
        <View key={member.userId} style={styles.member}>
          <Avatar
            accessibilityLabel={member.displayName}
            containerStyle={styles.avatar}
            imageStyle={styles.avatarImage}
            initial={member.displayName.charAt(0).toUpperCase() || "?"}
            textStyle={styles.avatarText}
            uri={member.avatarUrl}
          />
          <View style={styles.memberCopy}>
            <Text style={styles.memberName}>{member.displayName}</Text>
            <Text style={styles.memberMeta}>
              {member.role === "Creator" ? t("creatorRole") : t("memberRole")} ·{" "}
              {t("joined")} {formatDate(member.joinedAtUtc)}
            </Text>
          </View>
          {circle.isCreator && circle.status === "Sealed" && member.role !== "Creator" && !circle.isArchivedForCurrentUser ? (
            <Pressable
              accessibilityLabel={`${t("removeMember")} ${member.displayName}`}
              accessibilityRole="button"
              disabled={removeMemberMutation.isPending}
              hitSlop={8}
              onPress={() => removeMember(member)}
              style={styles.removeMemberButton}
            >
              <MaterialCommunityIcons color={colors.coralDark} name="account-remove-outline" size={19} />
            </Pressable>
          ) : null}
        </View>
      ))}
      {circle.isCreator && circle.status === "Sealed" && !circle.isArchivedForCurrentUser ? (
        <View style={styles.form}>
          <TextInput
            accessibilityLabel={t("inviteeEmail")}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder={t("friendEmailPlaceholder")}
            placeholderTextColor={colors.inkSoft}
            style={styles.input}
            value={email}
          />
          <Pressable
            accessibilityRole="button"
            disabled={isBusy || !email.trim()}
            onPress={() => void invite()}
            style={styles.inviteButton}
          >
            <Text style={styles.inviteButtonText}>
              {isBusy ? t("sending") : t("inviteFriend")}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {circle.status === "Bloomed" ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/circle/[circleId]",
              params: {
                circleId: circle.id,
                circleName: circle.name,
                circleEmoji: circle.emoji,
              },
            })
          }
          style={styles.action}
        >
          <Text style={styles.actionText}>{t("openSharedTimeline")}</Text>
        </Pressable>
      ) : null}
      {circle.isArchivedForCurrentUser ? (
        <Pressable
          accessibilityRole="button"
          disabled={unarchiveMutation.isPending}
          onPress={() => void restoreArchive()}
          style={[styles.secondaryAction, unarchiveMutation.isPending ? styles.saveButtonDisabled : null]}
        >
          <MaterialCommunityIcons color={colors.sageDark} name="archive-off-outline" size={18} />
          <Text style={styles.secondaryActionText}>{t("restoreCircle")}</Text>
        </Pressable>
      ) : null}
      {circle.canLeave ? (
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={leave}
          style={styles.danger}
        >
          <Text style={styles.dangerText}>{t("leaveCircle")}</Text>
        </Pressable>
      ) : null}
      {circle.isCreator && circle.status === "Sealed" && !circle.isArchivedForCurrentUser ? (
        <Pressable accessibilityRole="button" disabled={isBusy || deleteMutation.isPending} onPress={openDeleteSheet} style={styles.danger}>
          <Text style={styles.dangerText}>{t("deleteCircle")}</Text>
        </Pressable>
      ) : null}
      <BottomSheet
        backdropStyle={styles.sheetBackdrop}
        onClose={() => setShowEditSheet(false)}
        sheetStyle={styles.sheet}
        visible={showEditSheet}
      >
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t("editCircle")}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t("cancel")} onPress={() => setShowEditSheet(false)}>
                <Text style={styles.sheetClose}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.label}>{t("circleName")}</Text>
            <TextInput autoCapitalize="sentences" onChangeText={setEditName} placeholder={t("circleNamePlaceholder")} placeholderTextColor={colors.inkSoft} style={styles.input} value={editName} />
            <Text style={styles.label}>{t("circleEmoji")}</Text>
            <View style={styles.emojiGrid}>
              {CIRCLE_EMOJIS.map((emoji) => (
                <Pressable
                  accessibilityLabel={`${t("circleEmoji")} ${emoji}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: editEmoji === emoji }}
                  key={emoji}
                  onPress={() => setEditEmoji(emoji)}
                  style={[styles.emojiOption, editEmoji === emoji ? styles.emojiOptionSelected : null]}
                >
                  <Text style={styles.emojiOptionText}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>{t("bloomAfter")}</Text>
            <View style={styles.bloomPickerRow}>
              <Pressable accessibilityRole="button" onPress={() => setEditPickerMode("date")} style={styles.bloomPickerButton}>
                <Text style={styles.bloomPickerLabel}>{t("bloomDate")}</Text>
                <Text style={styles.bloomPickerValue}>{formatLocalDate(editBloomAt)}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setEditPickerMode("time")} style={styles.bloomPickerButton}>
                <Text style={styles.bloomPickerLabel}>{t("bloomTime")}</Text>
                <Text style={styles.bloomPickerValue}>{formatLocalTime(editBloomAt)}</Text>
              </Pressable>
            </View>
            {editPickerMode ? (
              <View style={styles.pickerPanel}>
                <DateTimePicker display={Platform.OS === "ios" ? "spinner" : "default"} minimumDate={editPickerMode === "date" ? new Date() : undefined} mode={editPickerMode} onDismiss={() => setEditPickerMode(null)} onValueChange={handleEditPickerValueChange} value={editBloomAt} />
                {Platform.OS === "ios" ? <Pressable accessibilityRole="button" onPress={() => setEditPickerMode(null)} style={styles.pickerDone}><Text style={styles.pickerDoneText}>{t("done")}</Text></Pressable> : null}
              </View>
            ) : null}
            <Pressable accessibilityRole="button" disabled={updateMutation.isPending || !editName.trim()} onPress={() => void saveCircle()} style={[styles.saveButton, updateMutation.isPending ? styles.saveButtonDisabled : null]}>
              {updateMutation.isPending ? <ActivityIndicator color={colors.card} /> : <Text style={styles.saveButtonText}>{t("saveCircle")}</Text>}
            </Pressable>
        </ScrollView>
      </BottomSheet>
      <BottomSheet
        backdropStyle={styles.sheetBackdrop}
        onClose={() => setShowDeleteSheet(false)}
        sheetStyle={styles.sheet}
        visible={showDeleteSheet}
      >
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t("deleteCircleTitle")}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t("cancel")} onPress={() => setShowDeleteSheet(false)}>
                <Text style={styles.sheetClose}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.confirmBody}>{t("deleteCircleBody")}</Text>
            <Text style={styles.label}>{t("deleteCircleConfirmName")}</Text>
            <TextInput autoCapitalize="none" onChangeText={setDeleteConfirmation} placeholder={circle.name} placeholderTextColor={colors.inkSoft} style={styles.input} value={deleteConfirmation} />
            <Pressable accessibilityRole="button" disabled={deleteMutation.isPending || deleteConfirmation.trim() !== circle.name.trim()} onPress={() => void confirmDelete()} style={[styles.deleteButton, deleteMutation.isPending || deleteConfirmation.trim() !== circle.name.trim() ? styles.saveButtonDisabled : null]}>
              {deleteMutation.isPending ? <ActivityIndicator color={colors.card} /> : <Text style={styles.deleteButtonText}>{t("deleteCircle")}</Text>}
            </Pressable>
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}

function formatDate(value: string): string {
  return formatLocalDate(value);
}
