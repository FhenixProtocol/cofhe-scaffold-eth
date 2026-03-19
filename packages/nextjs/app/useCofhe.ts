"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { CONNECT_STORE_DEFAULTS } from "@cofhe/sdk";
import { arbSepolia, hardhat, sepolia } from "@cofhe/sdk/chains";
import { CreateSelfPermitOptions, CreateSharingPermitOptions, Permit, PermitUtils } from "@cofhe/sdk/permits";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/web";
import * as chains from "viem/chains";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { create } from "zustand";
import scaffoldConfig from "~~/scaffold.config";
import { logBlockMessage, logBlockMessageAndEnd, logBlockStart } from "~~/utils/cofhe/logging";
import { notification } from "~~/utils/scaffold-eth";

let _cofheClient: ReturnType<typeof createCofheClient> | null = null;

export const getCofheClientNext = () => {
  if (_cofheClient) return _cofheClient;
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("cofhe client can only be created in the browser");
  }
  const config = createCofheConfig({
    // mirrors scaffoldConfig.targetNetworks
    supportedChains: [hardhat, sepolia, arbSepolia],
    mocks: {
      decryptDelay: 1000,
    },
  });
  _cofheClient = createCofheClient(config);
  return _cofheClient;
};

// sync core store
const subscribeToConnection = (onStoreChange: () => void) => {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  return getCofheClientNext().subscribe(() => onStoreChange());
};
const getConnectionSnapshot = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return CONNECT_STORE_DEFAULTS;
  return getCofheClientNext().getSnapshot();
};
const getServerConnectionSnapshot = () => CONNECT_STORE_DEFAULTS;

const useCofheConnectionSnapshot = () =>
  useSyncExternalStore(subscribeToConnection, getConnectionSnapshot, getServerConnectionSnapshot);
// sync permits store
type PermitsSnapshot = ReturnType<ReturnType<typeof getCofheClientNext>["permits"]["getSnapshot"]>;
const subscribeToPermits = (onStoreChange: () => void) => {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  return getCofheClientNext().permits.subscribe(() => onStoreChange());
};

const getPermitsSnapshot = (): PermitsSnapshot => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { permits: {}, activePermitHash: {} } as PermitsSnapshot;
  }
  return getCofheClientNext().permits.getSnapshot();
};

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
        await getCofheClientNext().connect(publicClient, walletClient);
        logBlockMessageAndEnd("SUCCESS          | CoFHE environment initialization");
        notification.success("Cofhe connected successfully");
      } catch (err) {
        logBlockMessageAndEnd(`FAILED           | ${err instanceof Error ? err.message : "Unknown error"}`);
        handleError(err instanceof Error ? err.message : "Unknown error initializing cofhe");
      }
    };

    connectCofhe();
  }, [walletClient, publicClient, isChainSupported]);
}

/**
 * Hook to get the current account connected to cofhe
 * @returns The current account address or undefined
 */
export const useCofheAccount = () => {
  return useCofheConnectionSnapshot().account;
};

/**
 * Hook to check if cofhe is connected (provider, and signer)
 * This is used to determine if the user is ready to use the FHE library
 * FHE based interactions (encrypt / decrypt) should be disabled until this is true
 * @returns boolean indicating if provider, and signer are all connected
 */
export const useCofheConnected = () => {
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
  return useMemo(() => ({ chainId, account, connected }), [chainId, account, connected]);
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
  const { chainId, account, connected } = useCofheStatus();
  const permitsSnapshot = useCofhePermitsSnapshot();
  if (!connected || !chainId || !account) return undefined;
  return permitsSnapshot.activePermitHash?.[chainId]?.[account];
};

/**
 * Hook to get the active permit object
 * @returns The active permit object or null if not found/valid
 * Refreshes when active permit hash changes
 */
export const useCofheActivePermit = (): Permit | null => {
  const { chainId, account, connected } = useCofheStatus();
  const activePermitHash = useCofheActivePermitHash();
  const permitsSnapshot = useCofhePermitsSnapshot();
  return useMemo(() => {
    if (!connected || !chainId || !account || !activePermitHash) return null;
    const serializedPermit = permitsSnapshot.permits?.[chainId]?.[account]?.[activePermitHash] ?? null;
    const permit = serializedPermit ? PermitUtils.deserialize(serializedPermit) : null;
    return permit;
  }, [activePermitHash, chainId, account, connected, permitsSnapshot]);
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
  const { chainId, account, connected } = useCofheStatus();
  const permitsSnapshot = useCofhePermitsSnapshot();
  return useMemo(() => {
    if (!connected || !chainId || !account) return [];
    const permitsForAccount = permitsSnapshot.permits?.[chainId]?.[account];
    if (!permitsForAccount) return [];
    return Object.keys(permitsForAccount);
  }, [chainId, account, connected, permitsSnapshot]);
};

/**
 * Hook to get all permit objects for the current chain and account
 * @returns Array of permit objects
 * Refreshes when permit hashes change
 */
export const useCofheAllPermits = (): Permit[] => {
  const { chainId, account, connected } = useCofheStatus();
  const permitsSnapshot = useCofhePermitsSnapshot();
  if (!connected || !chainId || !account) return [];
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
  const { chainId, account, connected } = useCofheStatus();
  return useCallback(
    async (opts: CreateSelfPermitOptions | CreateSharingPermitOptions) => {
      if (!connected || !chainId || !account) return;

      try {
        const permit =
          opts.type === "self"
            ? await getCofheClientNext().permits.createSelf(opts)
            : await getCofheClientNext().permits.createSharing(opts as CreateSharingPermitOptions);
        notification.success("Permit created");
        return { success: true as const, data: permit };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        notification.error(message);
        return { success: false as const, error: err };
      }
    },
    [chainId, account, connected],
  );
};

/**
 * Hook to remove a permit
 * @returns Async function to remove a permit by its hash
 * Refreshes when chainId, account, or initialization status changes
 */
export const useCofheRemovePermit = () => {
  const { chainId, account, connected } = useCofheStatus();
  return useCallback(
    async (permitHash: string) => {
      if (!connected || !chainId || !account) return;
      getCofheClientNext().permits.removePermit(permitHash, chainId, account);
      notification.success("Permit removed");
    },
    [chainId, account, connected],
  );
};

/**
 * Hook to select the active permit
 * @returns Async function to set the active permit by its hash
 * Refreshes when chainId, account, or initialization status changes
 */
export const useCofheSetActivePermit = () => {
  const { chainId, account, connected } = useCofheStatus();
  return useCallback(
    async (permitHash: string) => {
      if (!connected || !chainId || !account) return;
      getCofheClientNext().permits.selectActivePermit(permitHash, chainId, account);
      notification.success("Active permit updated");
    },
    [chainId, account, connected],
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
