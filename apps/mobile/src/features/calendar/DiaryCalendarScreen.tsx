import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { bloomApi } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { InlineAlert } from "@/components/InlineAlert";
import { Screen } from "@/components/Screen";
import { queryKeys } from "@/query/queryKeys";
import { useSettings } from "@/settings/SettingsProvider";
import { diaryCalendarStyles as styles } from "@/styles/screens/calendar.styles";
import { colors } from "@/styles/tokens";
import {
  formatLocalDate,
  formatLocalMonthYear,
  getLocalWeekdayLabels,
  parseLocalDateValue,
  toLocalDateValue,
} from "@/utils/date";

type CalendarCell = { key: string; date: Date | null; value: string | null };

export default function DiaryCalendarScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { language, t } = useSettings();
  const todayValue = toLocalDateValue(new Date());
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  });
  const [selectedValue, setSelectedValue] = useState(todayValue);
  const from = toLocalDateValue(new Date(month.getFullYear(), month.getMonth(), 1, 12));
  const to = toLocalDateValue(new Date(month.getFullYear(), month.getMonth() + 1, 0, 12));
  const calendarQuery = useQuery({
    queryKey: queryKeys.diaryCalendar(from, to),
    queryFn: () => bloomApi.getDiaryCalendar(session!.accessToken, from, to),
    enabled: Boolean(session?.accessToken),
  });
  const writtenDays = useMemo(
    () => new Map((calendarQuery.data?.days ?? []).map((day) => [day.date, day.circleCount])),
    [calendarQuery.data?.days],
  );
  const cells = useMemo<CalendarCell[]>(() => {
    const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1, 12).getDay();
    const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstWeekday + 1;
      if (day < 1 || day > dayCount) return { key: `blank-${index}`, date: null, value: null };
      const date = new Date(month.getFullYear(), month.getMonth(), day, 12);
      return { key: toLocalDateValue(date), date, value: toLocalDateValue(date) };
    });
  }, [month]);
  const selectedCount = writtenDays.get(selectedValue);
  const isSelectedFuture = selectedValue > todayValue;

  const moveMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1, 12);
    setMonth(next);
    setSelectedValue(toLocalDateValue(next));
  };
  const showToday = () => {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1, 12));
    setSelectedValue(todayValue);
  };

  return (
    <Screen bottomPadding={32} onRefresh={() => void calendarQuery.refetch()} refreshing={calendarQuery.isRefetching}>
      <View style={styles.topBar}>
        <Pressable accessibilityLabel={t("backToProfile")} accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons color={colors.ink} name="arrow-left" size={19} />
        </Pressable>
        <Text style={styles.topBarTitle}>{t("calendarTitle")}</Text>
        <Pressable accessibilityRole="button" onPress={showToday} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>{t("today")}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>{t("calendarSubtitle")}</Text>
      {calendarQuery.error ? (
        <InlineAlert message={calendarQuery.error instanceof Error ? calendarQuery.error.message : t("calendarLoadFailed")} onDismiss={() => void calendarQuery.refetch()} />
      ) : null}
      <View style={styles.calendarCard}>
        <View style={styles.monthRow}>
          <Pressable accessibilityLabel={t("previousMonth")} accessibilityRole="button" onPress={() => moveMonth(-1)} style={styles.monthButton}>
            <MaterialCommunityIcons color={colors.ink} name="chevron-left" size={24} />
          </Pressable>
          <Text style={styles.monthTitle}>{formatLocalMonthYear(month, language)}</Text>
          <Pressable accessibilityLabel={t("nextMonth")} accessibilityRole="button" onPress={() => moveMonth(1)} style={styles.monthButton}>
            <MaterialCommunityIcons color={colors.ink} name="chevron-right" size={24} />
          </Pressable>
        </View>
        <View style={styles.weekRow}>
          {getLocalWeekdayLabels(language).map((label, index) => <Text key={`${label}-${index}`} style={styles.weekLabel}>{label}</Text>)}
        </View>
        {calendarQuery.isPending ? (
          <View style={styles.loading}><ActivityIndicator color={colors.coralDark} /></View>
        ) : (
          <View style={styles.grid}>
            {cells.map((cell) => {
              if (!cell.date || !cell.value) return <View key={cell.key} style={styles.dayCell} />;
              const hasDiary = writtenDays.has(cell.value);
              const selected = selectedValue === cell.value;
              const isToday = todayValue === cell.value;
              return (
                <Pressable
                  accessibilityLabel={`${formatLocalDate(cell.value)}${hasDiary ? `, ${t("diaryWritten")}` : ""}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={cell.key}
                  onPress={() => setSelectedValue(cell.value!)}
                  style={[styles.dayCell, selected ? styles.dayCellSelected : null]}
                >
                  <Text style={[styles.dayNumber, isToday ? styles.dayNumberToday : null, selected ? styles.dayNumberSelected : null]}>{cell.date.getDate()}</Text>
                  {hasDiary ? <View style={[styles.dayDot, selected ? styles.dayDotSelected : null]} /> : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
      <View style={styles.selectionCard}>
        <View style={[styles.selectionIcon, selectedCount !== undefined ? styles.selectionIconWritten : null]}>
          <MaterialCommunityIcons color={selectedCount !== undefined ? colors.sageDark : colors.inkSoft} name={selectedCount !== undefined ? "book-check-outline" : "book-outline"} size={22} />
        </View>
        <View style={styles.selectionCopy}>
          <Text style={styles.selectionDate}>{formatLocalDate(parseLocalDateValue(selectedValue))}</Text>
          <Text style={styles.selectionBody}>
            {isSelectedFuture
              ? t("futureDiaryDay")
              : selectedCount !== undefined
                ? t("sealedToCircleCount").replace("{count}", String(selectedCount))
                : t("noDiaryOnDay")}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
