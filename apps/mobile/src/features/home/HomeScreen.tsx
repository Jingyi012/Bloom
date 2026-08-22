import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/auth/AuthProvider";
import { bloomApi } from "@/api/client";
import type { CircleSummary, UserStatsResponse } from "@/types/api";
import { colors } from "@/styles/tokens";
import { homeStyles as styles } from "@/styles/screens/home.styles";
import { useSettings } from "@/settings/SettingsProvider";
import { InlineAlert } from "@/components/InlineAlert";

export default function HomeScreen() {
  const router = useRouter();
  const { session, user } = useAuth();
  const { t } = useSettings();
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!session?.accessToken) return;
    refresh ? setIsRefreshing(true) : setIsLoading(true);
    setError(null);
    try {
      const [nextCircles, nextStats] = await Promise.all([
        bloomApi.listCircles(session.accessToken),
        bloomApi.stats(session.accessToken),
      ]);
      setCircles(nextCircles);
      setStats(nextStats);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load your garden.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void load(true);
    });
    return () => subscription.remove();
  }, [load]);

  const upcoming = circles
    .filter((circle) => circle.status !== "Bloomed")
    .slice(0, 3);
  const bloomed = circles
    .filter((circle) => circle.status === "Bloomed")
    .slice(0, 3);
  const firstName = user?.displayName.split(" ")[0] || "friend";

  return (
    <Screen onRefresh={() => void load(true)} refreshing={isRefreshing}>
      <Text style={styles.eyebrow}>{greeting(t)}</Text>
      <Text style={styles.title}>
        {t("hi")} {firstName} <Text style={styles.titleDecor}>🌙</Text>
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/write")}
        style={styles.cta}
      >
        <Text style={styles.ctaTitle}>{t("homeWrite")}</Text>
        <Text style={styles.ctaBody}>{t("homeWriteBody")}</Text>
        <Text style={styles.ctaAction}>{t("openEditor")}</Text>
      </Pressable>
      {error ? <InlineAlert message={error} onDismiss={() => setError(null)} /> : null}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.coralDark} />
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            <Stat value={stats?.totalEntries ?? 0} label={t("pagesSealed")} />
            <Stat
              value={stats?.activeCircles ?? 0}
              label={t("activeCircles")}
            />
            <Stat value={stats?.bloomedCircles ?? 0} label={t("bloomed")} />
          </View>
          <Text style={styles.section}>{t("comingUp")}</Text>
          {upcoming.length === 0 ? (
            <EmptyCard
              onPress={() => router.push("/circles")}
              title={t("noSealed")}
              body={t("plantFirst")}
            />
          ) : (
            upcoming.map((circle) => (
              <CircleCard
                key={circle.id}
                circle={circle}
                onPress={() =>
                  router.push({
                    pathname: "/circle-detail/[circleId]",
                    params: { circleId: circle.id },
                  })
                }
              />
            ))
          )}
          {bloomed.length > 0 ? (
            <>
              <Text style={styles.section}>{t("readyToOpen")}</Text>
              {bloomed.map((circle) => (
                <CircleCard
                  key={circle.id}
                  circle={circle}
                  onPress={() =>
                    router.push({
                      pathname: "/circle/[circleId]",
                      params: { circleId: circle.id },
                    })
                  }
                />
              ))}
            </>
          ) : null}
        </>
      )}
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

function CircleCard({
  circle,
  onPress,
}: {
  circle: CircleSummary;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${circle.name}`}
      onPress={onPress}
      style={styles.card}
    >
      <Text style={styles.cardEmoji}>{circle.emoji}</Text>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{circle.name}</Text>
        <Text style={styles.cardBody}>
          {circle.status === "Bloomed"
            ? "Your shared timeline is ready."
            : `Blooms ${formatDate(circle.bloomAtUtc)}`}
        </Text>
        <Text style={styles.cardMeta}>
          {circle.memberCount} {circle.memberCount === 1 ? "member" : "members"}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function EmptyCard({
  title,
  body,
  onPress,
}: {
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <Text style={styles.cardEmoji}>🌱</Text>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardBody}>{body}</Text>
      </View>
    </Pressable>
  );
}

function greeting(
  t: (key: "morning" | "afternoon" | "evening") => string,
): string {
  const hour = new Date().getHours();
  return hour < 12 ? t("morning") : hour < 18 ? t("afternoon") : t("evening");
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
