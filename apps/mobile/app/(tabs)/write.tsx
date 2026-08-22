import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { bloomApi, type CircleSummary } from '@/api/client';
import { colors, spacing } from '@/theme/colors';

const MOODS = ['joyful', 'calm', 'heavy', 'restless'] as const;

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
  const { session } = useAuth();
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
      await bloomApi.submitEntry(session.accessToken, {
        clientEntryId: createClientEntryId(),
        authorLocalDate: getLocalDate(),
        authorTimeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        text: text.trim(),
        mood,
        circleIds: selectedCircleIds,
      });
      setText('');
      setMood(undefined);
      setSelectedCircleIds([]);
      setNotice('Sealed. You can read this page again when your circles bloom.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not seal today’s page.');
    } finally {
      setIsSubmitting(false);
    }
  }, [mood, selectedCircleIds, session?.accessToken, text]);

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

const styles = StyleSheet.create({
  eyebrow: { color: colors.coralDark, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700', marginTop: spacing.sm },
  subtitle: { color: colors.inkSoft, fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  error: { backgroundColor: '#FDE7E7', borderRadius: 12, color: colors.coralDark, marginTop: spacing.lg, padding: spacing.md },
  notice: { backgroundColor: colors.sageLight, borderRadius: 12, color: colors.sageDark, marginTop: spacing.lg, padding: spacing.md },
  editor: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 20, borderWidth: 1, color: colors.ink, fontSize: 16, lineHeight: 24, marginTop: spacing.xl, minHeight: 180, padding: spacing.lg },
  counter: { color: colors.inkSoft, fontSize: 11, marginTop: spacing.xs, textAlign: 'right' },
  section: { color: colors.inkSoft, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: spacing.xl, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 18, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipSelected: { backgroundColor: colors.lavenderLight, borderColor: colors.lavender },
  chipText: { color: colors.inkSoft, fontSize: 13, textTransform: 'capitalize' },
  chipTextSelected: { color: colors.ink, fontWeight: '700' },
  empty: { color: colors.inkSoft, fontSize: 14, marginTop: spacing.md },
  circle: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.line, borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginTop: spacing.sm, padding: spacing.md },
  circleSelected: { backgroundColor: colors.sageLight, borderColor: colors.sage },
  circleEmoji: { fontSize: 24, marginRight: spacing.md },
  circleCopy: { flex: 1 },
  circleName: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  circleMeta: { color: colors.inkSoft, fontSize: 12, marginTop: 2 },
  check: { color: colors.sageDark, fontSize: 24, fontWeight: '700' },
  submit: { alignItems: 'center', backgroundColor: colors.coral, borderRadius: 18, justifyContent: 'center', marginTop: spacing.xl, minHeight: 54, padding: spacing.lg },
  submitPressed: { opacity: 0.85 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: colors.card, fontSize: 15, fontWeight: '800' },
});
