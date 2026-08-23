import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { Text, View, type ImageStyle, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

type AvatarProps = {
  uri?: string | null;
  initial?: string;
  containerStyle: StyleProp<ViewStyle>;
  imageStyle: StyleProp<ImageStyle>;
  textStyle: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

export function Avatar({
  uri,
  initial = "?",
  containerStyle,
  imageStyle,
  textStyle,
  accessibilityLabel,
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [uri]);
  const showImage = Boolean(uri) && !imageFailed;

  return (
    <View accessibilityLabel={accessibilityLabel} style={containerStyle}>
      {showImage ? (
        <Image
          accessibilityLabel={accessibilityLabel}
          contentFit="cover"
          onError={() => setImageFailed(true)}
          source={{ uri: uri! }}
          style={imageStyle}
        />
      ) : (
        <Text style={textStyle}>{initial}</Text>
      )}
    </View>
  );
}
