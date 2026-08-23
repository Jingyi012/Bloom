import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Image } from "expo-image";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/auth/AuthProvider";
import { bloomApi } from "@/api/client";
import type { CircleSummary, TodayEntryStatus } from "@/types/api";
import { colors } from "@/styles/tokens";
import { writeStyles as styles } from "@/styles/screens/write.styles";
import {
  clearWriteDraft,
  draftKey,
  readWriteDraft,
  saveWriteDraft,
} from "@/features/write/draftStorage";
import { useSettings } from "@/settings/SettingsProvider";
import { InlineAlert } from "@/components/InlineAlert";
import { getDeviceTimeZone } from "@/utils/device";
import { formatLocalDateTime } from "@/utils/date";

const MOODS = [
  { key: "heavy", emoji: "😢" },
  { key: "restless", emoji: "😐" },
  { key: "calm", emoji: "🙂" },
  { key: "joyful", emoji: "😄" },
  { key: "radiant", emoji: "🤩" },
] as const;
const PROMPTS = [
  { key: "small_joy", translationKey: "promptSmallJoy" },
  { key: "learned", translationKey: "promptLearned" },
  { key: "future", translationKey: "promptFuture" },
] as const;

type EditorSnapshot = {
  text: string;
  mood?: string;
  promptKey?: string;
  selectedCircleIds: string[];
  imageUris: string[];
  imageMediaIds: Array<string | null>;
  draftClientEntryId: string | null;
};

function createClientEntryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getLocalDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Expo can return a fresh temporary URI every time the same library asset is
 * picked. Prefer the stable asset id, then file metadata, and only fall back
 * to the URI when the picker does not expose either identity.
 */
function getPhotoIdentity(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.assetId) return `asset:${asset.assetId}`;
  if (asset.fileName && asset.fileSize != null)
    return `file:${asset.fileName}:${asset.fileSize}`;
  return `uri:${asset.uri}`;
}

