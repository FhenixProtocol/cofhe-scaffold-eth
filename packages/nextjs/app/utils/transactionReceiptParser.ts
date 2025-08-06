import { MarketOrderAbi } from "../constants/MarketOrder";
import { TransactionReceipt, decodeEventLog } from "viem";

export type MarketOrderEventType = "OrderPlaced" | "OrderSettled" | "OrderFailed";

export interface ParsedMarketOrderEvent {
  eventName: MarketOrderEventType;
  user: string;
  handle: bigint;
  transactionHash: string;
  logIndex: number;
}

export interface TransactionReceiptParseResult {
  orderPlaced: ParsedMarketOrderEvent[];
  orderSettled: ParsedMarketOrderEvent[];
  orderFailed: ParsedMarketOrderEvent[];
}

/**
 * Parses a transaction receipt for market order events (OrderPlaced, OrderSettled, OrderFailed)
 * Works for both market order transactions and swap transactions that may trigger order settlements
 */
export function parseMarketOrderEvents(
  receipt: TransactionReceipt,
  userAddress?: string,
): TransactionReceiptParseResult {
  const result: TransactionReceiptParseResult = {
    orderPlaced: [],
    orderSettled: [],
    orderFailed: [],
  };

  if (!receipt?.logs) {
    return result;
  }

  console.log(`Parsing receipt ${receipt.transactionHash} for market order events...`);

  receipt.logs.forEach((log, index) => {
    try {
      const decoded = decodeEventLog({
        abi: MarketOrderAbi,
        data: log.data,
        topics: log.topics,
      });

      // Filter by user if specified
      if (userAddress && decoded.args?.user !== userAddress) {
        return;
      }

      const parsedEvent: ParsedMarketOrderEvent = {
        eventName: decoded.eventName as MarketOrderEventType,
        user: decoded.args?.user as string,
        handle: decoded.args?.handle as bigint,
        transactionHash: receipt.transactionHash,
        logIndex: index,
      };

      // Categorize events
      switch (decoded.eventName) {
        case "OrderPlaced":
          result.orderPlaced.push(parsedEvent);
          console.log(`Found OrderPlaced event:`, parsedEvent);
          break;
        case "OrderSettled":
          result.orderSettled.push(parsedEvent);
          console.log(`Found OrderSettled event:`, parsedEvent);
          break;
        case "OrderFailed":
          result.orderFailed.push(parsedEvent);
          console.log(`Found OrderFailed event:`, parsedEvent);
          break;
      }
    } catch {
      // Log is not a market order event or failed to decode - ignore silently
    }
  });

  const totalEvents = result.orderPlaced.length + result.orderSettled.length + result.orderFailed.length;
  if (totalEvents > 0) {
    console.log(`Parsed ${totalEvents} market order events from transaction ${receipt.transactionHash}`);
  }

  return result;
}

/**
 * Checks if a transaction receipt contains any market order events
 */
export function hasMarketOrderEvents(receipt: TransactionReceipt, userAddress?: string): boolean {
  const parsed = parseMarketOrderEvents(receipt, userAddress);
  return parsed.orderPlaced.length > 0 || parsed.orderSettled.length > 0 || parsed.orderFailed.length > 0;
}

/**
 * Gets the first OrderPlaced event from a transaction receipt for a specific user
 * Useful for extracting the handle from a placeMarketOrder transaction
 */
export function getOrderPlacedEvent(receipt: TransactionReceipt, userAddress: string): ParsedMarketOrderEvent | null {
  const parsed = parseMarketOrderEvents(receipt, userAddress);
  return parsed.orderPlaced[0] || null;
}

/**
 * Gets all OrderSettled events from a transaction receipt
 * Useful for detecting order completions from both market order and swap transactions
 */
export function getOrderSettledEvents(receipt: TransactionReceipt, userAddress?: string): ParsedMarketOrderEvent[] {
  const parsed = parseMarketOrderEvents(receipt, userAddress);
  return parsed.orderSettled;
}

/**
 * Gets all OrderFailed events from a transaction receipt
 * Useful for detecting order failures from both market order and swap transactions
 */
export function getOrderFailedEvents(receipt: TransactionReceipt, userAddress?: string): ParsedMarketOrderEvent[] {
  const parsed = parseMarketOrderEvents(receipt, userAddress);
  return parsed.orderFailed;
}
