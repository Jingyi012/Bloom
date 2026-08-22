import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  defaultSettings,
  readLocalSettings,
  writeLocalSettings,
  type Language,
  type LocalSettings,
} from "@/settings/settingsStorage";

const translations = {
  en: {
    home: "Home",
    write: "Write",
    circles: "Circles",
    profile: "Profile",
    hi: "Hi",
    yourProfile: "YOUR PROFILE",
    quietPlace: "A quiet place for you.",
    profileBody:
      "Your Google account is the only way into Bloom. We never show sealed writing here.",
    displayName: "Display name",
    timezone: "Device time zone",
    timezoneHint: "Follows your phone automatically",
    saveProfile: "Save profile",
    profileSaved: "Profile saved.",
    settings: "Settings",
    editProfile: "Edit profile",
    editProfileSubtitle: "Update your display name",
    language: "Language",
    chooseLanguage: "Choose your language",
    english: "English",
    chinese: "中文",
    reminder: "Daily reminder",
    reminderTime: "Reminder time",
    reminderHint: "Saved on this device for local reminders.",
    on: "On",
    off: "Off",
    done: "Done",
    cancel: "Cancel",
    entries: "Entries",
    bestStreak: "Best streak",
    pagesSealed: "Diaries sealed",
    activeCircles: "Active Circles",
    bloomed: "Bloomed",
    signOut: "Sign out",
    dangerZone: "Danger zone",
    dangerBody: "Deleting your account deactivates it and revokes your active sessions.",
    deleteAccount: "Delete account",
    todaysDiary: "TODAY'S DIARY",
    writeHonestly: "Write honestly.",
    diaryPrivate:
      "This diary entry stays private until the circles you choose bloom.",
    diaryPlaceholder: "What is alive for you today?",
    mood: "Mood (optional)",
    prompt: "A gentle prompt (optional)",
    sealTo: "Seal to circles",
    sealDiary: "Seal diary",
    attachPhoto: "Attach one photo (optional)",
    replacePhoto: "Replace photo",
    homeWrite: "Write today's diary",
    homeWriteBody: "Your next entry will stay sealed until bloom day.",
    openEditor: "Open the editor →",
    comingUp: "Coming up",
    readyToOpen: "Ready to open",
    noSealed: "No sealed circles yet",
    plantFirst: "Plant your first circle to begin.",
    yourGarden: "YOUR GARDEN",
    yourCircles: "Your circles",
    circlesSubtitle: "Small groups, sealed seasons, shared memories.",
    plantCircle: "Plant a circle",
    bloomAfter: "Bloom after",
    activeCirclesTitle: "Active circles",
    invitations: "Invitations",
    joinQuestion: "Join this sealed circle?",
    join: "Join",
    decline: "Decline",
    morning: "GOOD MORNING",
    afternoon: "GOOD AFTERNOON",
    evening: "GOOD EVENING",
    joyful: "Joyful",
    calm: "Calm",
    heavy: "Heavy",
    restless: "Restless",
  },
  zh: {
    home: "首页",
    write: "记录",
    circles: "圈子",
    profile: "我的",
    hi: "你好",
    yourProfile: "我的资料",
    quietPlace: "给自己留一处安静的地方。",
    profileBody:
      "Bloom 使用 Google 帐号登录，已封存的日记只有在开放日才能看见。",
    displayName: "显示名称",
    timezone: "设备时区",
    timezoneHint: "跟随手机自动更新",
    saveProfile: "保存资料",
    profileSaved: "资料已保存。",
    settings: "设置",
    editProfile: "编辑资料",
    editProfileSubtitle: "更新你的显示名称",
    language: "语言",
    chooseLanguage: "选择语言",
    english: "English",
    chinese: "中文",
    reminder: "每日提醒",
    reminderTime: "提醒时间",
    reminderHint: "保存在此设备，用于本地提醒。",
    on: "开启",
    off: "关闭",
    done: "完成",
    cancel: "取消",
    entries: "日记",
    bestStreak: "最佳连续记录",
    pagesSealed: "已封存日记",
    activeCircles: "进行中的圈子",
    bloomed: "已开放",
    signOut: "退出登录",
    dangerZone: "危险区域",
    dangerBody: "删除帐号会停用帐号并撤销所有登录会话。",
    deleteAccount: "删除帐号",
    todaysDiary: "今天的日记",
    writeHonestly: "诚实地写下来。",
    diaryPrivate: "这篇日记会一直保密，直到你选择的圈子开放。",
    diaryPlaceholder: "今天有什么想记录的？",
    mood: "心情（可选）",
    prompt: "温柔提示（可选）",
    sealTo: "封存到圈子",
    sealDiary: "封存日记",
    attachPhoto: "添加一张照片（可选）",
    replacePhoto: "更换照片",
    homeWrite: "记录今天的日记",
    homeWriteBody: "下一篇日记会在开放日之前保持封存。",
    openEditor: "打开编辑器 →",
    comingUp: "即将开放",
    readyToOpen: "可以开放",
    noSealed: "还没有封存的圈子",
    plantFirst: "创建你的第一个圈子吧。",
    yourGarden: "我的花园",
    yourCircles: "我的圈子",
    circlesSubtitle: "小小的群组，封存的季节，共享的回忆。",
    plantCircle: "创建圈子",
    bloomAfter: "开放时间",
    activeCirclesTitle: "进行中的圈子",
    invitations: "邀请",
    joinQuestion: "加入这个封存圈子？",
    join: "加入",
    decline: "拒绝",
    morning: "早上好",
    afternoon: "下午好",
    evening: "晚上好",
    joyful: "喜悦",
    calm: "平静",
    heavy: "沉重",
    restless: "不安",
  },
} as const;

type TranslationKey = keyof typeof translations.en;
type SettingsContextValue = LocalSettings & {
  isReady: boolean;
  setLanguage: (language: Language) => void;
  setRemindersEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
  t: (key: TranslationKey) => string;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<LocalSettings>(defaultSettings);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    void readLocalSettings().then((stored) => {
      setSettings(stored);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (isReady) void writeLocalSettings(settings);
  }, [isReady, settings]);
  const update = useCallback(
    (change: Partial<LocalSettings>) =>
      setSettings((current) => ({ ...current, ...change })),
    [],
  );
  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      isReady,
      setLanguage: (language) => update({ language }),
      setRemindersEnabled: (remindersEnabled) => update({ remindersEnabled }),
      setReminderTime: (reminderTime) => update({ reminderTime }),
      t: (key) => translations[settings.language][key],
    }),
    [isReady, settings, update],
  );
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context)
    throw new Error("useSettings must be used inside SettingsProvider");
  return context;
}
