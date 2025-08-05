import { useMemo } from "react";
import { HashLink } from "./HashLink";
import { AsyncOrder } from "./hooks/useAsyncOrders";
import { useFlushOrder } from "./hooks/useFlushOrder";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

export function AsyncOrderStatus({ orders }: { orders: AsyncOrder[] }) {
  const { targetNetwork } = useTargetNetwork();
  const { flushOrder, isFlushingOrder } = useFlushOrder();

  const handleForceExecute = async (order: AsyncOrder) => {
    await flushOrder(order.id);
  };

  // Deduplicate orders based on ID
  const uniqueOrders = useMemo(() => {
    const seen = new Set<string>();
    return orders.filter(order => {
      if (seen.has(order.id)) {
        console.warn(`Duplicate order detected in display: ${order.id}`);
        return false;
      }
      seen.add(order.id);
      return true;
    });
  }, [orders]);

  if (uniqueOrders.length === 0) return null;

  const queuedCount = uniqueOrders.filter(o => o.status === "executing").length;

  return (
    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-100 dark:border-blue-800/30">
        <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full" />
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{queuedCount} order(s) queued</span>
      </div>
      <div className="space-y-3">
        {uniqueOrders.map((order, index) => {
          const blockExplorerLink = getBlockExplorerTxLink(targetNetwork.id, order.id);

          return (
            <div
              key={order.id}
              className={`text-xs text-blue-600 dark:text-blue-400 space-y-1 ${
                index !== uniqueOrders.length - 1 ? "pb-3 border-b border-blue-100 dark:border-blue-800/30" : ""
              }`}
            >
              <div className="flex justify-between items-center">
                <span>
                  {order.amount} {order.fromToken} → {order.toToken}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === "executing"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                        : order.status === "completed"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    }`}
                  >
                    {order.status === "executing" ? "queued" : order.status}
                  </span>
                  {order.status === "executing" && (
                    <button
                      onClick={() => handleForceExecute(order)}
                      disabled={isFlushingOrder === order.id}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        isFlushingOrder === order.id
                          ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                      }`}
                      title="Manually trigger order execution"
                    >
                      {isFlushingOrder === order.id ? "Executing..." : "Force Execute"}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 dark:text-gray-400">Tx:</span>
                <HashLink hash={order.id} href={blockExplorerLink} copyable={true} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
