import { useCallback, useMemo } from "react";
import { useEffect } from "react";
import { Result } from "@cofhe/sdk";
import {
  CreateSelfPermitOptions,
  CreateSharingPermitOptions,
  Permit,
  PermitUtils,
  permitStore,
} from "@cofhe/sdk/permits";
import { createCofhesdkClient, createCofhesdkConfig } from "@cofhe/sdk/web";
import { WalletClient, createWalletClient, http } from "viem";
import { PrivateKeyAccount, privateKeyToAccount } from "viem/accounts";
import * as chains from "viem/chains";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { create } from "zustand";
import scaffoldConfig from "~~/scaffold.config";
import { logBlockMessage, logBlockMessageAndEnd, logBlockStart } from "~~/utils/cofhe/logging";
import { notification } from "~~/utils/scaffold-eth";

const zkvSignerPrivateKey = "0x6C8D7F768A6BB4AAFE85E8A2F5A9680355239C7E14646ED62B044E39DE154512";
function createWalletClientFromPrivateKey(privateKey: `0x${string}`): WalletClient {
  const account: PrivateKeyAccount = privateKeyToAccount(privateKey);
  const url = chains.hardhat.rpcUrls.default.http[0];
  return createWalletClient({
    account,
    chain: chains.hardhat,
    transport: http(url),
  });
}
const mockViemZkvSigner = createWalletClientFromPrivateKey(zkvSignerPrivateKey);

const config = createCofhesdkConfig({
  supportedChains: [],
  mocks: {
    sealOutputDelay: 1000,
  },
  _internal: {
    zkvWalletClient: mockViemZkvSigner,
  },
});
export const cofhesdkClient = createCofhesdkClient(config);

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
 * Hook to initialize cofhejs with the connected wallet and chain configuration
 * Handles initialization errors and displays toast notifications on success or error
 * Refreshes when connected wallet or chain changes
 */
export function useInitializeCofhejs() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isChainSupported = useIsConnectedChainSupported();

  const handleError = (error: string) => {
    console.error("cofhe initialization error:", error);
    notification.error(`cofhe initialization error: ${error}`);
  };

  useEffect(() => {
    const initializeCofhejs = async () => {
      // Early exit if any of the required dependencies are missing
      if (!publicClient || !walletClient || !isChainSupported) return;

      logBlockStart("useInitializeCofhejs");
      logBlockMessage("INITIALIZING     | Setting up CoFHE environment");

      // const chainId = publicClient?.chain.id;
      // const environment = ChainEnvironments[chainId as keyof typeof ChainEnvironments] ?? "TESTNET";

      // const viemZkvSigner = createWalletClientFromPrivateKey(publicClient, zkvSignerPrivateKey);

      try {
        // TODO: are there any more async initialization results we need to wait for?

        const connectionResult = await cofhesdkClient.connect(publicClient, walletClient);
        handleResult("connectionResult", connectionResult);
        const initializationResult = await cofhesdkClient.initializationResults.keyFetchResult;
        handleResult("initializationResult", initializationResult);
        // const initializationResult = await cf.initializeWithViem({
        //   viemClient: publicClient,
        //   viemWalletClient: walletClient,
        //   environment,
        //   // Whether to generate a permit for the connected account during the initialization process
        //   // Recommended to set to false, and then call `cofhejs.generatePermit()` when the user is ready to generate a permit
        //   // !! if **true** - will generate a permit immediately on page load !!
        //   generatePermit: false,
        //   // Hard coded signer for submitting encrypted inputs
        //   // This is only used in the mock environment to submit the mock encrypted inputs so that they can be used in FHE ops.
        //   // This has no effect in the mainnet or testnet environments.
        //   mockConfig: {
        //     decryptDelay: 1000,
        //     zkvSigner: viemZkvSigner,
        //   },
        // });

        notification.success("Cofhe initialized successfully");
        function handleResult<T>(prefix: string, result: Result<T>) {
          if (result.success) {
            logBlockMessageAndEnd(`[handleResult:${prefix}]SUCCESS          | CoFHE environment initialization`);
          } else {
            logBlockMessageAndEnd(`FAILED           | ${result.error.message ?? String(initializationResult.error)}`);
            handleError(result.error.message ?? String(initializationResult.error));
          }
        }
      } catch (err) {
        logBlockMessageAndEnd(`FAILED           | ${err instanceof Error ? err.message : "Unknown error"}`);
        handleError(err instanceof Error ? err.message : "Unknown error initializing cofhejs");
      }
    };

    initializeCofhejs();
  }, [walletClient, publicClient, isChainSupported]);
}

// type CofhejsStoreState = ReturnType<typeof cofhejs.store.getState>;

/**
 * Hook to access the cofhejs store state (used internally)
 * @param selector Function to select specific state from the store
 * @returns Selected state from the cofhejs store
 */
// const useCofhejsStore = <T>(selector: (state: CofhejsStoreState) => T) => useStore(cofhejs.store, selector);

/**
 * Hook to get the current account initialized in cofhejs
 * @returns The current account address or undefined
 */
export const useCofhejsAccount = () => {
  return cofhesdkClient.getSnapshot().account;
};

