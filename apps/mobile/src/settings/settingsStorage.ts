import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'zh';

export type LocalSettings = {
  language: Language;
  remindersEnabled: boolean;
  reminderTime: string;
  customMoods: string[];
};

const STORAGE_KEY = 'bloom.settings.v1';
export const defaultSettings: LocalSettings = {
  language: 'en',
  remindersEnabled: true,
  reminderTime: '20:00',
  customMoods: [],
};

export async function readLocalSettings(): Promise<LocalSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<LocalSettings>;
    return {
      language: parsed.language === 'zh' ? 'zh' : 'en',
      remindersEnabled: parsed.remindersEnabled ?? defaultSettings.remindersEnabled,
      reminderTime: typeof parsed.reminderTime === 'string' ? parsed.reminderTime : defaultSettings.reminderTime,
      customMoods: Array.isArray(parsed.customMoods)
        ? [...new Set(parsed.customMoods.filter((mood): mood is string => typeof mood === 'string').map((mood) => mood.trim()).filter(Boolean))].slice(0, 20)
        : defaultSettings.customMoods,
    };
  } catch {
    return defaultSettings;
  }
}

export async function writeLocalSettings(settings: LocalSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
