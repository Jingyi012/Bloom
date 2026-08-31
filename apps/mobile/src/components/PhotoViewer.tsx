import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo, useMemo } from "react";
import { Pressable, Text, View, type ImageURISource } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "@/settings/SettingsProvider";
import { photoViewerStyles as styles } from "@/styles/photo-viewer.styles";

type PhotoViewerProps = {
  sources: ImageURISource[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
};

/** Full-screen swipe, pinch and double-tap photo viewer shared by diary screens. */
export const PhotoViewer = memo(function PhotoViewer({
  sources,
  initialIndex,
  visible,
  onClose,
}: PhotoViewerProps) {
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const safeIndex = Math.min(Math.max(initialIndex, 0), Math.max(sources.length - 1, 0));
  const Header = useMemo(
    () => function ViewerHeader({ imageIndex }: { imageIndex: number }) {
      return (
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 18) }]}>
          <Text style={styles.counter}>{imageIndex + 1} / {sources.length}</Text>
          <Pressable
            accessibilityLabel={t("closePhotoViewer")}
            accessibilityRole="button"
            hitSlop={10}
            onPress={onClose}
            style={styles.closeButton}
          >
            <MaterialCommunityIcons color="#FFFFFF" name="close" size={24} />
          </Pressable>
        </View>
      );
    },
    [insets.top, onClose, sources.length, t],
  );

  if (sources.length === 0) return null;
  return (
    <ImageViewing
      animationType="fade"
      backgroundColor="#120F12"
      doubleTapToZoomEnabled
      HeaderComponent={Header}
      imageIndex={safeIndex}
      images={sources}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      swipeToCloseEnabled
      visible={visible}
    />
  );
});
