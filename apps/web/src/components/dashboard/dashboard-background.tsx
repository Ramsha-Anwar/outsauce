"use client";

import { useTheme } from "next-themes";
import { EtherealDust } from "@/components/EtherealDust";
import { useSyncExternalStore } from "react";

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function DashboardBackground() {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) return null;

  return <EtherealDust isLightMode={resolvedTheme === "light"} />;
}