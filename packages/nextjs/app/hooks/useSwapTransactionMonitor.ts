import { useEffect, useRef } from "react";
import { parseMarketOrderEvents } from "../utils/transactionReceiptParser";
import { useWaitForTransactionReceipt } from "wagmi";

interface UseSwapTransactionMonitorProps {
  transactionHash: string | null;
  userAddress: string | undefined;
  onOrderSettled: (handle: bigint, transactionHash: string) => void;
  onOrderFailed: (handle: bigint, transactionHash: string) => void;
}

/**
 * Monitors swap transactions for OrderSettled/OrderFailed events
 * This catches cases where swap transactions trigger the completion of queued market orders
 */
export function useSwapTransactionMonitor({
  transactionHash,
  userAddress,
  onOrderSettled,
  onOrderFailed,
}: UseSwapTransactionMonitorProps) {
  // Use refs to store the latest callback functions without causing re-renders
  const onOrderSettledRef = useRef(onOrderSettled);
  const onOrderFailedRef = useRef(onOrderFailed);

  // Update refs when callbacks change
  useEffect(() => {
    onOrderSettledRef.current = onOrderSettled;
  }, [onOrderSettled]);

  useEffect(() => {
    onOrderFailedRef.current = onOrderFailed;
  }, [onOrderFailed]);

  // Wait for swap transaction receipt
  const { data: receipt } = useWaitForTransactionReceipt({
    hash: transactionHash as `0x${string}`,
    query: {
      enabled: !!transactionHash,
    },
  });

  // Parse receipt for order settlement events when available
  useEffect(() => {
    if (receipt && receipt.logs && userAddress && transactionHash) {
      console.log(`🔍 SWAP MONITOR: Checking swap transaction ${transactionHash} for order settlement events...`);

      try {
        const parsedEvents = parseMarketOrderEvents(receipt, userAddress);

        console.log(`🔍 SWAP RECEIPT ANALYSIS:`);
        console.log(`📊 Total logs in receipt: ${receipt.logs.length}`);
        console.log(`🎯 OrderPlaced events: ${parsedEvents.orderPlaced.length}`);
        console.log(`✅ OrderSettled events: ${parsedEvents.orderSettled.length}`);
        console.log(`❌ OrderFailed events: ${parsedEvents.orderFailed.length}`);

        if (parsedEvents.orderSettled.length === 0 && parsedEvents.orderFailed.length === 0) {
          console.log(`⚠️ No order settlement events found in swap transaction ${transactionHash}`);
          console.log(
            `📋 Receipt logs:`,
            receipt.logs.map(log => ({ address: log.address, topics: log.topics })),
          );
        }

        // Handle OrderSettled events from swap
        parsedEvents.orderSettled.forEach(event => {
          console.log(`🎉 Swap transaction ${transactionHash} settled order:`, event);
          onOrderSettledRef.current(event.handle, event.transactionHash);
        });

        // Handle OrderFailed events from swap
        parsedEvents.orderFailed.forEach(event => {
          console.log(`💥 Swap transaction ${transactionHash} failed order:`, event);
          onOrderFailedRef.current(event.handle, event.transactionHash);
        });

        const totalEvents = parsedEvents.orderSettled.length + parsedEvents.orderFailed.length;
        if (totalEvents > 0) {
          console.log(`🎊 Swap transaction ${transactionHash} affected ${totalEvents} queued orders`);
        }
      } catch (error) {
        console.error(`Error parsing swap transaction ${transactionHash} for order events:`, error);
      }
    }
  }, [receipt, userAddress, transactionHash]);

  return {
    receipt,
    isMonitoring: !!transactionHash && !receipt,
  };
}