async function normalizeSelectedImage(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const maxDimension = Math.max(asset.width, asset.height);
  const context = ImageManipulator.manipulate(asset.uri);
  if (maxDimension > 2048) {
    if (asset.width >= asset.height) context.resize({ width: 2048 });
    else context.resize({ height: 2048 });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  return saved.uri;
}

export default function WriteScreen() {
  const router = useRouter();
  const { session, user } = useAuth();
  const { t } = useSettings();
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [mood, setMood] = useState<string | undefined>();
  const [promptKey, setPromptKey] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTodayStatusLoading, setIsTodayStatusLoading] = useState(true);
  const [todayStatus, setTodayStatus] = useState<TodayEntryStatus | null>(null);
  const [isEditingToday, setIsEditingToday] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [imageMediaIds, setImageMediaIds] = useState<Array<string | null>>([]);
  const photoIdentityByUri = useRef(new Map<string, string>());
  const editingSnapshot = useRef<EditorSnapshot | null>(null);
  const loadCirclesInFlightRef = useRef(false);
  const loadTodayInFlightRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const [draftClientEntryId, setDraftClientEntryId] = useState<string | null>(
    null,
  );
  const [isDraftReady, setIsDraftReady] = useState(false);
  const skipNextDraftSave = useRef(false);
  const [localDate, setLocalDate] = useState(getLocalDate);
  const currentDraftKey = user ? draftKey(user.id, localDate) : null;

  const loadCircles = useCallback(async () => {
    if (!session?.accessToken) return;
    if (loadCirclesInFlightRef.current) return;
    loadCirclesInFlightRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const result = await bloomApi.listCircles(session.accessToken);
      setCircles(result);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("circleLoadFailed"),
      );
    } finally {
      loadCirclesInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [session?.accessToken, t]);

  const loadTodayStatus = useCallback(async () => {
    if (!session?.accessToken) return;
    if (loadTodayInFlightRef.current) return;
    loadTodayInFlightRef.current = true;
    setIsTodayStatusLoading(true);
    try {
      setTodayStatus(await bloomApi.getTodayEntry(session.accessToken));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("todayStatusLoadFailed"),
      );
    } finally {
      loadTodayInFlightRef.current = false;
      setIsTodayStatusLoading(false);
    }
  }, [session?.accessToken, t]);

  const refresh = useCallback(async () => {
    if (!session?.accessToken || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([loadCircles(), loadTodayStatus()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadCircles, loadTodayStatus, session?.accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadCircles();
      void loadTodayStatus();
    }, [loadCircles, loadTodayStatus]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const nextLocalDate = getLocalDate();
      if (nextLocalDate !== localDate) {
        setLocalDate(nextLocalDate);
        setTodayStatus(null);
      }
      void loadTodayStatus();
      void loadCircles();
    });
    return () => subscription.remove();
  }, [loadCircles, loadTodayStatus, localDate]);

  useEffect(() => {
    let cancelled = false;
    setIsDraftReady(false);
    if (!currentDraftKey) return;
    void readWriteDraft(currentDraftKey).then((draft) => {
      if (cancelled) return;
      if (draft) {
        setDraftClientEntryId(draft.clientEntryId);
        setText(draft.text);
        setMood(draft.mood);
        setPromptKey(draft.promptKey);
        setSelectedCircleIds(draft.selectedCircleIds);
        const restoredImageUris = draft.imageUris ?? [];
        photoIdentityByUri.current = new Map(
          restoredImageUris.map((uri) => [uri, `uri:${uri}`]),
        );
        setImageUris(restoredImageUris);
        if (draft.text || draft.imageUris?.length) setNotice(t("restoreDraft"));
      }
      setIsDraftReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [currentDraftKey, t]);

  useEffect(() => {
    if (!isDraftReady || !currentDraftKey) return;
    if (skipNextDraftSave.current) {
      skipNextDraftSave.current = false;
      return;
    }
    const clientEntryId = draftClientEntryId ?? createClientEntryId();
    if (!draftClientEntryId) setDraftClientEntryId(clientEntryId);
    const handle = setTimeout(() => {
      void saveWriteDraft(currentDraftKey, {
        clientEntryId,
        text,
        mood,
        promptKey,
        selectedCircleIds,
        imageUris: imageUris.length > 0 ? imageUris : undefined,
      });
    }, 350);
    return () => clearTimeout(handle);
  }, [
    currentDraftKey,
    draftClientEntryId,
    imageUris,
    isDraftReady,
    mood,
    promptKey,
    selectedCircleIds,
    text,
    t,
  ]);

  const editableCircles = useMemo(
    () => isEditingToday
      ? circles.filter((circle) => circle.status === "Sealed" || selectedCircleIds.includes(circle.id))
      : circles.filter((circle) => circle.status === "Sealed"),
    [circles, isEditingToday, selectedCircleIds],
  );
  const selectedAvailableCircleIds = useMemo(
    () => isEditingToday
      ? selectedCircleIds
      : selectedCircleIds.filter((id) => editableCircles.some((circle) => circle.id === id)),
    [editableCircles, isEditingToday, selectedCircleIds],
  );
  const selectedCount = selectedAvailableCircleIds.length;
  const allCirclesSelected =
    editableCircles.length > 0 &&
    editableCircles.every((circle) => selectedCircleIds.includes(circle.id));
  const canSubmit =
    Boolean(session?.accessToken) &&
    !isSubmitting &&
    !isTodayStatusLoading &&
    Boolean(text.trim()) &&
    selectedAvailableCircleIds.length > 0 &&
    (isEditingToday || !todayStatus?.hasEntry);

  const toggleCircle = useCallback((circleId: string) => {
    setSelectedCircleIds((current) =>
      current.includes(circleId)
        ? current.filter((id) => id !== circleId)
        : [...current, circleId],
    );
  }, []);

  const toggleAllCircles = useCallback(() => {
    setSelectedCircleIds((current) =>
      editableCircles.length > 0 &&
      editableCircles.every((circle) => current.includes(circle.id))
        ? []
        : editableCircles.map((circle) => circle.id),
    );
  }, [editableCircles]);

  const clearEditor = useCallback(async () => {
    setText("");
    setMood(undefined);
    setPromptKey(undefined);
    setSelectedCircleIds([]);
    photoIdentityByUri.current.clear();
    setImageUris([]);
    setImageMediaIds([]);
    setDraftClientEntryId(null);
    if (currentDraftKey) {
      skipNextDraftSave.current = true;
      await clearWriteDraft(currentDraftKey);
    }
  }, [currentDraftKey]);

  const beginEditingToday = useCallback(() => {
    if (!todayStatus?.hasEntry || !todayStatus.canModify) return;
    editingSnapshot.current = {
      text,
      mood,
      promptKey,
      selectedCircleIds: selectedCircleIds.slice(),
      imageUris: imageUris.slice(),
      imageMediaIds: imageMediaIds.slice(),
      draftClientEntryId,
    };
    setText(todayStatus.text ?? "");
    setMood(todayStatus.mood ?? undefined);
    setPromptKey(todayStatus.promptKey ?? undefined);
    setSelectedCircleIds(todayStatus.circleIds);
    const existingMediaIds = todayStatus.mediaIds ?? [];
    setImageMediaIds(existingMediaIds);
    setImageUris(existingMediaIds.map((id) => bloomApi.mediaUrl(id)));
    photoIdentityByUri.current = new Map(
      existingMediaIds.map((id) => [bloomApi.mediaUrl(id), `media:${id}`]),
    );
    setIsEditingToday(true);
    setError(null);
    setNotice(null);
  }, [draftClientEntryId, imageMediaIds, imageUris, mood, promptKey, selectedCircleIds, text, todayStatus]);

  const cancelEditingToday = useCallback(() => {
    const snapshot = editingSnapshot.current;
    if (snapshot) {
      setText(snapshot.text);
      setMood(snapshot.mood);
      setPromptKey(snapshot.promptKey);
      setSelectedCircleIds(snapshot.selectedCircleIds);
      setImageUris(snapshot.imageUris);
      setImageMediaIds(snapshot.imageMediaIds);
      setDraftClientEntryId(snapshot.draftClientEntryId);
      photoIdentityByUri.current = new Map(
        snapshot.imageUris.map((uri, index) => [uri, snapshot.imageMediaIds[index] ? `media:${snapshot.imageMediaIds[index]}` : `uri:${uri}`]),
      );
    }
    editingSnapshot.current = null;
    setIsEditingToday(false);
    setError(null);
    setNotice(null);
  }, []);

  const deleteToday = useCallback(() => {
    if (
      !session?.accessToken ||
      !todayStatus?.hasEntry ||
      !todayStatus.canModify
    )
      return;
    Alert.alert(t("deleteTodayTitle"), t("deleteTodayBody"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("deleteToday"),
        style: "destructive",
        onPress: () =>
          void (async () => {
            try {
              setIsSubmitting(true);
              await bloomApi.deleteTodayEntry(session.accessToken);
              editingSnapshot.current = null;
              setIsEditingToday(false);
              await clearEditor();
              await loadTodayStatus();
              setNotice(t("todayDeleted"));
            } catch (deleteError) {
              setError(
                deleteError instanceof Error
                  ? deleteError.message
                  : t("todayStatusLoadFailed"),
              );
            } finally {
              setIsSubmitting(false);
            }
          })(),
      },
    ]);
  }, [clearEditor, loadTodayStatus, session?.accessToken, t, todayStatus]);

  const submit = useCallback(async () => {
    if (!session?.accessToken) return;
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    if (isTodayStatusLoading || (todayStatus?.hasEntry && !isEditingToday))
      return;
    if (!text.trim()) {
      setError(t("writeBeforeSealing"));
      return;
    }
    if (selectedAvailableCircleIds.length === 0) {
      setError(t("chooseSealedCircle"));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (isEditingToday) {
        await bloomApi.updateTodayEntryWithMedia(session.accessToken, {
          text: text.trim(),
          mood,
          promptKey,
          circleIds: selectedAvailableCircleIds,
          retainedMediaIds: imageMediaIds.filter((id): id is string => Boolean(id)),
        }, imageUris.filter((_, index) => !imageMediaIds[index]));
        editingSnapshot.current = null;
        setIsEditingToday(false);
        await clearEditor();
        await loadTodayStatus();
        setNotice(t("todayUpdated"));
      } else {
        const submission = {
          clientEntryId: draftClientEntryId ?? createClientEntryId(),
          authorLocalDate: localDate,
          authorTimeZoneId: getDeviceTimeZone(),
          text: text.trim(),
          mood,
          promptKey,
          circleIds: selectedAvailableCircleIds,
        };
        if (imageUris.length > 0)
          await bloomApi.submitEntryWithMedia(
            session.accessToken,
            submission,
            imageUris,
          );
        else await bloomApi.submitEntry(session.accessToken, submission);
        await clearEditor();
        await loadTodayStatus();
        setNotice(t("diarySealed"));
      }
    } catch (submitError) {
      if (
        submitError instanceof Error &&
        submitError.message.includes("(409)")
      ) {
        await loadTodayStatus();
        setIsEditingToday(false);
        setNotice(t("todayAlreadySealed"));
      } else {
        setError(
          submitError instanceof Error
            ? submitError.message
            : t("diarySealFailed"),
        );
      }
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    currentDraftKey,
    clearEditor,
    draftClientEntryId,
    imageUris,
    imageMediaIds,
    localDate,
    mood,
    promptKey,
    selectedAvailableCircleIds,
    session?.accessToken,
    text,
    isTodayStatusLoading,
    isEditingToday,
    loadTodayStatus,
    todayStatus?.hasEntry,
    t,
  ]);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t("allowPhotoAccess"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      // Keep photos visually clear while reducing upload size on supported platforms.
      quality: 0.8,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (!result.canceled) {
      try {
        const normalizedAssets = await Promise.all(
          result.assets.map(async (asset) => ({
            asset,
            uri: await normalizeSelectedImage(asset),
          })),
        );
        const acceptedUris: string[] = [];
        setImageUris((current) => {
          const next = [...current];
          const selectedIdentities = new Set(photoIdentityByUri.current.values());
          for (const { asset, uri } of normalizedAssets) {
            const identity = getPhotoIdentity(asset);
            if (selectedIdentities.has(identity) || next.length >= 10) continue;
            next.push(uri);
            acceptedUris.push(uri);
            photoIdentityByUri.current.set(uri, identity);
            selectedIdentities.add(identity);
          }
          return next;
        });
        if (acceptedUris.length > 0) {
          setImageMediaIds((current) => [...current, ...acceptedUris.map(() => null)]);
        }
      } catch {
        setError(t("photoProcessingFailed"));
      }
    }
  }, [t]);

  const removeImage = useCallback((uri: string) => {
    photoIdentityByUri.current.delete(uri);
    setImageUris((current) => current.filter((item) => item !== uri));
    setImageMediaIds((current) => {
      const index = imageUris.indexOf(uri);
      return index < 0 ? current : current.filter((_, itemIndex) => itemIndex !== index);
    });
  }, [imageUris]);

  return (
    <Screen onRefresh={() => void refresh()} refreshing={isRefreshing}>
      <Text style={styles.eyebrow}>{t("todaysDiary")}</Text>
      <Text style={styles.title}>{t("writeHonestly")}</Text>
      <Text style={styles.subtitle}>{t("diaryPrivate")}</Text>

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

      {isTodayStatusLoading ? (
        <View style={styles.statusLoading}>
          <ActivityIndicator color={colors.coralDark} />
        </View>
      ) : todayStatus?.hasEntry && !isEditingToday ? (
        <View style={styles.sealedCard}>
          <View style={styles.sealedIcon}>
            <MaterialCommunityIcons
              color={colors.sageDark}
              name="lock-check-outline"
              size={28}
            />
          </View>
          <Text style={styles.sealedTitle}>{t("todaySealedTitle")}</Text>
          <Text style={styles.sealedBody}>
            {todayStatus.canModify
              ? t("todayEditableBody")
              : t("todayLockedBody")}
          </Text>
          {todayStatus.submittedAtUtc ? (
            <Text style={styles.sealedMeta}>
              {formatSubmittedAt(todayStatus.submittedAtUtc)}
            </Text>
          ) : null}
          <Text style={styles.sealedMeta}>
            {todayStatus.circleIds.length} {t("circles")}
          </Text>
          {todayStatus.canModify ? (
            <>
              {todayStatus.modificationEndsAtUtc ? (
                <Text style={styles.sealedMeta}>
                  {t("todayEditUntil")}{" "}
                  {formatSubmittedAt(todayStatus.modificationEndsAtUtc)}
                </Text>
              ) : null}
              <View style={styles.sealedActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("editToday")}
                  onPress={beginEditingToday}
                  style={[styles.sealedAction, styles.sealedActionSecondary]}
                >
                  <Text style={styles.sealedActionText}>{t("editToday")}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("deleteToday")}
                  onPress={deleteToday}
                  style={[styles.sealedAction, styles.sealedActionDanger]}
                >
                  <Text
                    style={[
                      styles.sealedActionText,
                      styles.sealedActionDangerText,
                    ]}
                  >
                    {t("deleteToday")}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      ) : (
        <>
          {isEditingToday ? (
            <View style={styles.editorModeHeader}>
              <Text style={styles.editorModeTitle}>{t("editToday")}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("cancel")}
                onPress={cancelEditingToday}
                style={styles.cancelEdit}
              >
                <MaterialCommunityIcons
                  color={colors.inkSoft}
                  name="arrow-left"
                  size={17}
                />
                <Text style={styles.cancelEditText}>{t("cancel")}</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={styles.section}>{t("mood")}</Text>
          <View style={styles.moodRow}>
            {MOODS.map((option) => (
              <Pressable
                accessibilityLabel={`${t("moodAccessibility")} ${t(option.key)}`}
                accessibilityRole="button"
                accessibilityState={{ selected: mood === option.key }}
                key={option.key}
                onPress={() =>
                  setMood((current) =>
                    current === option.key ? undefined : option.key,
                  )
                }
                style={[
                  styles.moodTile,
                  mood === option.key ? styles.moodTileSelected : null,
                ]}
              >
                <Text style={styles.moodEmoji}>{option.emoji}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            accessibilityLabel={t("diaryEntry")}
            multiline
            maxLength={5000}
            onChangeText={setText}
            placeholder={t("diaryPlaceholder")}
            placeholderTextColor={colors.inkSoft}
            style={styles.editor}
            textAlignVertical="top"
            value={text}
          />
          <Text style={styles.counter}>{text.length}/5000</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("attachPhotoAccessibility")}
            onPress={() => void pickImage()}
            style={styles.photoButton}
          >
            <Text style={styles.photoButtonText}>
              {imageUris.length > 0
                ? `Add more photos (${imageUris.length}/10)`
                : t("attachPhoto")}
            </Text>
          </Pressable>
          {imageUris.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoGallery}
            >
              {imageUris.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.photoTile}>
                  <Image
                    accessibilityLabel={`${t("selectedDiaryPhoto")} ${index + 1}`}
                    contentFit="cover"
                    source={imageMediaIds[index]
                      ? { uri, headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : undefined }
                      : uri}
                    style={styles.photoPreview}
                  />
                  <Pressable
                    accessibilityLabel={`${t("removePhoto")} ${index + 1}`}
                    onPress={() => removeImage(uri)}
                    style={styles.removePhoto}
                  >
                    <Text style={styles.removePhotoText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <Text style={styles.section}>{t("prompt")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("choosePrompt")}
            onPress={() => {
              const currentIndex = PROMPTS.findIndex(
                (prompt) => prompt.key === promptKey,
              );
              const nextPrompt =
                PROMPTS[(currentIndex + 1) % PROMPTS.length] ?? PROMPTS[0]!;
              setPromptKey(nextPrompt.key);
            }}
            style={styles.prompt}
          >
            <Text style={styles.promptText}>
              {(() => {
                const prompt = PROMPTS.find((item) => item.key === promptKey);
                return prompt ? t(prompt.translationKey) : t("promptHint");
              })()}
            </Text>
            <Text style={styles.promptAction}>
              {promptKey ? t("changePrompt") : t("choosePromptAction")}
            </Text>
          </Pressable>

          <View style={styles.sectionRow}>
            <Text style={[styles.section, styles.sectionInRow]}>
              {t("sealTo")}
            </Text>
            {editableCircles.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  allCirclesSelected ? t("clearAll") : t("selectAll")
                }
                onPress={toggleAllCircles}
              >
                <Text style={styles.selectAll}>
                  {allCirclesSelected ? t("clearAll") : t("selectAll")}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {isLoading ? <ActivityIndicator color={colors.coralDark} /> : null}
          {!isLoading && editableCircles.length === 0 ? (
            <View style={styles.emptyCircleCard}>
              <View style={styles.emptyCircleIcon}>
                <MaterialCommunityIcons
                  color={colors.sageDark}
                  name="sprout-outline"
                  size={26}
                />
              </View>
              <Text style={styles.emptyCircleTitle}>{t("noSealedCirclesTitle")}</Text>
              <Text style={styles.emptyCircleBody}>{t("createSealedCircle")}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("createCircleAction")}
                onPress={() => router.push("/circles")}
                style={styles.emptyCircleButton}
              >
                <Text style={styles.emptyCircleButtonText}>{t("createCircleAction")}</Text>
              </Pressable>
            </View>
          ) : null}
          {editableCircles.map((circle) => {
            const selected = selectedCircleIds.includes(circle.id);
            return (
              <Pressable
                accessibilityLabel={`${t("selectCircle")} ${circle.name}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                key={circle.id}
                onPress={() => toggleCircle(circle.id)}
                style={[styles.circle, selected ? styles.circleSelected : null]}
              >
                <Text style={styles.circleEmoji}>{circle.emoji}</Text>
                <View style={styles.circleCopy}>
                  <Text style={styles.circleName}>{circle.name}</Text>
                  <Text style={styles.circleMeta}>
                    {circle.memberCount}{" "}
                    {circle.memberCount === 1 ? t("member") : t("memberPlural")}
                  </Text>
                </View>
                <Text style={styles.check}>{selected ? "✓" : "○"}</Text>
              </Pressable>
            );
          })}

          <Pressable
            accessibilityLabel={
              isEditingToday ? t("saveChanges") : t("sealDiaryEntry")
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.submit,
              pressed ? styles.submitPressed : null,
              !canSubmit ? styles.submitDisabled : null,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={styles.submitText}>
                {isEditingToday ? t("saveChanges") : t("sealDiary")}
                {selectedCount > 0 ? ` · ${selectedCount}` : ""}
              </Text>
            )}
          </Pressable>
        </>
      )}
    </Screen>
  );
}

function formatSubmittedAt(value: string): string {
  return formatLocalDateTime(value);
}
