import { useCallback, useEffect, useRef, useState } from "react";
import { TxGuideStepState } from "../TransactionGuide";
import { MARKET_ORDER_HOOK } from "../constants/Constants";
import { MarketOrderAbi } from "../constants/MarketOrder";
import { parseMarketOrderEvents } from "../utils/transactionReceiptParser";
import { usePublicClient, useWaitForTransactionReceipt } from "wagmi";

interface UseMarketOrderEventsProps {
  transactionHash: string;
  encryptedValue: bigint | undefined;
  isProcessingOrder: boolean;
  address: string | undefined;
  confirmationStep: TxGuideStepState;
  setEncryptedValue: (value: bigint) => void;
  setConfirmationStep: (step: TxGuideStepState) => void;
  setDecryptionStep: (step: TxGuideStepState) => void;
  setSettlementStep: (step: TxGuideStepState) => void;
  setManualDecryptionStatus: (status: boolean | undefined) => void;
  updateOrderStatus: (id: string, status: "completed" | "failed") => void;
  updateOrderStatusByHandle: (handle: bigint, status: "completed" | "failed") => void;
}

export function useMarketOrderEvents({
  transactionHash,
  encryptedValue,
  isProcessingOrder,
  address,
  confirmationStep,
  setEncryptedValue,
  setConfirmationStep,
  setDecryptionStep,
  setSettlementStep,
  setManualDecryptionStatus,
  updateOrderStatus,
  updateOrderStatusByHandle,
}: UseMarketOrderEventsProps) {
  const publicClient = usePublicClient();
  const [orderPlacedDetected, setOrderPlacedDetected] = useState(false);

  // Use refs to store callback functions to prevent dependency issues
  const updateOrderStatusRef = useRef(updateOrderStatus);
  const updateOrderStatusByHandleRef = useRef(updateOrderStatusByHandle);

  // Update refs when callbacks change
  useEffect(() => {
    updateOrderStatusRef.current = updateOrderStatus;
  }, [updateOrderStatus]);

  useEffect(() => {
    updateOrderStatusByHandleRef.current = updateOrderStatusByHandle;
  }, [updateOrderStatusByHandle]);

  // Reset orderPlacedDetected when a new transaction starts
  useEffect(() => {
    if (transactionHash && isProcessingOrder) {
      setOrderPlacedDetected(false);
    }
  }, [transactionHash, isProcessingOrder]);

  // Centralized handler for OrderPlaced events
  const handleOrderPlacedEvent = useCallback(
    (args: any) => {
      if (orderPlacedDetected) return; // Prevent duplicate processing

      if (!args.handle) {
        console.log("Error reading handle from OrderPlaced event!");
        return;
      }

      console.log("Processing OrderPlaced event with handle:", args.handle);
      setOrderPlacedDetected(true);
      setEncryptedValue(args.handle);
      setConfirmationStep(TxGuideStepState.Success);
      setDecryptionStep(TxGuideStepState.Loading);
    },
    [orderPlacedDetected, setEncryptedValue, setConfirmationStep, setDecryptionStep],
  );

  // Watch for transaction confirmation
  const { data: receipt } = useWaitForTransactionReceipt({
    hash: transactionHash as `0x${string}`,
    query: {
      enabled: !!transactionHash,
    },
  });

  // Manual decryption polling
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (!!encryptedValue && confirmationStep === TxGuideStepState.Success && isProcessingOrder) {
      console.log("🔄 Starting manual decryption polling at:", new Date().toLocaleTimeString());

      if (!publicClient) {
        console.log("Error initialising public client!!");
        return;
      }

      const pollDecryptionStatus = async () => {
        console.log("CtHash : " + encryptedValue);
        try {
          const result = await publicClient.readContract({
            address: MARKET_ORDER_HOOK,
            abi: MarketOrderAbi,
            functionName: "getOrderDecryptStatus",
            args: [encryptedValue],
          });

          if (result === true && intervalId) {
            console.log("✅ Decryption complete! Stopping polling.");
            clearInterval(intervalId);
            intervalId = null;
          }

          console.log("Decryption poll result:", result, "at", new Date().toLocaleTimeString());
          setManualDecryptionStatus(result as boolean);
        } catch (error) {
          console.error("Decryption poll error:", error);
        }
      };

      pollDecryptionStatus();
      intervalId = setInterval(pollDecryptionStatus, 2000);
    }

    return () => {
      if (intervalId) {
        console.log("🛑 Stopping manual decryption polling");
        clearInterval(intervalId);
      }
    };
  }, [confirmationStep, isProcessingOrder, publicClient, encryptedValue, setManualDecryptionStatus]);

  // Handle transaction receipt - parse for all market order events
  useEffect(() => {
    if (receipt && receipt.logs && isProcessingOrder && address) {
      console.log(`📝 MARKET ORDER MONITOR: Parsing transaction ${transactionHash} receipt for market order events...`);

      try {
        const parsedEvents = parseMarketOrderEvents(receipt, address);

        // Handle OrderPlaced events
        if (parsedEvents.orderPlaced.length > 0 && !orderPlacedDetected) {
          const orderPlacedEvent = parsedEvents.orderPlaced[0];
          console.log("Found OrderPlaced event in transaction receipt:", orderPlacedEvent);
          handleOrderPlacedEvent({ handle: orderPlacedEvent.handle, user: orderPlacedEvent.user });
        }

        // Handle OrderSettled events
        parsedEvents.orderSettled.forEach(event => {
          console.log("🎯 Found OrderSettled event in market order transaction:", event);
          console.log("🎯 Current encryptedValue:", encryptedValue);
          console.log("🎯 Event handle:", event.handle);
          console.log("🎯 Handles match:", encryptedValue && event.handle === encryptedValue);

          if (encryptedValue && event.handle === encryptedValue) {
            console.log("✅ OrderSettled event matches our current order!");
            setSettlementStep(TxGuideStepState.Success);

            // Update the async order status to completed
            if (transactionHash) {
              console.log("Updating async order status to completed for:", transactionHash);
              updateOrderStatusRef.current(transactionHash, "completed");
            }
          } else {
            // This OrderSettled event is for a different order - update by handle
            console.log("🔄 OrderSettled event is for a different order, updating by handle");
            updateOrderStatusByHandleRef.current(event.handle, "completed");
          }
        });

        // Handle OrderFailed events
        parsedEvents.orderFailed.forEach(event => {
          if (encryptedValue && event.handle === encryptedValue) {
            console.log("Found OrderFailed event for our order:", event);
            setSettlementStep(TxGuideStepState.Error);

            // Update the async order status to failed
            if (transactionHash) {
              console.log("Updating async order status to failed for:", transactionHash);
              updateOrderStatusRef.current(transactionHash, "failed");
            }
          }
        });
      } catch (error) {
        console.error("Error parsing transaction receipt for market order events:", error);
      }
    }
  }, [
    receipt,
    isProcessingOrder,
    address,
    orderPlacedDetected,
    handleOrderPlacedEvent,
    encryptedValue,
    transactionHash,
    setSettlementStep,
  ]);

  return {
    receipt,
  };
}
