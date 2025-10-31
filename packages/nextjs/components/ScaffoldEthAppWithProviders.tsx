"use client";

import { useEffect, useState } from "react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { useInitializeCofhe } from "~~/app/useCofhe";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { CofhePermitModal } from "~~/components/cofhe/CofhejsPermitModal";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { useInitializeNativeCurrencyPrice } from "~~/hooks/scaffold-eth";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  useInitializeNativeCurrencyPrice();

  /**
   * CoFHE Initialization
   *
   * The useInitializeCofhe hook initializes the CoFHE system with the connected wallet and chain configuration.
   * It performs the following key functions:
   * - Sets up the FHE environment based on the current network (MAINNET, TESTNET, or MOCK)
   * - Initializes the FHE keys, provider, and signer
   * - Configures the wallet client for encrypted operations
   * - Handles initialization errors with user notifications
   *
   * This hook is essential for enabling FHE (Fully Homomorphic Encryption) operations
   * throughout the application. It automatically refreshes when the connected wallet
   * or chain changes to maintain proper configuration.
   */
  useInitializeCofhe();

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
