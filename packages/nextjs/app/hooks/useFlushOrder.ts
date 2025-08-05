import { useState } from "react";
import { MARKET_ORDER_HOOK, POOL_KEY } from "../constants/Constants";
import { MarketOrderAbi } from "../constants/MarketOrder";
import { useWriteContract } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";

export function useFlushOrder() {
  const [isFlushingOrder, setIsFlushingOrder] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const flushOrder = async (orderId: string): Promise<boolean> => {
    if (isFlushingOrder) {
      console.warn("Already flushing an order");
      return false;
    }

    setIsFlushingOrder(orderId);

    try {
      // Call the flushOrder function on the smart contract
      const txHash = await writeContractAsync({
        address: MARKET_ORDER_HOOK as `0x${string}`,
        abi: MarketOrderAbi,
        functionName: "flushOrder",
        args: [POOL_KEY],
      });

      if (txHash) {
        notification.success("Force execution initiated - Order processing has been triggered manually", {
          duration: 4000,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to flush order:", error);

      // Parse error message for user-friendly display
      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      notification.error(`Force execution failed: ${errorMessage}`, {
        duration: 6000,
      });
      return false;
    } finally {
      setIsFlushingOrder(null);
    }
  };

  return {
    flushOrder,
    isFlushingOrder,
  };
}
