import { StyleSheet } from "react-native";
import { typography } from "@/styles/tokens";

export const photoViewerStyles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 18,
    paddingTop: 18,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  counter: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 14,
    color: "#FFFFFF",
    fontFamily: typography.uiSemiBold,
    fontSize: 12,
    overflow: "hidden",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
});
