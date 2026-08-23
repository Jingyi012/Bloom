import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type BottomSheetProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  sheetStyle?: StyleProp<ViewStyle>;
  backdropStyle?: StyleProp<ViewStyle>;
}>;

/** A native modal with a fading backdrop and a vertically sliding sheet. */
export function BottomSheet({
  visible,
  onClose,
  sheetStyle,
  backdropStyle,
  children,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(1)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.stopAnimation();
      backdropOpacity.stopAnimation();
      Animated.parallel([
        Animated.timing(translateY, {
          duration: 240,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          duration: 180,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!mounted) return;
    Animated.parallel([
      Animated.timing(translateY, {
        duration: 190,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        duration: 150,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [backdropOpacity, mounted, translateY, visible]);

  if (!mounted) return null;

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={mounted}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.backdropLayer, backdropStyle, { opacity: backdropOpacity }]}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        style={styles.keyboardRoot}
      >
        <Pressable onPress={onClose} style={styles.backdropPressable}>
          <Animated.View
            onStartShouldSetResponder={() => true}
            onTouchEnd={(event) => event.stopPropagation()}
            style={[
              sheetStyle,
              {
                transform: [
                  {
                    translateY: translateY.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 700],
                    }),
                  },
                ],
              },
            ]}
          >
            {children}
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropLayer: StyleSheet.absoluteFillObject,
  keyboardRoot: { flex: 1 },
  backdropPressable: { flex: 1, justifyContent: "flex-end" },
});
