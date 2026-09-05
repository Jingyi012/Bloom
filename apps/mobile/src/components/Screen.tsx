import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from "react-native";
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
      style={[
        screenStyles.content,
        !scroll ? screenStyles.contentFixed : null,
        { paddingBottom: bottomPadding + insets.bottom },
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={screenStyles.safeArea}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        style={screenStyles.keyboardRoot}
      >
        {scroll ? (
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh ? <RefreshControl onRefresh={onRefresh} refreshing={refreshing} /> : undefined}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
