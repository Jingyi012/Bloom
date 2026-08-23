import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Screen } from "@/components/Screen";
import { BottomSheet } from "@/components/BottomSheet";
import { useAuth } from "@/auth/AuthProvider";
import { bloomApi } from "@/api/client";
import type { UserStatsResponse } from "@/types/api";
import { colors } from "@/styles/tokens";
import { profileStyles as styles } from "@/styles/screens/profile.styles";
import { useSettings } from "@/settings/SettingsProvider";
import { getDeviceTimeZone } from "@/utils/device";
import { formatLocalTime } from "@/utils/date";
import { InlineAlert } from "@/components/InlineAlert";
import { Avatar } from "@/components/Avatar";

export default function ProfileScreen() {
  const { session, updateUser, user, signOut } = useAuth();
  const {
    language,
    remindersEnabled,
    reminderTime,
    setLanguage,
    setRemindersEnabled,
    setReminderTime,
    reminderStatus,
    t,
  } = useSettings();
  const deviceTimeZone = useMemo(() => getDeviceTimeZone(), []);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const deleteAccountInFlightRef = useRef(false);
  const [sheet, setSheet] = useState<
    "profile" | "language" | "reminder" | null
  >(null);
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  const reminderDate = useMemo(() => {
    const [hourPart = "20", minutePart = "0"] = reminderTime.split(":");
    const hours = Number(hourPart);
    const minutes = Number(minutePart);
    const value = new Date();
    const safeHours = Number.isFinite(hours) ? hours : 20;
    const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
    value.setHours(safeHours, safeMinutes, 0, 0);
    return value;
  }, [reminderTime]);

  const handleReminderPickerValueChange = useCallback(
    (_event: DateTimePickerChangeEvent, selected?: Date) => {
      if (!selected) return;
      const hours = String(selected.getHours()).padStart(2, "0");
      const minutes = String(selected.getMinutes()).padStart(2, "0");
      setReminderTime(`${hours}:${minutes}`);
      if (Platform.OS === "android") setShowReminderPicker(false);
    },
    [setReminderTime],
  );

  useEffect(() => {
    if (sheet !== "reminder") setShowReminderPicker(false);
  }, [sheet]);

  const loadStats = useCallback(
    async (refresh = false) => {
      if (!session?.accessToken) return;
      if (loadInFlightRef.current) return;
      loadInFlightRef.current = true;
      refresh ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);
      try {
        setStats(await bloomApi.stats(session.accessToken));
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : t("statsLoadFailed"),
        );
      } finally {
        loadInFlightRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [session?.accessToken, t],
  );

  useEffect(() => {
    void loadStats();
  }, [loadStats]);
  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
  }, [user?.displayName]);

  const save = useCallback(async () => {
    if (!session?.accessToken) return;
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updatedUser = await bloomApi.updateProfile(
        session.accessToken,
        displayName.trim(),
        getDeviceTimeZone(),
      );
      updateUser(updatedUser);
      setDisplayName(updatedUser.displayName);
      setNotice(t("profileSaved"));
      setSheet(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t("profileSaveFailed"),
      );
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  }, [displayName, session?.accessToken, t, updateUser]);

  const deleteAccount = useCallback(() => {
    if (!session?.accessToken) return;
    Alert.alert(t("deleteAccount"), t("dangerBody"), [
      { text: t("deleteConfirmCancel"), style: "cancel" },
      {
        text: t("deleteAccount"),
        style: "destructive",
        onPress: () =>
          void (async () => {
            if (deleteAccountInFlightRef.current) return;
            deleteAccountInFlightRef.current = true;
            setIsDeletingAccount(true);
            setError(null);
            try {
              await bloomApi.deleteAccount(session.accessToken);
              await signOut();
            } catch (deleteError) {
              setError(deleteError instanceof Error ? deleteError.message : t("requestFailed"));
            } finally {
              deleteAccountInFlightRef.current = false;
              setIsDeletingAccount(false);
            }
          })(),
      },
    ]);
  }, [language, session?.accessToken, signOut, t]);

  return (
    <Screen onRefresh={() => void loadStats(true)} refreshing={isRefreshing}>
      <View style={styles.profileHead}>
        <Avatar
          accessibilityLabel={user?.displayName ?? t("yourProfile")}
          containerStyle={styles.avatar}
          imageStyle={styles.avatarImage}
          initial={(user?.displayName || "?").slice(0, 1).toUpperCase()}
          textStyle={styles.avatarText}
          uri={user?.avatarUrl}
        />
        <Text style={styles.profileName}>
          {user?.displayName || t("yourProfile")}
        </Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
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
      {isLoading ? (
        <ActivityIndicator color={colors.coralDark} />
      ) : (
        <View style={styles.statsRow}>
          <Stat value={stats?.totalEntries ?? 0} label={t("entries")} />
          <Stat value={stats?.activeCircles ?? 0} label={t("circles")} />
          <Stat value={stats?.currentStreak ?? 0} label={t("bestStreak")} />
        </View>
      )}
      <View style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>{t("settings")}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSheet("profile")}
          style={styles.settingRow}
        >
          <View style={styles.settingIcon}>
            <MaterialCommunityIcons
              color={colors.coralDark}
              name="account-edit-outline"
              size={20}
            />
          </View>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>{t("editProfile")}</Text>
            <Text style={styles.hint}>{t("editProfileSubtitle")}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSheet("language")}
          style={styles.settingRow}
        >
          <View style={styles.settingIcon}>
            <MaterialCommunityIcons
              color={colors.sageDark}
              name="translate"
              size={20}
            />
          </View>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>{t("language")}</Text>
            <Text style={styles.hint}>
              {language === "zh" ? t("chinese") : t("english")}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSheet("reminder")}
          style={styles.settingRow}
        >
          <View style={styles.settingIcon}>
            <MaterialCommunityIcons
              color={colors.coralDark}
              name="bell-outline"
              size={20}
            />
          </View>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>{t("reminder")}</Text>
            <Text style={styles.hint}>
              {remindersEnabled
                ? `${t("on")} · ${formatLocalTime(reminderDate)}`
                : t("off")}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => void signOut()}
        disabled={isDeletingAccount}
        style={styles.signOut}
      >
        <Text style={styles.signOutText}>{t("signOut")}</Text>
      </Pressable>
      <View style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>{t("dangerZone")}</Text>
        <Text style={styles.dangerBody}>{t("dangerBody")}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={deleteAccount}
          style={styles.danger}
        >
          <Text style={styles.dangerText}>{t("deleteAccount")}</Text>
        </Pressable>
      </View>
      <BottomSheet
        backdropStyle={styles.sheetBackdrop}
        onClose={() => setSheet(null)}
        sheetStyle={styles.sheet}
        visible={sheet !== null}
      >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {sheet === "profile"
                  ? t("editProfile")
                  : sheet === "language"
                    ? t("language")
                    : t("reminder")}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("cancel")}
                onPress={() => setSheet(null)}
              >
                <Text style={styles.sheetClose}>×</Text>
              </Pressable>
            </View>
            {sheet === "profile" ? (
              <>
                <Text style={styles.label}>{t("displayName")}</Text>
                <TextInput
                  accessibilityLabel={t("displayName")}
                  autoFocus
                  onChangeText={setDisplayName}
                  style={styles.input}
                  value={displayName}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={() => void save()}
                  style={styles.save}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.card} />
                  ) : (
                    <Text style={styles.saveText}>{t("saveProfile")}</Text>
                  )}
                </Pressable>
              </>
            ) : sheet === "language" ? (
              <>
                <Text style={styles.label}>{t("chooseLanguage")}</Text>
                <View style={styles.optionRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: language === "en" }}
                    onPress={() => setLanguage("en")}
                    style={[
                      styles.option,
                      language === "en" ? styles.optionSelected : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        language === "en" ? styles.optionTextSelected : null,
                      ]}
                    >
                      {t("english")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: language === "zh" }}
                    onPress={() => setLanguage("zh")}
                    style={[
                      styles.option,
                      language === "zh" ? styles.optionSelected : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        language === "zh" ? styles.optionTextSelected : null,
                      ]}
                    >
                      {t("chinese")}
                    </Text>
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSheet(null)}
                  style={styles.save}
                >
                  <Text style={styles.saveText}>{t("done")}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.settingRow}>
                  <View style={styles.settingCopy}>
                    <Text style={styles.settingTitle}>{t("reminder")}</Text>
                    <Text style={styles.hint}>{t("reminderHint")}</Text>
                  </View>
                  <Switch
                    accessibilityLabel={t("reminder")}
                    onValueChange={setRemindersEnabled}
                    thumbColor={colors.card}
                    trackColor={{ false: colors.line, true: colors.sage }}
                    value={remindersEnabled}
                  />
                </View>
                <Text style={styles.labelSpaced}>{t("reminderTime")}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("reminderTime")}
                  onPress={() => setShowReminderPicker(true)}
                  style={styles.timePickerButton}
                >
                  <MaterialCommunityIcons
                    color={colors.coralDark}
                    name="clock-outline"
                    size={20}
                  />
                  <Text style={styles.timePickerValue}>
                    {formatLocalTime(reminderDate)}
                  </Text>
                  <MaterialCommunityIcons
                    color={colors.inkSoft}
                    name="chevron-right"
                    size={22}
                  />
                </Pressable>
                {showReminderPicker ? (
                  <View style={styles.reminderPickerPanel}>
                    <DateTimePicker
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      mode="time"
                      onDismiss={() => setShowReminderPicker(false)}
                      onValueChange={handleReminderPickerValueChange}
                      timeZoneName={deviceTimeZone}
                      value={reminderDate}
                    />
                    {Platform.OS === "ios" ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setShowReminderPicker(false)}
                        style={styles.pickerDone}
                      >
                        <Text style={styles.pickerDoneText}>{t("done")}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                {reminderStatus === "permissionDenied" ? (
                  <Text style={styles.error}>
                    {t("reminderPermissionDenied")}
                  </Text>
                ) : reminderStatus === "invalidTime" ? (
                  <Text style={styles.error}>{t("reminderTimeInvalid")}</Text>
                ) : reminderStatus === "error" ? (
                  <Text style={styles.error}>{t("requestFailed")}</Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSheet(null)}
                  style={styles.save}
                >
                  <Text style={styles.saveText}>{t("done")}</Text>
                </Pressable>
              </>
            )}
      </BottomSheet>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
