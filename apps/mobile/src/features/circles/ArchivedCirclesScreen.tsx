import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { bloomApi } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { InlineAlert } from "@/components/InlineAlert";
import { Screen } from "@/components/Screen";
import { queryKeys } from "@/query/queryKeys";
import { useSettings } from "@/settings/SettingsProvider";
import { archivedCirclesStyles as styles } from "@/styles/screens/archived-circles.styles";
import { colors } from "@/styles/tokens";
import { formatLocalDateTime } from "@/utils/date";

export default function ArchivedCirclesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { t } = useSettings();
  const archivedQuery = useQuery({
    queryKey: queryKeys.archivedCircles,
    queryFn: () => bloomApi.listArchivedCircles(session!.accessToken),
    enabled: Boolean(session?.accessToken),
  });
  const circles = archivedQuery.data ?? [];

  return (
    <Screen bottomPadding={24} scroll={false}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel={t("backToProfile")}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons color={colors.ink} name="arrow-left" size={19} />
        </Pressable>
        <Text style={styles.topBarTitle}>{t("archivedCircles")}</Text>
        <View style={styles.topBarSpacer} />
      </View>
      <Text style={styles.subtitle}>{t("archivedCirclesSubtitle")}</Text>
      {archivedQuery.error ? (
        <InlineAlert
          message={archivedQuery.error instanceof Error ? archivedQuery.error.message : t("circleLoadFailed")}
          onDismiss={() => void archivedQuery.refetch()}
        />
      ) : null}
      {archivedQuery.isPending ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.coralDark} />
        </View>
      ) : (
        <FlashList
          contentContainerStyle={styles.listContent}
          data={circles}
          keyExtractor={(circle) => circle.id}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons color={colors.sageDark} name="archive-outline" size={30} />
              <Text style={styles.emptyTitle}>{t("noArchivedCircles")}</Text>
              <Text style={styles.emptyBody}>{t("noArchivedCirclesBody")}</Text>
            </View>
          }
          onRefresh={() => void archivedQuery.refetch()}
          refreshing={archivedQuery.isRefetching}
          renderItem={({ item }) => (
            <Pressable
              accessibilityLabel={`${t("openArchivedCircle")} ${item.name}`}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/circle-detail/[circleId]", params: { circleId: item.id } })}
              style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
              <View style={styles.cardCopy}>
                <View style={styles.cardTitleRow}>
                  <Text numberOfLines={1} style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.badge}>{t("archivedStatus")}</Text>
                </View>
                <Text style={styles.cardMeta}>
                  {t("scheduledBloom")}: {formatLocalDateTime(item.bloomAtUtc)}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.memberCount} {item.memberCount === 1 ? t("member") : t("memberPlural")}
                </Text>
              </View>
              <MaterialCommunityIcons color={colors.inkSoft} name="chevron-right" size={22} />
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}
