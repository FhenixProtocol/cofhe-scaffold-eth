import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApprovalModal } from "./ApprovalModal";
import { AsyncOrderStatus } from "./AsyncOrderStatus";
import { SubmitButton } from "./SubmitButton";
import { SwapButton } from "./SwapButton";
import { TabType } from "./Tab";
import { TabSelector } from "./TabSelector";
import { Token } from "./Token";
import { TokenInput } from "./TokenInput";
import { TransactionGuide } from "./TransactionGuide";
import { DEFAULT_TOKENS, TABS } from "./constants/Constants";
import { useAsyncOrderEvents } from "./hooks/useAsyncOrderEvents";
import { useAsyncOrders } from "./hooks/useAsyncOrders";
import { useBusinessLogic } from "./hooks/useBusinessLogic";
import { useEncryptInput } from "./hooks/useEncryptInput";
import { useMarketOrderEvents } from "./hooks/useMarketOrderEvents";
import { useMarketOrderStatus } from "./hooks/useMarketOrderStatus";
import { useQuoteData } from "./hooks/useQuoteData";
import { useTokenAllowance } from "./hooks/useTokenAllowance";
import { useTokenBalances } from "./hooks/useTokenBalances";
import { CoFheInItem, FheTypes } from "cofhejs/web";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";

