import { useEffect, type PropsWithChildren } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import { focusManager, QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/query/queryClient";

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== "web") focusManager.setFocused(status === "active");
}

export function QueryProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
