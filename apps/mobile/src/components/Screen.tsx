import type { PropsWithChildren } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { screenStyles } from "@/styles/components.styles";

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  bottomPadding = 126,
}: PropsWithChildren<{ scroll?: boolean; refreshing?: boolean; onRefresh?: () => void; bottomPadding?: number }>) {
  const insets = useSafeAreaInsets();
  const content = (
    <View
      style={[screenStyles.content, { paddingBottom: bottomPadding + insets.bottom }]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={screenStyles.safeArea}
      edges={["top", "left", "right"]}
    >
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={onRefresh ? <RefreshControl onRefresh={onRefresh} refreshing={refreshing} /> : undefined}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