/**
 * Hook to get the current chain ID initialized in cofhejs
 * @returns The current chain ID or undefined
 */
export const useCofhejsChainId = () => {
  return cofhesdkClient.getSnapshot().chainId;
};

/**
 * Hook to check if cofhejs is fully initialized (FHE keys, provider, and signer)
 * This is used to determine if the user is ready to use the FHE library
 * FHE based interactions (encrypt / decrypt) should be disabled until this is true
 * @returns boolean indicating if FHE keys, provider, and signer are all initialized
 */
export const useCofhejsInitialized = () => {
  // const fheKeysInitialized = cofhesdkClient.initializationResults.keyFetchResult;
  // const providerInitialized = cofhesdkClient.connected;
  // const signerInitialized = cofhesdkClient.getSnapshot().signerInitialized;

  return cofhesdkClient.connected;
};

/**
 * Hook to get the complete status of cofhejs
 * @returns Object containing chainId, account, and initialization status
 * Refreshes when any of the underlying values change
 */
export const useCofhejsStatus = () => {
  const chainId = useCofhejsChainId();
  const account = useCofhejsAccount();
  const initialized = useCofhejsInitialized();

  return useMemo(() => ({ chainId, account, initialized }), [chainId, account, initialized]);
};

// Permit Modal

interface CofhejsPermitModalStore {
  generatePermitModalOpen: boolean;
  generatePermitModalCallback?: () => void;
  setGeneratePermitModalOpen: (open: boolean, callback?: () => void) => void;
}

/**
 * Hook to access the permit modal store
 * @returns Object containing modal state and control functions
 */
export const useCofhejsModalStore = create<CofhejsPermitModalStore>(set => ({
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
export const useCofhejsActivePermitHash = () => {
  const { chainId, account, initialized } = useCofhejsStatus();
  if (!initialized || !chainId || !account) return undefined;
  return cofhesdkClient.permits.getSnapshot().activePermitHash?.[chainId]?.[account];
};

/**
 * Hook to get the active permit object
 * @returns The active permit object or null if not found/valid
 * Refreshes when active permit hash changes
 */
export const useCofhejsActivePermit = (): Permit | null => {
  const { chainId, account, initialized } = useCofhejsStatus();
  const activePermitHash = useCofhejsActivePermitHash();
  return useMemo(() => {
    if (!initialized || !chainId || !account || !activePermitHash) return null;
    const serializedPermit = cofhesdkClient.permits.getSnapshot().permits[chainId][account][activePermitHash] || null;
    const permit = serializedPermit ? PermitUtils.deserialize(serializedPermit) : null;
    return permit;
  }, [activePermitHash, chainId, account, initialized]);
};

/**
 * Hook to check if the active permit is valid
 * @returns boolean indicating if the active permit is valid
 * Refreshes when permit changes
 */
export const useCofhejsIsActivePermitValid = () => {
  const permit = useCofhejsActivePermit();
  return useMemo(() => {
    if (!permit) return false;
    const deserializedPermit = PermitUtils.deserialize(permit);
    return PermitUtils.isValid(deserializedPermit);
  }, [permit]);
};

/**
 * Hook to get all permit hashes for the current chain and account
 * @returns Array of permit hashes
 * Refreshes when chainId, account, or initialization status changes
 */
export const useCofhejsAllPermitHashes = () => {
  const { chainId, account, initialized } = useCofhejsStatus();
  return useMemo(() => {
    if (!initialized || !chainId || !account) return [];
    const permitsForAccount = cofhesdkClient.permits.getSnapshot().permits[chainId]?.[account];
    if (!permitsForAccount) return [];
    return Object.keys(permitsForAccount);
  }, [chainId, account, initialized]);
};

/**
 * Hook to get all permit objects for the current chain and account
 * @returns Array of permit objects
 * Refreshes when permit hashes change
 */
export const useCofhejsAllPermits = (): Permit[] => {
  const { chainId, account, initialized } = useCofhejsStatus();
  if (!initialized || !chainId || !account) return [];
  return Object.values(cofhesdkClient.permits.getSnapshot().permits[chainId][account] || {})
    .map(serializedPermit => (serializedPermit ? PermitUtils.deserialize(serializedPermit) : null))
    .filter((permit): permit is Permit => permit !== null);
};

/**
 * Hook to create a new permit
 * @returns Async function to create a permit with optional options
 * Refreshes when chainId, account, or initialization status changes
 */
export const useCofhejsCreatePermit = () => {
  const { chainId, account, initialized } = useCofhejsStatus();
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
        notification.error(
          "tried creating permit. Ran into error: " + (permitResult.error.message ?? String(permitResult.error)),
        );
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
export const useCofhejsRemovePermit = () => {
  const { chainId, account, initialized } = useCofhejsStatus();
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
export const useCofhejsSetActivePermit = () => {
  const { chainId, account, initialized } = useCofhejsStatus();
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
export const useCofhejsPermitIssuer = () => {
  const permit = useCofhejsActivePermit();
  return useMemo(() => {
    if (!permit) return null;
    return permit.issuer;
  }, [permit]);
};
