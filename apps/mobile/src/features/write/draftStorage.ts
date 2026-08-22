import AsyncStorage from '@react-native-async-storage/async-storage';

export type WriteDraft = {
  clientEntryId: string;
  text: string;
  mood?: string;
  promptKey?: string;
  selectedCircleIds: string[];
  imageUris?: string[];
  /** Legacy single-photo draft shape, migrated on read. */
  imageUri?: string;
};

export function draftKey(userId: string, localDate: string): string {
  return `bloom:write-draft:${userId}:${localDate}`;
}

export async function readWriteDraft(key: string): Promise<WriteDraft | null> {
  const value = await AsyncStorage.getItem(key);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<WriteDraft>;
    if (typeof parsed.clientEntryId !== 'string' || typeof parsed.text !== 'string' || !Array.isArray(parsed.selectedCircleIds)) return null;
    return {
      clientEntryId: parsed.clientEntryId,
      text: parsed.text,
      mood: typeof parsed.mood === 'string' ? parsed.mood : undefined,
      promptKey: typeof parsed.promptKey === 'string' ? parsed.promptKey : undefined,
      selectedCircleIds: parsed.selectedCircleIds.filter((id): id is string => typeof id === 'string'),
      imageUris: Array.isArray(parsed.imageUris)
        ? parsed.imageUris.filter((uri): uri is string => typeof uri === 'string').slice(0, 10)
        : typeof parsed.imageUri === 'string' ? [parsed.imageUri] : undefined,
    };
  } catch {
    return null;
  }
}

export function saveWriteDraft(key: string, draft: WriteDraft): Promise<void> {
  return AsyncStorage.setItem(key, JSON.stringify(draft));
}

export function clearWriteDraft(key: string): Promise<void> {
  return AsyncStorage.removeItem(key);
}
