import { useCallback, useEffect, useMemo, useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/auth/AuthProvider";
import { bloomApi } from "@/api/client";
import type { CircleDetail } from "@/types/api";
import { colors } from "@/styles/tokens";
import { circleDetailStyles as styles } from "@/styles/screens/circle-detail.styles";
import { InlineAlert } from "@/components/InlineAlert";
import { useSettings } from "@/settings/SettingsProvider";
import { formatLocalDate } from "@/utils/date";

export default function CircleDetailScreen() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { t } = useSettings();
  const [detail, setDetail] = useState<CircleDetail | null>(null);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!session?.accessToken || !circleId) return;
      refresh ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);
      try {
        setDetail(await bloomApi.getCircle(session.accessToken, circleId));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("circleLoadDetailFailed"),
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [circleId, session?.accessToken, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const progress = useMemo(() => {
    if (!detail) return 0;
    if (detail.circle.status === "Bloomed") return 1;
    const now = Date.now();
    const bloom = new Date(detail.circle.bloomAtUtc).getTime();
    const assumedStart = bloom - 180 * 24 * 60 * 60 * 1000;
    return Math.max(
      0,
      Math.min(0.99, (now - assumedStart) / (bloom - assumedStart)),
    );
  }, [detail]);

  const invite = useCallback(async () => {
    if (!session?.accessToken || !circleId || !email.trim()) return;
    setIsBusy(true);
    setError(null);
    setNotice(null);
    try {
      await bloomApi.inviteToCircle(
        session.accessToken,
        circleId,
        email.trim(),
      );
      setEmail("");
      setNotice(t("invitationSent"));
      await load();
    } catch (inviteError) {
      setError(
        inviteError instanceof Error ? inviteError.message : t("inviteFailed"),
      );
    } finally {
      setIsBusy(false);
    }
  }, [circleId, email, load, session?.accessToken, t]);

  const leave = useCallback(() => {
    if (!session?.accessToken || !circleId) return;
    Alert.alert(t("leaveCircleTitle"), t("leaveCircleBody"), [
      { text: t("keepCircle"), style: "cancel" },
      {
        text: t("leaveCircle"),
        style: "destructive",
        onPress: () =>
          void (async () => {
            setIsBusy(true);
            try {
              await bloomApi.leaveCircle(session.accessToken, circleId);
              router.back();
            } catch (leaveError) {
              setError(
                leaveError instanceof Error
                  ? leaveError.message
                  : t("leaveFailed"),
              );
            } finally {
              setIsBusy(false);
            }
          })(),
      },
    ]);
  }, [circleId, router, session?.accessToken, t]);

  if (isLoading)
    return (
      <Screen scroll={false}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.coralDark} />
        </View>
      </Screen>
    );
  if (!detail)
    return (
      <Screen onRefresh={() => void load(true)} refreshing={isRefreshing}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("backToCircles")}
            hitSlop={8}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons color={colors.ink} name="arrow-left" size={19} />
          </Pressable>
        </View>
        <InlineAlert
          message={error ?? t("circleNotFound")}
          onDismiss={() => setError(null)}
        />
      </Screen>
    );

  const { circle, members } = detail;
  return (
    <Screen onRefresh={() => void load(true)} refreshing={isRefreshing}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("backToCircles")}
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons color={colors.ink} name="arrow-left" size={19} />
        </Pressable>
      </View>
      <View style={styles.hero}>
        <Text style={styles.emoji}>{circle.emoji}</Text>
        <Text style={styles.title}>{circle.name}</Text>
        <Text style={styles.status}>
          {circle.status === "Bloomed" ? t("bloomedStatus") : t("sealedStatus")}
        </Text>
        <Text style={styles.bloomDate}>
          {circle.status === "Bloomed"
            ? t("sharedTimelineReady")
            : `${t("circleBlooms")} ${formatDate(circle.bloomAtUtc)}`}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {circle.status === "Bloomed"
            ? t("fullyBloomed")
            : `${Math.round(progress * 100)}% ${t("throughSeason")}`}
        </Text>
      </View>
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
      <Text style={styles.section}>
        {t("members")} · {members.length}
      </Text>
      {members.map((member) => (
        <View key={member.userId} style={styles.member}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {member.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.memberCopy}>
            <Text style={styles.memberName}>{member.displayName}</Text>
            <Text style={styles.memberMeta}>
              {member.role === "Creator" ? t("creatorRole") : t("memberRole")} ·{" "}
              {t("joined")} {formatDate(member.joinedAtUtc)}
            </Text>
          </View>
        </View>
      ))}
      {circle.isCreator && circle.status !== "Bloomed" ? (
        <View style={styles.form}>
          <TextInput
            accessibilityLabel={t("inviteeEmail")}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder={t("friendEmailPlaceholder")}
            placeholderTextColor={colors.inkSoft}
            style={styles.input}
            value={email}
          />
          <Pressable
            accessibilityRole="button"
            disabled={isBusy || !email.trim()}
            onPress={() => void invite()}
            style={styles.inviteButton}
          >
            <Text style={styles.inviteButtonText}>
              {isBusy ? t("sending") : t("inviteFriend")}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {circle.status === "Bloomed" ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/circle/[circleId]",
              params: {
                circleId: circle.id,
                circleName: circle.name,
                circleEmoji: circle.emoji,
              },
            })
          }
          style={styles.action}
        >
          <Text style={styles.actionText}>{t("openSharedTimeline")}</Text>
        </Pressable>
      ) : null}
      {circle.canLeave ? (
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={leave}
          style={styles.danger}
        >
          <Text style={styles.dangerText}>{t("leaveCircle")}</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function formatDate(value: string): string {
  return formatLocalDate(value);
}
