import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { bloomApi } from '@/api/client';
import type { UserStatsResponse } from '@/types/api';
import { colors } from '@/styles/tokens';
import { profileStyles as styles } from '@/styles/screens/profile.styles';
import { useSettings } from '@/settings/SettingsProvider';
import { getDeviceTimeZone } from '@/utils/device';

export default function ProfileScreen() {
  const { session, user, signOut } = useAuth();
  const { language, remindersEnabled, reminderTime, setLanguage, setRemindersEnabled, setReminderTime, t } = useSettings();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!session?.accessToken) return;
    try { setStats(await bloomApi.stats(session.accessToken)); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Could not load your stats.'); }
    finally { setIsLoading(false); }
  }, [session?.accessToken]);

  useEffect(() => { void loadStats(); }, [loadStats]);
  useEffect(() => { setDisplayName(user?.displayName ?? ''); }, [user?.displayName]);

  const save = useCallback(async () => {
    if (!session?.accessToken) return;
    setIsSaving(true); setError(null); setNotice(null);
    try { await bloomApi.updateProfile(session.accessToken, displayName.trim(), getDeviceTimeZone()); setNotice(t('profileSaved')); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Could not save your profile.'); }
    finally { setIsSaving(false); }
  }, [displayName, session?.accessToken, t]);

  const deleteAccount = useCallback(() => {
    if (!session?.accessToken) return;
    Alert.alert(t('deleteAccount'), language === 'zh' ? '你的帐号将被停用，现有登录会话也会失效。' : 'Your account will be deactivated and your active sessions revoked.', [
      { text: language === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
      { text: t('deleteAccount'), style: 'destructive', onPress: () => void (async () => { await bloomApi.deleteAccount(session.accessToken); await signOut(); })() },
    ]);
  }, [language, session?.accessToken, signOut, t]);

  return <Screen>
    <Text style={styles.eyebrow}>{t('yourProfile')}</Text>
    <Text style={styles.title}>{t('quietPlace')}</Text>
    <Text style={styles.body}>{t('profileBody')}</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    <View style={styles.card}>
      <Text style={styles.label}>{t('displayName')}</Text>
      <TextInput accessibilityLabel={t('displayName')} onChangeText={setDisplayName} style={styles.input} value={displayName} />
      <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => void save()} style={styles.save}>{isSaving ? <ActivityIndicator color={colors.card} /> : <Text style={styles.saveText}>{t('saveProfile')}</Text>}</Pressable>
    </View>
    {isLoading ? <ActivityIndicator color={colors.coralDark} /> : <View style={styles.statsRow}>
      <Stat value={stats?.totalEntries ?? 0} label={t('pagesSealed')} />
      <Stat value={stats?.activeCircles ?? 0} label={t('activeCircles')} />
      <Stat value={stats?.bloomedCircles ?? 0} label={t('bloomed')} />
    </View>}
    <View style={styles.settingsCard}>
      <Text style={styles.settingsTitle}>{t('settings')}</Text>
      <Text style={styles.label}>{t('language')}</Text>
      <View style={styles.optionRow}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: language === 'en' }} onPress={() => setLanguage('en')} style={[styles.option, language === 'en' ? styles.optionSelected : null]}><Text style={[styles.optionText, language === 'en' ? styles.optionTextSelected : null]}>{t('english')}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: language === 'zh' }} onPress={() => setLanguage('zh')} style={[styles.option, language === 'zh' ? styles.optionSelected : null]}><Text style={[styles.optionText, language === 'zh' ? styles.optionTextSelected : null]}>{t('chinese')}</Text></Pressable>
      </View>
      <View style={styles.settingRow}><View style={styles.settingCopy}><Text style={styles.settingTitle}>{t('reminder')}</Text><Text style={styles.hint}>{t('reminderHint')}</Text></View><Switch accessibilityLabel={t('reminder')} onValueChange={setRemindersEnabled} thumbColor={colors.card} trackColor={{ false: colors.line, true: colors.sage }} value={remindersEnabled} /></View>
      <Text style={styles.labelSpaced}>{t('reminderTime')}</Text>
      <TextInput accessibilityLabel={t('reminderTime')} autoCapitalize="none" keyboardType="numbers-and-punctuation" maxLength={5} onChangeText={setReminderTime} placeholder="20:00" style={styles.input} value={reminderTime} />
    </View>
    <Pressable accessibilityRole="button" onPress={deleteAccount} style={styles.danger}><Text style={styles.dangerText}>{t('deleteAccount')}</Text></Pressable>
  </Screen>;
}

function Stat({ value, label }: { value: number; label: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
