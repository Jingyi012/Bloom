import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { bloomApi } from '@/api/client';
import type { CircleSummary } from '@/types/api';
import { colors } from '@/styles/tokens';
import { writeStyles as styles } from '@/styles/screens/write.styles';
import { clearWriteDraft, draftKey, readWriteDraft, saveWriteDraft } from '@/features/write/draftStorage';
import { useSettings } from '@/settings/SettingsProvider';
import { InlineAlert } from '@/components/InlineAlert';
import { getDeviceTimeZone } from '@/utils/device';

const MOODS = [
  { key: 'heavy', emoji: '😢' },
  { key: 'restless', emoji: '😐' },
  { key: 'calm', emoji: '🙂' },
  { key: 'joyful', emoji: '😄' },
  { key: 'radiant', emoji: '🤩' },
] as const;
const PROMPTS = [
  { key: 'small_joy', text: 'What small thing made today feel lighter?' },
  { key: 'learned', text: 'What did today teach you about yourself?' },
  { key: 'future', text: 'What do you hope your future self remembers?' },
] as const;

function createClientEntryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getLocalDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Expo can return a fresh temporary URI every time the same library asset is
 * picked. Prefer the stable asset id, then file metadata, and only fall back
 * to the URI when the picker does not expose either identity.
 */
function getPhotoIdentity(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.assetId) return `asset:${asset.assetId}`;
  if (asset.fileName && asset.fileSize != null) return `file:${asset.fileName}:${asset.fileSize}`;
  return `uri:${asset.uri}`;
}

