import { useCallback, useEffect, useMemo, useState } from "react";
import { HashLink } from "../HashLink";
import { TabType } from "../Tab";
import { Token } from "../Token";
import { TxGuideStepState } from "../TransactionGuide";
import { MARKET_ORDER_HOOK, MAX_SQRT_PRICE, MIN_SQRT_PRICE, POOL_SWAP } from "../constants/Constants";
import { HOOK_DATA, POOL_KEY, TEST_SETTINGS } from "../constants/Constants";
import { MarketOrderAbi } from "../constants/MarketOrder";
import { PoolSwapAbi } from "../constants/PoolSwap";
import { useSwapTransactionMonitor } from "./useSwapTransactionMonitor";
import { CoFheInItem } from "cofhejs/web";
import { parseUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { getBlockExplorerTxLink, notification } from "~~/utils/scaffold-eth";

interface UseBusinessLogicProps {
  fromToken: Token;
  toToken: Token;
  activeTab: TabType;
  isPending: boolean;
  inputEncryptionDisabled: boolean;
  isQuoteLoading: boolean;
  isEncryptingInput: boolean;
  isProcessingOrder: boolean;
  isSwapLoading: boolean;
  encryptedObject: CoFheInItem | null;
  manualDecryptionStatus: boolean | undefined;
  decryptionStep: TxGuideStepState;
  setIsProcessingOrder: (value: boolean) => void;
  setConfirmationStep: (step: TxGuideStepState) => void;
  setDecryptionStep: (step: TxGuideStepState) => void;
  setSettlementStep: (step: TxGuideStepState) => void;
  setTransactionHash: (hash: string) => void;
  moveToAsyncTracking: () => void;
  setIsSwapLoading: (loading: boolean) => void;
  updateOrderStatus: (id: string, status: "completed" | "failed") => void;
  updateOrderStatusByHandle: (handle: bigint, status: "completed" | "failed") => void;
  refetchAllBalances: () => Promise<void>;
}

export function useBusinessLogic({
  fromToken,
  toToken,
  activeTab,
  isPending,
  inputEncryptionDisabled,
  isQuoteLoading,
  isEncryptingInput,
  isProcessingOrder,
  isSwapLoading,
  encryptedObject,
  manualDecryptionStatus,
  decryptionStep,
  setIsProcessingOrder,
  setConfirmationStep,
  setDecryptionStep,
  setSettlementStep,
  setTransactionHash,
  moveToAsyncTracking,
  setIsSwapLoading,
  updateOrderStatusByHandle,
  refetchAllBalances,
}: UseBusinessLogicProps) {
  const { writeContractAsync } = useWriteContract();
  const { targetNetwork } = useTargetNetwork();
  const { address } = useAccount();

  // Track swap transaction hash for monitoring
  const [swapTransactionHash, setSwapTransactionHash] = useState<string | null>(null);

  // Memoize callback functions to prevent infinite re-renders
  const handleOrderSettled = useCallback(
    (handle: bigint, txHash: string) => {
      console.log(`🔥 SWAP CALLBACK: Swap transaction ${txHash} settled order with handle ${handle}`);
      // Update order status by handle instead of transaction hash
      updateOrderStatusByHandle(handle, "completed");
      // Show notification
      notification.success(`Your queued market order was filled by a swap transaction!`, { duration: 5000 });
    },
    [updateOrderStatusByHandle],
  );

  const handleOrderFailed = useCallback(
    (handle: bigint, txHash: string) => {
      console.log(`Swap transaction ${txHash} failed order with handle ${handle}`);
      // Update order status by handle instead of transaction hash
      updateOrderStatusByHandle(handle, "failed");
      // Show notification
      notification.error(`A queued market order failed during swap execution`, { duration: 5000 });
    },
    [updateOrderStatusByHandle],
  );

  // Monitor swap transactions for order settlement events
  useSwapTransactionMonitor({
    transactionHash: swapTransactionHash,
    userAddress: address,
    onOrderSettled: handleOrderSettled,
    onOrderFailed: handleOrderFailed,
  });

  // Handle decryption status updates
  useEffect(() => {
    console.log("MANUAL DECRYPTION STATUS:", manualDecryptionStatus);

    if (manualDecryptionStatus !== undefined && isProcessingOrder) {
      if (manualDecryptionStatus === true) {
        console.log("✅ Decryption complete! Moving to execution phase.");
        setDecryptionStep(TxGuideStepState.Success);
        setSettlementStep(TxGuideStepState.Loading);

        setTimeout(() => {
          setSettlementStep(TxGuideStepState.Success);
          console.log("Moving order to async tracking...");
          moveToAsyncTracking();
        }, 3000);
      } else if (manualDecryptionStatus === false) {
        console.log("⏳ Still waiting for decryption...");
        if (decryptionStep !== TxGuideStepState.Loading) {
          setDecryptionStep(TxGuideStepState.Loading);
        }
      }
    }
  }, [
    manualDecryptionStatus,
    isProcessingOrder,
    decryptionStep,
    setDecryptionStep,
    setSettlementStep,
    moveToAsyncTracking,
  ]);

  // Remove encryption step handling since we pre-encrypt

  const handleSubmit = useCallback(() => {
    if (fromToken.value === "") return;

    const formattedFromValue = parseUnits(fromToken.value, 18);

    if (activeTab === "swap") {
      console.log("Executing swap:", { from: fromToken, to: toToken });

      const swapTokens = async () => {
        try {
          setIsSwapLoading(true);

          const zeroForOne = fromToken.symbol === "CPH";

          const swapParams = {
            zeroForOne: zeroForOne,
            amountSpecified: -formattedFromValue,
            sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE : MAX_SQRT_PRICE,
          };

          const txHash = await writeContractAsync({
            address: POOL_SWAP as `0x${string}`,
            abi: PoolSwapAbi,
            functionName: "swap",
            args: [POOL_KEY, swapParams, TEST_SETTINGS, HOOK_DATA],
            gas: 500000n, // Add reasonable gas limit
          });

          console.log("Swap transaction submitted:", txHash);

          // Set swap transaction hash for monitoring
          console.log(`🔍 SETTING SWAP HASH FOR MONITORING: ${txHash}`);
          setSwapTransactionHash(txHash);

          const link = getBlockExplorerTxLink(targetNetwork.id, txHash);

          // Show success notification with block explorer link
          notification.success(
            <div className={`flex flex-col cursor-default gap-1 text-primary`}>
              <p className="my-0">Swap Completed! Your swap transaction has been confirmed on the blockchain</p>
              <div className="flex flex-row gap-1">
                {txHash && (
                  <>
                    <p className="text-sm text-muted-foreground font-reddit-mono">View Transaction:</p>
                    <HashLink href={link} hash={txHash} />
                  </>
                )}
              </div>
            </div>,
            { duration: 8000 },
          );

          // Reset loading state after transaction is submitted
          setIsSwapLoading(false);

          // Refetch balances after successful swap
          try {
            await refetchAllBalances();
            console.log("✅ Token balances refreshed after swap");
          } catch (error) {
            console.error("❌ Failed to refresh balances after swap:", error);
          }

          // Clear swap transaction hash after showing notification
          setTimeout(() => {
            setSwapTransactionHash(null);
          }, 1000);
        } catch (error) {
          console.error("Swap transaction failed:", error);
          setIsSwapLoading(false);
          // Clear swap transaction hash on error
          setSwapTransactionHash(null);
        }
      };
      swapTokens();
    } else {
      console.log("Placing market order:", { from: fromToken, to: toToken });

      if (activeTab === "market" && !encryptedObject) {
        console.error("No encrypted object available for market order");
        return;
      }

      // Type guard: Ensure encryptedObject is not null before using it
      if (!encryptedObject) {
        console.error("Encrypted object is null");
        return;
      }

      setIsProcessingOrder(true);
      setConfirmationStep(TxGuideStepState.Loading);

      const placeMarketOrder = async () => {
        try {
          const zeroForOne = fromToken.symbol === "CPH";

          // Log all arguments being passed to the contract
          console.log("Contract call arguments:", {
            poolKey: POOL_KEY,
            zeroForOne,
            encryptedLiquidity: encryptedObject,
          });

          const hash = await writeContractAsync({
            address: MARKET_ORDER_HOOK as `0x${string}`,
            abi: MarketOrderAbi,
            functionName: "placeMarketOrder",
            args: [POOL_KEY, zeroForOne, encryptedObject],
            gas: 1000000n, // Add explicit gas limit
          });

          setTransactionHash(hash);

          const link = getBlockExplorerTxLink(targetNetwork.id, hash);

          // Show success notification with block explorer link
          notification.success(
            <div className={`flex flex-col cursor-default gap-1 text-primary`}>
              <p className="my-0">Market Order Submitted! Your encrypted order has been submitted to the blockchain</p>
              <div className="flex flex-row gap-1">
                {hash && (
                  <>
                    <p className="text-sm text-muted-foreground font-reddit-mono">View Transaction:</p>
                    <HashLink href={link} hash={hash} />
                  </>
                )}
              </div>
            </div>,
            { duration: 8000 },
          );
        } catch (error) {
          console.error("Error in market order submission:", error);
          setConfirmationStep(TxGuideStepState.Error);
          // Transaction status will remain visible until manually reset
        }
      };

      placeMarketOrder();
    }
  }, [
    fromToken,
    toToken,
    activeTab,
    writeContractAsync,
    encryptedObject,
    setIsProcessingOrder,
    setConfirmationStep,
    setTransactionHash,
    setIsSwapLoading,
    targetNetwork.id,
    refetchAllBalances,
  ]);

  const isSubmitDisabled = useMemo(() => {
    const commonDisabled = !fromToken.value || !toToken.value || isPending || inputEncryptionDisabled || isQuoteLoading;

    if (activeTab === "market") {
      return commonDisabled || isEncryptingInput || isProcessingOrder;
    }

    return commonDisabled || isEncryptingInput || isSwapLoading;
  }, [
    fromToken.value,
    toToken.value,
    isPending,
    inputEncryptionDisabled,
    isQuoteLoading,
    activeTab,
    isEncryptingInput,
    isProcessingOrder,
    isSwapLoading,
  ]);

  return {
    handleSubmit,
    isSubmitDisabled,
  };
}
