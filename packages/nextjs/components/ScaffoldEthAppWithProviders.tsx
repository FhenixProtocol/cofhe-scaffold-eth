"use client";

import { useEffect, useState } from "react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { useConnectCofheClient } from "~~/app/useCofhe";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { CofhePermitModal } from "~~/components/cofhe/CofhePermitModal";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { useInitializeNativeCurrencyPrice } from "~~/hooks/scaffold-eth";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  useInitializeNativeCurrencyPrice();

  /**
   * CoFHE connection hook
   *
   * The CoFHE SDK client is initialized in two steps.
   * The client is constructed synchronously, with `supportedChains` provided at construction time.
   * The useConnectCofheClient hook then makes sure the CoFHE SDK client is connected to the current wallet and is ready to function.
   * It performs the following key functions:
   * - Connects the CoFHE SDK client to the current provider and signer
   * - Configures the wallet client for encrypted operations
   * - Handles connection errors with user notifications
   *
   * This hook is essential for enabling FHE (Fully Homomorphic Encryption) operations
   * throughout the application. It automatically refreshes when the connected wallet
   * or chain changes to maintain proper configuration.
   */
  useConnectCofheClient();

  return (
    <>
      <div className={`flex flex-col min-h-screen `}>
        <Header />
        <main className="relative flex flex-col flex-1">{children}</main>
        <Footer />
      </div>
      <Toaster />
      <CofhePermitModal />
    </>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const ScaffoldEthAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ProgressBar height="3px" color="#2299dd" />
        <RainbowKitProvider
          avatar={BlockieAvatar}
          theme={mounted ? (isDarkMode ? darkTheme() : lightTheme()) : lightTheme()}
        >
          <ScaffoldEthApp>{children}</ScaffoldEthApp>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