export default function WriteScreen() {
  const { session, user } = useAuth();
  const { t } = useSettings();
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<string | undefined>();
  const [promptKey, setPromptKey] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const photoIdentityByUri = useRef(new Map<string, string>());
  const [draftClientEntryId, setDraftClientEntryId] = useState<string | null>(null);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const skipNextDraftSave = useRef(false);
  const localDate = useMemo(() => getLocalDate(), []);
  const currentDraftKey = user ? draftKey(user.id, localDate) : null;

  const loadCircles = useCallback(async () => {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await bloomApi.listCircles(session.accessToken);
      setCircles(result.filter(circle => circle.status === 'Sealed'));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load your sealed circles.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => { void loadCircles(); }, [loadCircles]);

  useEffect(() => {
    let cancelled = false;
    setIsDraftReady(false);
    if (!currentDraftKey) return;
    void readWriteDraft(currentDraftKey).then(draft => {
      if (cancelled) return;
      if (draft) {
        setDraftClientEntryId(draft.clientEntryId);
        setText(draft.text);
        setMood(draft.mood);
        setPromptKey(draft.promptKey);
        setSelectedCircleIds(draft.selectedCircleIds);
        const restoredImageUris = draft.imageUris ?? [];
        photoIdentityByUri.current = new Map(restoredImageUris.map(uri => [uri, `uri:${uri}`]));
        setImageUris(restoredImageUris);
      if (draft.text || draft.imageUris?.length) setNotice('Your unfinished diary was restored on this device.');
      }
      setIsDraftReady(true);
    });
    return () => { cancelled = true; };
  }, [currentDraftKey]);

  useEffect(() => {
    if (!isDraftReady || !currentDraftKey) return;
    if (skipNextDraftSave.current) {
      skipNextDraftSave.current = false;
      return;
    }
    const clientEntryId = draftClientEntryId ?? createClientEntryId();
    if (!draftClientEntryId) setDraftClientEntryId(clientEntryId);
    const handle = setTimeout(() => {
      void saveWriteDraft(currentDraftKey, { clientEntryId, text, mood, promptKey, selectedCircleIds, imageUris: imageUris.length > 0 ? imageUris : undefined });
    }, 350);
    return () => clearTimeout(handle);
  }, [currentDraftKey, draftClientEntryId, imageUris, isDraftReady, mood, promptKey, selectedCircleIds, text]);

  const selectedCount = useMemo(() => selectedCircleIds.length, [selectedCircleIds.length]);

  const toggleCircle = useCallback((circleId: string) => {
    setSelectedCircleIds(current => current.includes(circleId)
      ? current.filter(id => id !== circleId)
      : [...current, circleId]);
  }, []);

  const submit = useCallback(async () => {
    if (!session?.accessToken) return;
    if (!text.trim()) {
      setError('Write a few words before sealing today’s diary.');
      return;
    }
    if (selectedCircleIds.length === 0) {
      setError('Choose at least one sealed circle.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const submission = {
        clientEntryId: draftClientEntryId ?? createClientEntryId(),
        authorLocalDate: localDate,
        authorTimeZoneId: getDeviceTimeZone(),
        text: text.trim(),
        mood,
        promptKey,
        circleIds: selectedCircleIds,
      };
      if (imageUris.length > 0) await bloomApi.submitEntryWithMedia(session.accessToken, submission, imageUris);
      else await bloomApi.submitEntry(session.accessToken, submission);
      setText('');
      setMood(undefined);
      setPromptKey(undefined);
      setSelectedCircleIds([]);
      photoIdentityByUri.current.clear();
      setImageUris([]);
      setDraftClientEntryId(null);
      if (currentDraftKey) {
        skipNextDraftSave.current = true;
        await clearWriteDraft(currentDraftKey);
      }
      setNotice('Sealed. You can read this diary entry again when your circles bloom.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not seal today’s diary.');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentDraftKey, draftClientEntryId, imageUris, localDate, mood, promptKey, selectedCircleIds, session?.accessToken, text]);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false, allowsMultipleSelection: true, selectionLimit: 10 });
    if (!result.canceled) {
      setImageUris(current => {
        const next = [...current];
        const selectedIdentities = new Set(photoIdentityByUri.current.values());
        for (const asset of result.assets) {
          const identity = getPhotoIdentity(asset);
          if (selectedIdentities.has(identity) || next.length >= 10) continue;
          next.push(asset.uri);
          photoIdentityByUri.current.set(asset.uri, identity);
          selectedIdentities.add(identity);
        }
        return next;
      });
    }
  }, []);

  const removeImage = useCallback((uri: string) => {
    photoIdentityByUri.current.delete(uri);
    setImageUris(current => current.filter(item => item !== uri));
  }, []);

  return (
    <Screen>
      <Text style={styles.eyebrow}>{t('todaysDiary')}</Text>
      <Text style={styles.title}>{t('writeHonestly')}</Text>
      <Text style={styles.subtitle}>{t('diaryPrivate')}</Text>

      {error ? <InlineAlert message={error} onDismiss={() => setError(null)} /> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Text style={styles.section}>{t('mood')}</Text>
      <View style={styles.moodRow}>
        {MOODS.map(option => (
          <Pressable
            accessibilityLabel={`Mood ${option.emoji}`}
            accessibilityRole="button"
            accessibilityState={{ selected: mood === option.key }}
            key={option.key}
            onPress={() => setMood(current => current === option.key ? undefined : option.key)}
            style={[styles.moodTile, mood === option.key ? styles.moodTileSelected : null]}
          >
            <Text style={styles.moodEmoji}>{option.emoji}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        accessibilityLabel="Diary entry"
        multiline
        maxLength={5000}
        onChangeText={setText}
        placeholder={t('diaryPlaceholder')}
        placeholderTextColor={colors.inkSoft}
        style={styles.editor}
        textAlignVertical="top"
        value={text}
      />
      <Text style={styles.counter}>{text.length}/5000</Text>

      <Pressable accessibilityRole="button" accessibilityLabel="Attach one photo" onPress={() => void pickImage()} style={styles.photoButton}>
        <Text style={styles.photoButtonText}>{imageUris.length > 0 ? `Add more photos (${imageUris.length}/10)` : t('attachPhoto')}</Text>
      </Pressable>
      {imageUris.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoGallery}>
        {imageUris.map((uri, index) => <View key={`${uri}-${index}`} style={styles.photoTile}>
          <Image accessibilityLabel={`Selected diary photo ${index + 1}`} contentFit="cover" source={uri} style={styles.photoPreview} />
          <Pressable accessibilityLabel={`Remove photo ${index + 1}`} onPress={() => removeImage(uri)} style={styles.removePhoto}><Text style={styles.removePhotoText}>×</Text></Pressable>
        </View>)}
      </ScrollView> : null}

      <Text style={styles.section}>{t('prompt')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose writing prompt" onPress={() => {
        const currentIndex = PROMPTS.findIndex(prompt => prompt.key === promptKey);
        const nextPrompt = PROMPTS[(currentIndex + 1) % PROMPTS.length] ?? PROMPTS[0]!;
        setPromptKey(nextPrompt.key);
      }} style={styles.prompt}>
        <Text style={styles.promptText}>{PROMPTS.find(prompt => prompt.key === promptKey)?.text ?? 'Tap for a gentle question to begin.'}</Text>
        <Text style={styles.promptAction}>{promptKey ? 'Change prompt' : 'Choose prompt'}</Text>
      </Pressable>

      <Text style={styles.section}>{t('sealTo')}</Text>
      {isLoading ? <ActivityIndicator color={colors.coralDark} /> : null}
      {!isLoading && circles.length === 0 ? <Text style={styles.empty}>Create a sealed circle before writing.</Text> : null}
      {circles.map(circle => {
        const selected = selectedCircleIds.includes(circle.id);
        return (
          <Pressable
            accessibilityLabel={`Select ${circle.name}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            key={circle.id}
            onPress={() => toggleCircle(circle.id)}
            style={[styles.circle, selected ? styles.circleSelected : null]}
          >
            <Text style={styles.circleEmoji}>{circle.emoji}</Text>
            <View style={styles.circleCopy}>
              <Text style={styles.circleName}>{circle.name}</Text>
              <Text style={styles.circleMeta}>{circle.memberCount} member{circle.memberCount === 1 ? '' : 's'}</Text>
            </View>
            <Text style={styles.check}>{selected ? '✓' : '○'}</Text>
          </Pressable>
        );
      })}

      <Pressable
        accessibilityLabel="Seal diary entry"
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={() => void submit()}
        style={({ pressed }) => [styles.submit, pressed ? styles.submitPressed : null, isSubmitting ? styles.submitDisabled : null]}
      >
        {isSubmitting ? <ActivityIndicator color={colors.card} /> : <Text style={styles.submitText}>{t('sealDiary')}{selectedCount > 0 ? ` · ${selectedCount}` : ''}</Text>}
      </Pressable>
    </Screen>
  );
}
