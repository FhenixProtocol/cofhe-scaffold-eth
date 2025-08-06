import { useState } from "react";

export interface AsyncOrder {
  id: string;
  amount: string;
  fromToken: string;
  toToken: string;
  timestamp: number;
  encryptedValue: bigint;
  status: "executing" | "completed" | "failed";
}

export function useAsyncOrders() {
  const [asyncOrders, setAsyncOrders] = useState<AsyncOrder[]>([]);

  const addAsyncOrder = (order: {
    id: string;
    amount: string;
    fromToken: string;
    toToken: string;
    timestamp: number;
    encryptedValue: bigint;
  }) => {
    setAsyncOrders(prev => [...prev, { ...order, status: "executing" }]);
  };

  const hasOrder = (id: string): boolean => {
    return asyncOrders.some(order => order.id === id);
  };

  const updateOrderStatus = (id: string, status: "completed" | "failed") => {
    setAsyncOrders(prev => prev.map(order => (order.id === id ? { ...order, status } : order)));
  };

  const updateOrderStatusByHandle = (handle: bigint, status: "completed" | "failed") => {
    setAsyncOrders(prev => {
      // Check if any order needs to be updated to avoid unnecessary renders
      const hasOrderToUpdate = prev.some(order => order.encryptedValue === handle && order.status !== status);
      if (!hasOrderToUpdate) {
        return prev; // No changes needed
      }

      return prev.map(order => (order.encryptedValue === handle ? { ...order, status } : order));
    });
  };

  return {
    asyncOrders,
    addAsyncOrder,
    updateOrderStatus,
    updateOrderStatusByHandle,
    hasOrder,
  };
}
