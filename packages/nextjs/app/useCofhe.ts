"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { arbSepolia, hardhat, sepolia } from "@cofhe/sdk/chains";
import {
  CreateSelfPermitOptions,
  CreateSharingPermitOptions,
  Permit,
  PermitUtils,
  permitStore,
} from "@cofhe/sdk/permits";
import { createCofhesdkClient, createCofhesdkConfig } from "@cofhe/sdk/web";
import * as chains from "viem/chains";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { create } from "zustand";
import scaffoldConfig from "~~/scaffold.config";
import { logBlockMessage, logBlockMessageAndEnd, logBlockStart } from "~~/utils/cofhe/logging";
import { notification } from "~~/utils/scaffold-eth";

const config = createCofhesdkConfig({
  // mirrors scaffoldConfig.targetNetworks
  supportedChains: [hardhat, sepolia, arbSepolia],
  mocks: {
    sealOutputDelay: 1000,
  },
});
export const cofhesdkClient = createCofhesdkClient(config);

// sync core store
const subscribeToConnection = (onStoreChange: () => void) => {
  return cofhesdkClient.subscribe(() => {
    onStoreChange();
  });
};
const getConnectionSnapshot = () => cofhesdkClient.getSnapshot();

const useCofheConnectionSnapshot = () =>
  useSyncExternalStore(subscribeToConnection, getConnectionSnapshot, getConnectionSnapshot);
// sync permits store
type PermitsSnapshot = ReturnType<(typeof cofhesdkClient.permits)["getSnapshot"]>;
const subscribeToPermits = (onStoreChange: () => void) => {
  return cofhesdkClient.permits.subscribe(() => {
    onStoreChange();
  });
};

const getPermitsSnapshot = () => cofhesdkClient.permits.getSnapshot();

const useCofhePermitsSnapshot = (): PermitsSnapshot =>
  useSyncExternalStore(subscribeToPermits, getPermitsSnapshot, getPermitsSnapshot);

/**
 * Hook to check if the currently connected chain is supported by the application
 * @returns boolean indicating if the current chain is in the target networks list
 * Refreshes when chainId changes
 */
export const useIsConnectedChainSupported = () => {
  const { chainId } = useAccount();
  return useMemo(
    () => scaffoldConfig.targetNetworks.some((network: chains.Chain) => network.id === chainId),
    [chainId],
  );
};

/**
 * Hook to track the connected wallet and chain and make sure cofhe is connected to the correct ones
 * Handles connection errors and displays toast notifications on success or error
 * Refreshes when connected wallet or chain changes
 */
export function useConnectCofheClient() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isChainSupported = useIsConnectedChainSupported();

  const handleError = (error: string) => {
    console.error("cofhe connection error:", error);
    notification.error(`cofhe connection error: ${error}`);
  };

  useEffect(() => {
    const connectCofhe = async () => {
      // Early exit if any of the required dependencies are missing
      if (!publicClient || !walletClient || !isChainSupported) return;

      logBlockStart("useConnectCofheClient");
      logBlockMessage("CONNECTING     | Setting up CoFHE");

      try {
        const connectionResult = await cofhesdkClient.connect(publicClient, walletClient);
        if (connectionResult.success) {
          logBlockMessageAndEnd(`[connectionResult] SUCCESS          | CoFHE environment initialization`);
          notification.success("Cofhe connected successfully");
        } else {
          logBlockMessageAndEnd(
            `FAILED           | ${connectionResult.error.message ?? String(connectionResult.error)}`,
          );
          handleError(connectionResult.error.message ?? String(connectionResult.error));
        }
      } catch (err) {
        logBlockMessageAndEnd(`FAILED           | ${err instanceof Error ? err.message : "Unknown error"}`);
        handleError(err instanceof Error ? err.message : "Unknown error initializing cofhe");
      }
    };

    connectCofhe();
  }, [walletClient, publicClient, isChainSupported]);
}

/**
 * Hook to get the current account initialized in cofhe
 * @returns The current account address or undefined
 */
export const useCofheAccount = () => {
  return useCofheConnectionSnapshot().account;
};

/**
 * Hook to check if cofhe is fully initialized (FHE keys, provider, and signer)
 * This is used to determine if the user is ready to use the FHE library
 * FHE based interactions (encrypt / decrypt) should be disabled until this is true
 * @returns boolean indicating if FHE keys, provider, and signer are all initialized
 */
export const useCofheInitialized = () => {
  const { connected } = useCofheConnectionSnapshot();
  return connected;
};

/**
 * Hook to get the complete status of cofhe
 * @returns Object containing chainId, account, and initialization status
 * Refreshes when any of the underlying values change
 */
export const useCofheStatus = () => {
  const { chainId, account, connected } = useCofheConnectionSnapshot();
  return useMemo(() => ({ chainId, account, initialized: connected }), [chainId, account, connected]);
};

// Permit Modal

interface CofhePermitModalStore {
  generatePermitModalOpen: boolean;
  generatePermitModalCallback?: () => void;
  setGeneratePermitModalOpen: (open: boolean, callback?: () => void) => void;
}

/**
 * Hook to access the permit modal store
 * @returns Object containing modal state and control functions
 */
