import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { bloomApi } from '@/api/client';
import type { CircleSummary } from '@/types/api';
import { colors } from '@/styles/tokens';
import { writeStyles as styles } from '@/styles/screens/write.styles';
import { clearWriteDraft, draftKey, readWriteDraft, saveWriteDraft } from '@/features/write/draftStorage';

const MOODS = ['joyful', 'calm', 'heavy', 'restless'] as const;
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

export default function WriteScreen() {
  const { session, user } = useAuth();
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<string | undefined>();
  const [promptKey, setPromptKey] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
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
        setImageUri(draft.imageUri ?? null);
        if (draft.text || draft.imageUri) setNotice('Your unfinished page was restored on this device.');
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
      void saveWriteDraft(currentDraftKey, { clientEntryId, text, mood, promptKey, selectedCircleIds, imageUri: imageUri ?? undefined });
    }, 350);
    return () => clearTimeout(handle);
  }, [currentDraftKey, draftClientEntryId, imageUri, isDraftReady, mood, promptKey, selectedCircleIds, text]);

  const selectedCount = useMemo(() => selectedCircleIds.length, [selectedCircleIds.length]);

  const toggleCircle = useCallback((circleId: string) => {
    setSelectedCircleIds(current => current.includes(circleId)
      ? current.filter(id => id !== circleId)
      : [...current, circleId]);
  }, []);

  const submit = useCallback(async () => {
    if (!session?.accessToken) return;
    if (!text.trim()) {
      setError('Write a few words before sealing today’s page.');
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
        authorTimeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        text: text.trim(),
        mood,
        promptKey,
        circleIds: selectedCircleIds,
      };
      if (imageUri) await bloomApi.submitEntryWithMedia(session.accessToken, submission, imageUri);
      else await bloomApi.submitEntry(session.accessToken, submission);
      setText('');
      setMood(undefined);
      setPromptKey(undefined);
      setSelectedCircleIds([]);
      setImageUri(null);
      setDraftClientEntryId(null);
      if (currentDraftKey) {
        skipNextDraftSave.current = true;
        await clearWriteDraft(currentDraftKey);
      }
      setNotice('Sealed. You can read this page again when your circles bloom.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not seal today’s page.');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentDraftKey, draftClientEntryId, imageUri, localDate, mood, promptKey, selectedCircleIds, session?.accessToken, text]);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled) setImageUri(result.assets[0]?.uri ?? null);
  }, []);

  return (
    <Screen>
      <Text style={styles.eyebrow}>TODAY’S PAGE</Text>
      <Text style={styles.title}>Write honestly.</Text>
      <Text style={styles.subtitle}>This page stays private until the circles you choose bloom.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <TextInput
        accessibilityLabel="Diary entry"
        multiline
        maxLength={5000}
        onChangeText={setText}
        placeholder="What is alive for you today?"
        placeholderTextColor={colors.inkSoft}
        style={styles.editor}
        textAlignVertical="top"
        value={text}
      />
      <Text style={styles.counter}>{text.length}/5000</Text>

      <Pressable accessibilityRole="button" accessibilityLabel="Attach one photo" onPress={() => void pickImage()} style={styles.photoButton}>
        <Text style={styles.photoButtonText}>{imageUri ? 'Replace photo' : 'Attach one photo (optional)'}</Text>
      </Pressable>
      {imageUri ? <Image accessibilityLabel="Selected diary photo" contentFit="cover" source={imageUri} style={styles.photoPreview} /> : null}

      <Text style={styles.section}>Mood (optional)</Text>
      <View style={styles.chipRow}>
        {MOODS.map(option => (
          <Pressable
            accessibilityLabel={`Mood ${option}`}
            accessibilityRole="button"
            accessibilityState={{ selected: mood === option }}
            key={option}
            onPress={() => setMood(current => current === option ? undefined : option)}
            style={[styles.chip, mood === option ? styles.chipSelected : null]}
          >
            <Text style={[styles.chipText, mood === option ? styles.chipTextSelected : null]}>{option}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>A gentle prompt (optional)</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose writing prompt" onPress={() => {
        const currentIndex = PROMPTS.findIndex(prompt => prompt.key === promptKey);
        const nextPrompt = PROMPTS[(currentIndex + 1) % PROMPTS.length] ?? PROMPTS[0]!;
        setPromptKey(nextPrompt.key);
      }} style={styles.prompt}>
        <Text style={styles.promptText}>{PROMPTS.find(prompt => prompt.key === promptKey)?.text ?? 'Tap for a gentle question to begin.'}</Text>
        <Text style={styles.promptAction}>{promptKey ? 'Change prompt' : 'Choose prompt'}</Text>
      </Pressable>

      <Text style={styles.section}>Seal to circles</Text>
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
        {isSubmitting ? <ActivityIndicator color={colors.card} /> : <Text style={styles.submitText}>Seal page{selectedCount > 0 ? ` to ${selectedCount} circle${selectedCount === 1 ? '' : 's'}` : ''}</Text>}
      </Pressable>
    </Screen>
  );
}
