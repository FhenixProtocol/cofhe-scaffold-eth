"use client";

import { useState } from "react";
import { ConnectWallet } from "./ConnectWallet";
import { Slot0Display } from "./PoolStateViewComponent";
import { SwapComponent } from "./SwapComponent";
import { TokenFaucet } from "./TokenFaucet";
import { WalkthroughComponent } from "./walkthrough/WalkthroughComponent";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";

type MainTabType = "swap" | "pool" | "faucet" | "walkthrough";

interface MainTab {
  id: MainTabType;
  label: string;
}

const MAIN_TABS: MainTab[] = [
  { id: "swap", label: "Swap" },
  { id: "faucet", label: "Token Faucet" },
  { id: "walkthrough", label: "Walkthrough" },
  { id: "pool", label: "Pool" },
];

const Home: NextPage = () => {
  const [activeTab, setActiveTab] = useState<MainTabType>("swap");
  const { address } = useAccount();

  const renderTabContent = () => {
    // Allow walkthrough even without wallet connection (first step will guide wallet connection)
    if (activeTab === "walkthrough") {
      return (
        <WalkthroughComponent
          onFinish={() => {
            // Show celebration notification
            notification.success(
              <div className="flex flex-col gap-1">
                <p className="font-medium">🎉 Walkthrough Complete!</p>
                <p className="text-sm text-gray-600">
                  You&apos;re now ready to start private FHE trading. Welcome to the future of DeFi!
                </p>
              </div>,
              { duration: 6000 },
            );
            // Switch to swap tab
            setActiveTab("swap");
          }}
        />
      );
    }

    // Show connect wallet message if no wallet is connected for other tabs
    if (!address) {
      return <ConnectWallet />;
    }

    switch (activeTab) {
      case "swap":
        return <SwapComponent />;
      case "pool":
        return <Slot0Display />;
      case "faucet":
        return <TokenFaucet />;
      default:
        return <SwapComponent />;
    }
  };

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-8 border-b border-neutral-200 dark:border-neutral-700">
              {MAIN_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 text-sm font-semibold transition-all relative ${
                    activeTab === tab.id
                      ? "text-purple-600 dark:text-purple-400"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
          {/* Tab Content */}
          <div className={`flex justify-center items-center ${activeTab === "walkthrough" ? "w-full" : ""}`}>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
