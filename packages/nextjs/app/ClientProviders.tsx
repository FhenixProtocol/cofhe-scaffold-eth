"use client";

import type React from "react";
import dynamic from "next/dynamic";
import { ThemeProvider } from "~~/components/ThemeProvider";

const ScaffoldEthAppWithProviders = dynamic(
  () => import("~~/components/ScaffoldEthAppWithProviders").then(m => m.ScaffoldEthAppWithProviders),
  {
    ssr: false,
  },
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider enableSystem>
      <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
    </ThemeProvider>
  );
}