export function SwapComponent() {
  const [activeTab, setActiveTab] = useState<TabType>("market");
  const [fromToken, setFromToken] = useState<Token>(DEFAULT_TOKENS.from);
  const [toToken, setToToken] = useState<Token>(DEFAULT_TOKENS.to);

  // New state for encryption flow
  const [isOrderEncrypted, setIsOrderEncrypted] = useState(false);
  const [preEncryptedValue, setPreEncryptedValue] = useState<string>("");
  const [encryptedObject, setEncryptedObject] = useState<CoFheInItem | null>(null);

  // Swap loading state
  const [isSwapLoading, setIsSwapLoading] = useState(false);

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Local encryption loading state
  const [isEncryptionLoading, setIsEncryptionLoading] = useState(false);

  // Store toast ID to replace previous notifications
  const insufficientBalanceToastIdRef = useRef<string | null>(null);

  const { address } = useAccount();
  const { isEncryptingInput, onEncryptInput } = useEncryptInput();

  // Custom hooks
  const marketOrderStatus = useMarketOrderStatus();
  const tokenBalances = useTokenBalances();
  const quoteData = useQuoteData(fromToken, toToken, setToToken);
  const asyncOrders = useAsyncOrders();

  // Token allowance check for market orders (only when there's a value)
  const formattedAmount = fromToken.value && Number(fromToken.value) > 0 ? parseUnits(fromToken.value, 18) : 0n;

  const tokenAllowance = useTokenAllowance(
    fromToken.symbol as "CPH" | "MSK",
    formattedAmount,
    activeTab === "market" ? "market" : "swap",
  );

  // Auto-close approval modal when approval is successful
  useEffect(() => {
    if (tokenAllowance.hasEnoughAllowance && showApprovalModal) {
      setShowApprovalModal(false);
    }
  }, [tokenAllowance.hasEnoughAllowance, showApprovalModal]);

  // Move order to background tracking after completion
  const moveToAsyncTracking = () => {
    if (asyncOrders.hasOrder(marketOrderStatus.transactionHash)) {
      console.log(`Already added order ${marketOrderStatus.transactionHash} to execution queue`);
      return;
    }

    asyncOrders.addAsyncOrder({
      id: marketOrderStatus.transactionHash,
      amount: fromToken.value,
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      timestamp: Date.now(),
      encryptedValue: marketOrderStatus.encryptedValue!,
    });

    // Keep transaction status visible - don't reset

    // Reset order state to allow placing new orders
    setIsOrderEncrypted(false);
    setPreEncryptedValue("");
    setEncryptedObject(null);
    setFromToken(prev => ({ ...prev, value: "" }));
  };

  useMarketOrderEvents({
    transactionHash: marketOrderStatus.transactionHash,
    encryptedValue: marketOrderStatus.encryptedValue,
    isProcessingOrder: marketOrderStatus.isProcessingOrder,
    address,
    confirmationStep: marketOrderStatus.confirmationStep,
    setEncryptedValue: marketOrderStatus.setEncryptedValue,
    setConfirmationStep: marketOrderStatus.setConfirmationStep,
    setDecryptionStep: marketOrderStatus.setDecryptionStep,
    setSettlementStep: marketOrderStatus.setSettlementStep,
    setManualDecryptionStatus: marketOrderStatus.setManualDecryptionStatus,
    updateOrderStatus: asyncOrders.updateOrderStatus,
    updateOrderStatusByHandle: asyncOrders.updateOrderStatusByHandle,
  });

  // Monitor async orders for settlement events
  useAsyncOrderEvents({
    asyncOrders: asyncOrders.asyncOrders,
    updateOrderStatus: asyncOrders.updateOrderStatus,
  });

  const businessLogic = useBusinessLogic({
    fromToken,
    toToken,
    activeTab,
    isPending: false,
    inputEncryptionDisabled: false,
    isQuoteLoading: quoteData.isQuoteLoading,
    isEncryptingInput,
    isProcessingOrder: marketOrderStatus.isProcessingOrder,
    isSwapLoading,
    encryptedObject: activeTab === "market" ? encryptedObject : null,
    manualDecryptionStatus: marketOrderStatus.manualDecryptionStatus,
    decryptionStep: marketOrderStatus.decryptionStep,
    setIsProcessingOrder: marketOrderStatus.setIsProcessingOrder,
    setConfirmationStep: marketOrderStatus.setConfirmationStep,
    setDecryptionStep: marketOrderStatus.setDecryptionStep,
    setSettlementStep: marketOrderStatus.setSettlementStep,
    setTransactionHash: marketOrderStatus.setTransactionHash,
    moveToAsyncTracking,
    setIsSwapLoading,
    updateOrderStatus: asyncOrders.updateOrderStatus,
    updateOrderStatusByHandle: asyncOrders.updateOrderStatusByHandle,
    refetchAllBalances: tokenBalances.refetchAllBalances,
  });

  // Handlers
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Reset encryption state when switching tabs
    setIsOrderEncrypted(false);
    setPreEncryptedValue("");
    setEncryptedObject(null);
    if (!marketOrderStatus.isProcessingOrder) {
      marketOrderStatus.resetTransactionStatus();
    }
  };

  const handleTokenSwap = () => {
    const tempFromSymbol = fromToken.symbol;
    const tempToSymbol = toToken.symbol;

    setFromToken(prev => ({ ...prev, symbol: tempToSymbol }));
    setToToken(prev => ({ ...prev, symbol: tempFromSymbol }));

    // Reset encryption state when swapping tokens
    setIsOrderEncrypted(false);
    setPreEncryptedValue("");
    setEncryptedObject(null);
  };

  const handleFromTokenChange = (value: string) => {
    const decimalIndex = value.indexOf(".");
    if (decimalIndex !== -1 && value.length - decimalIndex - 1 > 18) {
      value = value.substring(0, decimalIndex + 19);
    }

    const regex = /^$|^\d+(\.\d{0,18})?$/;
    if (regex.test(value) && (value === "" || Number(value) >= 0)) {
      setFromToken(prev => ({ ...prev, value }));

      // Reset encryption state when amount changes
      if (isOrderEncrypted && value !== preEncryptedValue) {
        setIsOrderEncrypted(false);
        setPreEncryptedValue("");
        setEncryptedObject(null);
      }
    }
  };

  // New handler for encryption step
  const handleEncryptOrder = useCallback(async () => {
    if (!fromToken.value || Number(fromToken.value) === 0) {
      return;
    }

    // Set loading state and never change it until encryption is complete
    setIsEncryptionLoading(true);

    // Store the current values we need
    const currentValue = fromToken.value;

    try {
      // Small delay to ensure UI renders the loading state
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Reset transaction status for new order
      marketOrderStatus.resetTransactionStatus();

      // Store the value that was encrypted
      setPreEncryptedValue(currentValue);

      // Call the encryption function
      const formattedInput = parseUnits(currentValue, 18);
      const encryptedResult = await onEncryptInput(FheTypes.Uint128, formattedInput);

      if (encryptedResult) {
        console.log("Encrypted result structure:", encryptedResult);
        console.log("Encrypted result keys:", Object.keys(encryptedResult));

        // Store the complete encrypted object for later use
        setEncryptedObject(encryptedResult);
        // Set the encrypted value in the market order status - store the ctHash as bigint
        marketOrderStatus.setEncryptedValue(BigInt(encryptedResult.ctHash));
        // Mark as encrypted
        setIsOrderEncrypted(true);
      }
    } catch (error) {
      console.error("Encryption failed:", error);
    } finally {
      // Only reset loading state at the very end
      setIsEncryptionLoading(false);
    }
  }, [fromToken.value, onEncryptInput, marketOrderStatus]);

  // Get current tab configuration first
  const currentTabConfig = TABS.find(tab => tab.id === activeTab);

  // Check if user has insufficient balance using raw bigint values for accuracy
  const currentFormattedBalance =
    fromToken.symbol === "CPH" ? tokenBalances.cphFormattedBalance : tokenBalances.mskFormattedBalance;
  const currentRawBalance = fromToken.symbol === "CPH" ? tokenBalances.cphRawBalance : tokenBalances.mskRawBalance;

  const hasInsufficientBalance = !!(
    fromToken.value &&
    Number(fromToken.value) > 0 &&
    (() => {
      try {
        const requiredAmount = parseUnits(fromToken.value, 18);
        return currentRawBalance < requiredAmount;
      } catch {
        return false; // Invalid input, don't show error
      }
    })()
  );

  // Show toast notification for insufficient balance
  useEffect(() => {
    if (hasInsufficientBalance && fromToken.value && Number(fromToken.value) > 0) {
      // Remove previous toast if it exists
      if (insufficientBalanceToastIdRef.current) {
        notification.remove(insufficientBalanceToastIdRef.current);
      }

      // Show new toast and store its ID
      const toastId = notification.warning(
        <div>
          <div className="font-medium">Insufficient {fromToken.symbol} Balance</div>
          <div className="text-sm mt-1">
            You need {fromToken.value} {fromToken.symbol} but only have {currentFormattedBalance} {fromToken.symbol}.
          </div>
          <div className="text-sm mt-1 text-blue-600 dark:text-blue-400">
            💡 Visit the <strong>Faucet</strong> tab to mint more tokens
          </div>
        </div>,
        { duration: 4000 },
      );

      insufficientBalanceToastIdRef.current = toastId;
    } else {
      // Remove toast when balance becomes sufficient
      if (insufficientBalanceToastIdRef.current) {
        notification.remove(insufficientBalanceToastIdRef.current);
        insufficientBalanceToastIdRef.current = null;
      }
    }
  }, [hasInsufficientBalance, fromToken.value, fromToken.symbol, currentFormattedBalance]);

  // Determine button text and handler based on state
  const buttonConfig = useMemo(() => {
    if (activeTab !== "market") {
      // Check allowance for swaps too
      const hasInsufficientAllowance = !tokenAllowance.hasEnoughAllowance && formattedAmount > 0n;

      return {
        text: hasInsufficientBalance
          ? "Insufficient Balance"
          : hasInsufficientAllowance
            ? "Approve Tokens"
            : isSwapLoading
              ? "Swapping..."
              : currentTabConfig?.buttonText || "Submit",
        onClick: hasInsufficientBalance
          ? () => {}
          : hasInsufficientAllowance
            ? () => setShowApprovalModal(true)
            : businessLogic.handleSubmit,
        disabled: businessLogic.isSubmitDisabled || isSwapLoading || hasInsufficientBalance,
        isLoading: isSwapLoading,
      };
    }

    // Market order flow - prioritize our local loading state
    if (isEncryptionLoading) {
      return {
        text: "Encrypting...",
        onClick: () => {},
        disabled: true,
        isLoading: true,
      };
    }

    if (isEncryptingInput) {
      return {
        text: "Encrypting...",
        onClick: () => {},
        disabled: true,
        isLoading: true,
      };
    }

    if (!isOrderEncrypted) {
      const hasInsufficientAllowance = !tokenAllowance.hasEnoughAllowance && formattedAmount > 0n;

      return {
        text: hasInsufficientBalance
          ? "Insufficient Balance"
          : hasInsufficientAllowance
            ? "Approve Tokens"
            : "Encrypt Order",
        onClick: hasInsufficientBalance
          ? () => {}
          : hasInsufficientAllowance
            ? () => setShowApprovalModal(true)
            : handleEncryptOrder,
        disabled: !fromToken.value || Number(fromToken.value) === 0 || hasInsufficientBalance,
        isLoading: false,
      };
    }

    return {
      text: "Place Market Order",
      onClick: businessLogic.handleSubmit,
      disabled: businessLogic.isSubmitDisabled,
      isLoading: marketOrderStatus.isProcessingOrder,
    };
  }, [
    activeTab,
    currentTabConfig,
    isSwapLoading,
    businessLogic.handleSubmit,
    businessLogic.isSubmitDisabled,
    isEncryptingInput,
    isEncryptionLoading,
    isOrderEncrypted,
    tokenAllowance.hasEnoughAllowance,
    formattedAmount,
    fromToken.value,
    handleEncryptOrder,
    marketOrderStatus.isProcessingOrder,
    hasInsufficientBalance,
  ]);

  // Ensure button always has valid config
  const safeButtonConfig = {
    text: buttonConfig.text || "Loading...",
    onClick: buttonConfig.onClick || (() => {}),
    disabled: buttonConfig.disabled ?? true,
    isLoading: buttonConfig.isLoading ?? false,
  };

  return (
    <div className="max-w-md w-full mx-auto mt-10 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6 space-y-6">
      <TabSelector tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="space-y-4">
        <TokenInput
          token={fromToken}
          placeholder="0.0"
          onChange={handleFromTokenChange}
          label="From"
          balance={fromToken.symbol === "CPH" ? tokenBalances.cphFormattedBalance : tokenBalances.mskFormattedBalance}
          hasError={hasInsufficientBalance}
        />

        <SwapButton onClick={handleTokenSwap} disabled={isOrderEncrypted} />

        <TokenInput
          token={toToken}
          placeholder="0.0"
          onChange={() => {}}
          label="To"
          readOnly={true}
          isLoading={quoteData.loadingQuote}
          balance={toToken.symbol === "CPH" ? tokenBalances.cphFormattedBalance : tokenBalances.mskFormattedBalance}
          hasError={quoteData.hasQuoteError}
          errorMessage={
            quoteData.hasQuoteError
              ? quoteData.isTimeout
                ? "Quote timeout - try a smaller amount"
                : "Error fetching quote"
              : undefined
          }
        />

        {/* Encrypted Value Display */}
        {activeTab === "market" && isOrderEncrypted && marketOrderStatus.encryptedValue && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Order Encrypted</span>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Original Amount: {preEncryptedValue} {fromToken.symbol}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Encrypted Value:</div>
              <div className="p-2 bg-gray-100 dark:bg-neutral-800 rounded text-xs font-mono break-all text-gray-800 dark:text-gray-200">
                {marketOrderStatus.encryptedValue.toString()}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(marketOrderStatus.encryptedValue?.toString() || "")}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Copy encrypted value
              </button>
            </div>
          </div>
        )}
      </div>

      <SubmitButton
        text={safeButtonConfig.text}
        onClick={safeButtonConfig.onClick}
        disabled={safeButtonConfig.disabled}
        isLoading={safeButtonConfig.isLoading}
      />

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={showApprovalModal}
        tokenSymbol={fromToken.symbol as "CPH" | "MSK"}
        requiredAmount={formattedAmount}
        currentAllowance={tokenAllowance.currentAllowance}
        onApprove={unlimited => {
          tokenAllowance.approve(unlimited);
        }}
        onClose={() => setShowApprovalModal(false)}
        isApproving={tokenAllowance.isApproving}
      />

      {activeTab === "market" && (
        <TransactionGuide title="Market Order Progress" steps={marketOrderStatus.marketOrderSteps} />
      )}

      <AsyncOrderStatus orders={asyncOrders.asyncOrders} />
    </div>
  );
}
