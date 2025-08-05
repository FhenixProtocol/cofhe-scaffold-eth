import { useEffect } from "react";
import { MARKET_ORDER_HOOK } from "../constants/Constants";
import { MarketOrderAbi } from "../constants/MarketOrder";
import { AsyncOrder } from "./useAsyncOrders";
import { useAccount, useWatchContractEvent } from "wagmi";

interface UseAsyncOrderEventsProps {
  asyncOrders: AsyncOrder[];
  updateOrderStatus: (id: string, status: "completed" | "failed") => void;
}

export function useAsyncOrderEvents({ asyncOrders, updateOrderStatus }: UseAsyncOrderEventsProps) {
  const { address } = useAccount();

  // Get all executing orders with their encrypted values
  const executingOrders = asyncOrders.filter(order => order.status === "executing");

  // Watch for OrderSettled events for all async orders
  useWatchContractEvent({
    address: MARKET_ORDER_HOOK,
    abi: MarketOrderAbi,
    eventName: "OrderSettled",
    onLogs: logs => {
      logs.forEach(log => {
        console.log("OrderSettled event detected for async monitoring:", log);

        if (log.args?.user === address) {
          const settledHandle = log.args?.handle;

          // Find matching order in our async queue
          const matchingOrder = executingOrders.find(order => order.encryptedValue === settledHandle);

          if (matchingOrder) {
            console.log("Found matching async order for settlement:", matchingOrder.id);
            updateOrderStatus(matchingOrder.id, "completed");
          }
        }
      });
    },
    enabled: !!address && executingOrders.length > 0,
  });

  // Watch for OrderFailed events for all async orders
  useWatchContractEvent({
    address: MARKET_ORDER_HOOK,
    abi: MarketOrderAbi,
    eventName: "OrderFailed",
    onLogs: logs => {
      logs.forEach(log => {
        console.log("OrderFailed event detected for async monitoring:", log);

        if (log.args?.user === address) {
          const failedHandle = log.args?.handle;

          // Find matching order in our async queue
          const matchingOrder = executingOrders.find(order => order.encryptedValue === failedHandle);

          if (matchingOrder) {
            console.log("Found matching async order for failure:", matchingOrder.id);
            updateOrderStatus(matchingOrder.id, "failed");
          }
        }
      });
    },
    enabled: !!address && executingOrders.length > 0,
  });

  // Debug logging
  useEffect(() => {
    if (executingOrders.length > 0) {
      console.log(
        "Monitoring async orders for events:",
        executingOrders.map(o => ({
          id: o.id,
          encryptedValue: o.encryptedValue.toString(),
        })),
      );
    }
  }, [executingOrders]);
}