export const useCofheModalStore = create<CofhePermitModalStore>(set => ({
  generatePermitModalOpen: false,
  setGeneratePermitModalOpen: (open, callback) =>
    set({ generatePermitModalOpen: open, generatePermitModalCallback: callback }),
}));

// Permits

/**
 * Hook to get the active permit hash for the current chain and account
 * @returns The active permit hash or undefined if not set
 * Refreshes when chainId, account, or initialization status changes
 */
export const useCofheActivePermitHash = () => {
  const { chainId, account, initialized } = useCofheStatus();
  const permitsSnapshot = useCofhePermitsSnapshot();
  if (!initialized || !chainId || !account) return undefined;
  return permitsSnapshot.activePermitHash?.[chainId]?.[account];
};

/**
 * Hook to get the active permit object
 * @returns The active permit object or null if not found/valid
 * Refreshes when active permit hash changes
 */
export const useCofheActivePermit = (): Permit | null => {
  const { chainId, account, initialized } = useCofheStatus();
  const activePermitHash = useCofheActivePermitHash();
  const permitsSnapshot = useCofhePermitsSnapshot();
  return useMemo(() => {
    if (!initialized || !chainId || !account || !activePermitHash) return null;
    const serializedPermit = permitsSnapshot.permits?.[chainId]?.[account]?.[activePermitHash] ?? null;
    const permit = serializedPermit ? PermitUtils.deserialize(serializedPermit) : null;
    return permit;
  }, [activePermitHash, chainId, account, initialized, permitsSnapshot]);
};

/**
 * Hook to check if the active permit is valid
 * @returns boolean indicating if the active permit is valid
 * Refreshes when permit changes
 */
export const useCofheIsActivePermitValid = () => {
  const permit = useCofheActivePermit();
  return useMemo(() => {
    if (!permit) return false;
    return PermitUtils.isValid(permit);
  }, [permit]);
};

/**
 * Hook to get all permit hashes for the current chain and account
 * @returns Array of permit hashes
 * Refreshes when chainId, account, or initialization status changes
 */
export const useCofheAllPermitHashes = () => {
  const { chainId, account, initialized } = useCofheStatus();
  const permitsSnapshot = useCofhePermitsSnapshot();
  return useMemo(() => {
    if (!initialized || !chainId || !account) return [];
    const permitsForAccount = permitsSnapshot.permits?.[chainId]?.[account];
    if (!permitsForAccount) return [];
    return Object.keys(permitsForAccount);
  }, [chainId, account, initialized, permitsSnapshot]);
};

/**
 * Hook to get all permit objects for the current chain and account
 * @returns Array of permit objects
 * Refreshes when permit hashes change
 */
export const useCofheAllPermits = (): Permit[] => {
  const { chainId, account, initialized } = useCofheStatus();
  const permitsSnapshot = useCofhePermitsSnapshot();
  if (!initialized || !chainId || !account) return [];
  return Object.values(permitsSnapshot.permits?.[chainId]?.[account] || {})
    .map(serializedPermit => (serializedPermit ? PermitUtils.deserialize(serializedPermit) : null))
    .filter((permit): permit is Permit => permit !== null);
};

/**
 * Hook to create a new permit
 * @returns Async function to create a permit with optional options
 * Refreshes when chainId, account, or initialization status changes
 */
export const useCofheCreatePermit = () => {
  const { chainId, account, initialized } = useCofheStatus();
  return useCallback(
    async (opts: CreateSelfPermitOptions | CreateSharingPermitOptions) => {
      if (!initialized || !chainId || !account) return;

      async function getPermitResult() {
        if (opts.type === "self") return cofhesdkClient.permits.createSelf(opts);
        if (opts.type === "sharing") return cofhesdkClient.permits.createSharing(opts);
        throw new Error("Invalid permit type");
      }
      const permitResult = await getPermitResult();
      if (permitResult.success) {
        notification.success("Permit created");
      } else {
        notification.error(permitResult.error.message ?? String(permitResult.error));
      }
      return permitResult;
    },
    [chainId, account, initialized],
  );
};

/**
 * Hook to remove a permit
 * @returns Async function to remove a permit by its hash
 * Refreshes when chainId, account, or initialization status changes
 */
export const useCofheRemovePermit = () => {
  const { chainId, account, initialized } = useCofheStatus();
  return useCallback(
    async (permitHash: string) => {
      if (!initialized || !chainId || !account) return;
      permitStore.removePermit(chainId, account, permitHash);
      notification.success("Permit removed");
    },
    [chainId, account, initialized],
  );
};

/**
 * Hook to select the active permit
 * @returns Async function to set the active permit by its hash
 * Refreshes when chainId, account, or initialization status changes
 */
export const useCofheSetActivePermit = () => {
  const { chainId, account, initialized } = useCofheStatus();
  return useCallback(
    async (permitHash: string) => {
      if (!initialized || !chainId || !account) return;
      permitStore.setActivePermitHash(chainId, account, permitHash);
      notification.success("Active permit updated");
    },
    [chainId, account, initialized],
  );
};

/**
 * Hook to get the issuer of the active permit
 * @returns The permit issuer address or null if no active permit
 * Refreshes when active permit changes
 */
export const useCofhePermitIssuer = () => {
  const permit = useCofheActivePermit();
  return useMemo(() => {
    if (!permit) return null;
    return permit.issuer;
  }, [permit]);
};
