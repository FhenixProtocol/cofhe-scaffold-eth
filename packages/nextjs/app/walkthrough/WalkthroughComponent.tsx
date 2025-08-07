import { useCallback, useState } from "react";
import { HashLink } from "../HashLink";
import { TxGuideStepState } from "../TransactionGuide";
import { MARKET_ORDER_HOOK, POOL_KEY } from "../constants/Constants";
import { MarketOrderAbi } from "../constants/MarketOrder";
import { useEncryptInput } from "../hooks/useEncryptInput";
import { useMarketOrderEvents } from "../hooks/useMarketOrderEvents";
import { useMarketOrderStatus } from "../hooks/useMarketOrderStatus";
import { useSwapTransactionMonitor } from "../hooks/useSwapTransactionMonitor";
import { useTokenAllowance } from "../hooks/useTokenAllowance";
import { useTokenBalances } from "../hooks/useTokenBalances";
import { PageIndicator } from "./PageIndicator";
import { WalkthroughStep } from "./WalkthroughStep";
import { useFaucet } from "./hooks/useFaucet";
import { CreateOrderStep } from "./steps/CreateOrderStep";
import { EncryptInputStep } from "./steps/EncryptInputStep";
import { GettingStartedStep } from "./steps/GettingStartedStep";
import { SelectAmountStep } from "./steps/SelectAmountStep";
import { CoFheInItem, FheTypes } from "cofhejs/web";
import { parseUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

const WALKTHROUGH_STEPS = [
  {
    id: "getting-started",
    title: "Welcome to FHE Trading",
    header: "Get Test Tokens",
    description:
      "Start by claiming test tokens from our faucet to experience private trading with Fully Homomorphic Encryption.",
  },
  {
    id: "select-amount",
    title: "Configure Trade",
    header: "Select Amount & Approve",
    description:
      "Set your trade parameters and grant the contract permission to access your tokens for the transaction.",
  },
  {
    id: "encrypt-input",
    title: "Privacy Layer",
    header: "Encrypt Your Trade Amount",
    description:
      "Protect your trading strategy by encrypting the amount, making it invisible to MEV bots and front-runners.",
  },
  {
    id: "create-order",
    title: "Blockchain Submission",
    header: "Create Encrypted Market Order",
    description: "Send your private order to the blockchain where it joins the queue for optimal execution timing.",
  },
  {
    id: "wait-decryption",
    title: "Processing Phase",
    header: "Order Decryption in Progress",
    description: "The network processes your encrypted order, revealing the amount only when execution is optimal.",
  },
  {
    id: "execute-order",
    title: "Trade Execution",
    header: "Trigger Order Settlement",
    description: "Complete your trade either automatically through pool activity or manually via force execution.",
  },
  {
    id: "view-transaction",
    title: "Success!",
    header: "Trade Summary",
    description: "Review your completed private trade and explore the transaction details to see FHE in action.",
  },
];

interface WalkthroughComponentProps {
  onFinish?: () => void;
}

export function WalkthroughComponent({ onFinish }: WalkthroughComponentProps = {}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedToken, setSelectedToken] = useState<"CPH" | "MSK">("CPH");
  const [amount, setAmount] = useState("");
  const [encryptedObject, setEncryptedObject] = useState<CoFheInItem | null>(null);
  const [forceExecutionTxHash, setForceExecutionTxHash] = useState<string>("");

  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { targetNetwork } = useTargetNetwork();
  const { cphRawBalance, mskRawBalance } = useTokenBalances();
  const { isEncryptingInput, onEncryptInput } = useEncryptInput();
  const marketOrderStatus = useMarketOrderStatus();
  const { claimTokens, isLoading: isFaucetLoading } = useFaucet();

  // Add market order events monitoring for decryption polling
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
    updateOrderStatus: () => {}, // Not needed for walkthrough
    updateOrderStatusByHandle: () => {}, // Not needed for walkthrough
  });

  // Monitor force execution transaction for settlement events
  useSwapTransactionMonitor({
    transactionHash: forceExecutionTxHash,
    userAddress: address,
    onOrderSettled: (handle: bigint) => {
      console.log("🎯 [WALKTHROUGH] Force execution completed, order settled:", handle);
      if (marketOrderStatus.encryptedValue && handle === marketOrderStatus.encryptedValue) {
        marketOrderStatus.setSettlementStep(TxGuideStepState.Success);
      }
    },
    onOrderFailed: (handle: bigint) => {
      console.log("❌ [WALKTHROUGH] Force execution failed for handle:", handle);
      if (marketOrderStatus.encryptedValue && handle === marketOrderStatus.encryptedValue) {
        marketOrderStatus.setSettlementStep(TxGuideStepState.Error);
      }
    },
  });

  const formattedAmount = amount && Number(amount) > 0 ? parseUnits(amount, 18) : 0n;
  const tokenAllowance = useTokenAllowance(selectedToken, formattedAmount, "market");

  // Step progression logic
  const canProceedFromStep = useCallback(
    (stepIndex: number): boolean => {
      switch (stepIndex) {
        case 0: // Getting started
          return cphRawBalance > 0n || mskRawBalance > 0n;
        case 1: // Select amount
          return !!amount && Number(amount) > 0 && !hasInsufficientBalance() && tokenAllowance.hasEnoughAllowance;
        case 2: // Encrypt input
          return !!encryptedObject;
        case 3: // Create order
          return marketOrderStatus.confirmationStep === TxGuideStepState.Success && !!marketOrderStatus.transactionHash;
        case 4: // Wait decryption
          return marketOrderStatus.manualDecryptionStatus === true;
        case 5: // Execute order
          return marketOrderStatus.settlementStep === TxGuideStepState.Success;
        case 6: // View transaction
          return true;
        default:
          return false;
      }
    },
    [amount, encryptedObject, cphRawBalance, mskRawBalance, tokenAllowance.hasEnoughAllowance, marketOrderStatus],
  );

  const hasInsufficientBalance = useCallback((): boolean => {
    if (!amount || Number(amount) === 0) return false;
    try {
      const requiredAmount = parseUnits(amount, 18);
      const currentBalance = selectedToken === "CPH" ? cphRawBalance : mskRawBalance;
      return currentBalance < requiredAmount;
    } catch {
      return true;
    }
  }, [amount, selectedToken, cphRawBalance, mskRawBalance]);

  // Handlers
  const handleFaucetClaim = async () => {
    await claimTokens("100");
  };

  const handleForceExecution = async () => {
    console.log("🔄 [WALKTHROUGH] Force execution triggered");
    console.log("Transaction hash:", marketOrderStatus.transactionHash);
    console.log("Encrypted value:", marketOrderStatus.encryptedValue);

    try {
      marketOrderStatus.setSettlementStep(TxGuideStepState.Loading);

      // Call flushOrder directly on the contract
      const txHash = await writeContractAsync({
        address: MARKET_ORDER_HOOK as `0x${string}`,
        abi: MarketOrderAbi,
        functionName: "flushOrder",
        args: [POOL_KEY],
      });

      console.log("🚀 [WALKTHROUGH] Force execution transaction submitted:", txHash);
      setForceExecutionTxHash(txHash);
    } catch (error) {
      console.error("❌ [WALKTHROUGH] Force execution failed:", error);
      marketOrderStatus.setSettlementStep(TxGuideStepState.Error);
    }
  };

  const handleEncrypt = async () => {
    if (!amount) return;

    try {
      const formattedInput = parseUnits(amount, 18);
      const encrypted = await onEncryptInput(FheTypes.Uint128, formattedInput);

      if (encrypted) {
        setEncryptedObject(encrypted);
        marketOrderStatus.setEncryptedValue(BigInt(encrypted.ctHash));
      }
    } catch (error) {
      console.error("Encryption failed:", error);
    }
  };

  const handleCreateOrder = async () => {
    if (!encryptedObject) return;

    try {
      marketOrderStatus.setIsProcessingOrder(true);
      marketOrderStatus.setConfirmationStep(TxGuideStepState.Loading);

      const zeroForOne = selectedToken === "CPH";

      const hash = await writeContractAsync({
        address: MARKET_ORDER_HOOK as `0x${string}`,
        abi: MarketOrderAbi,
        functionName: "placeMarketOrder",
        args: [POOL_KEY, zeroForOne, encryptedObject],
        gas: 1000000n,
      });

      marketOrderStatus.setTransactionHash(hash);
      marketOrderStatus.setConfirmationStep(TxGuideStepState.Success);
      // Keep isProcessingOrder true for the decryption polling to work
      // marketOrderStatus.setIsProcessingOrder(false);
    } catch (error) {
      console.error("Order creation failed:", error);
      marketOrderStatus.setConfirmationStep(TxGuideStepState.Error);
      marketOrderStatus.setIsProcessingOrder(false);
    }
  };

  const handleNext = () => {
    if (currentStep < WALKTHROUGH_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render step content
  const renderStepContent = () => {
    const step = WALKTHROUGH_STEPS[currentStep];

    switch (step.id) {
      case "getting-started":
        return <GettingStartedStep onFaucetClaim={handleFaucetClaim} isFaucetLoading={isFaucetLoading} />;
      case "select-amount":
        return (
          <SelectAmountStep
            selectedToken={selectedToken}
            amount={amount}
            onTokenChange={setSelectedToken}
            onAmountChange={setAmount}
            onApprove={() => tokenAllowance.approve(false)}
            isApproving={tokenAllowance.isApproving}
          />
        );
      case "encrypt-input":
        return (
          <EncryptInputStep
            amount={amount}
            selectedToken={selectedToken}
            isEncrypting={isEncryptingInput}
            encryptedObject={encryptedObject}
            onEncrypt={handleEncrypt}
          />
        );
      case "create-order":
        return (
          <CreateOrderStep
            amount={amount}
            selectedToken={selectedToken}
            encryptedObject={encryptedObject}
            isCreatingOrder={marketOrderStatus.isProcessingOrder}
            confirmationStep={marketOrderStatus.confirmationStep}
            transactionHash={marketOrderStatus.transactionHash}
            onCreateOrder={handleCreateOrder}
          />
        );
      case "wait-decryption":
        return (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-lg">
              This usually takes 1-2 minutes as the system securely processes your encrypted data.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <p>
                  Decryption Status:{" "}
                  {marketOrderStatus.manualDecryptionStatus === true ? "Complete ✅" : "In Progress..."}
                </p>
                <p>Decryption Step: {marketOrderStatus.decryptionStep}</p>
                {marketOrderStatus.transactionHash && (
                  <p>Polling Transaction: {marketOrderStatus.transactionHash.slice(0, 10)}...</p>
                )}
                {marketOrderStatus.encryptedValue && (
                  <p>Encrypted Handle: {marketOrderStatus.encryptedValue.toString().slice(0, 10)}...</p>
                )}
              </div>
            </div>
          </div>
        );
      case "execute-order":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🚀</div>
              <p className="text-gray-600 dark:text-gray-400">
                Your decrypted order is now live in the Uniswap V4 pool, waiting for the perfect moment to execute.
              </p>
            </div>

            {/* Explanation */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium mb-3">How Order Execution Works</h4>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>Your decrypted order is sitting in the Uniswap V4 pool</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>It will automatically execute when another user performs a swap</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>Or you can force execution manually using the button below</span>
                </div>
              </div>
            </div>

            {/* Settlement Status */}
            <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h4 className="font-medium mb-2">Execution Status</h4>
              <p className="text-sm">
                {marketOrderStatus.settlementStep === TxGuideStepState.Success ? (
                  <span className="text-green-600 dark:text-green-400">Complete ✅</span>
                ) : marketOrderStatus.settlementStep === TxGuideStepState.Loading ? (
                  <span className="text-blue-600 dark:text-blue-400">Processing...</span>
                ) : (
                  <span className="text-gray-600 dark:text-gray-400">Waiting for execution</span>
                )}
              </p>
            </div>

            {/* Force Execution Button */}
            {marketOrderStatus.settlementStep !== TxGuideStepState.Success && (
              <div className="text-center">
                <button
                  onClick={handleForceExecution}
                  disabled={marketOrderStatus.settlementStep === TxGuideStepState.Loading}
                  className={`px-8 py-3 rounded-lg font-medium transition-all ${
                    marketOrderStatus.settlementStep === TxGuideStepState.Loading
                      ? "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg"
                  }`}
                >
                  {marketOrderStatus.settlementStep === TxGuideStepState.Loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Executing Order...
                    </div>
                  ) : (
                    "⚡ Force Execute Order"
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2">This will trigger immediate execution of your market order</p>
              </div>
            )}

            {/* Success State */}
            {marketOrderStatus.settlementStep === TxGuideStepState.Success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 text-green-600 dark:text-green-400">✅</div>
                  <span className="text-green-600 dark:text-green-400 font-medium">Order Executed Successfully!</span>
                </div>
                <p className="text-green-700 dark:text-green-300 text-sm mb-3">
                  Your market order has been executed and the trade is complete.
                </p>

                {/* Force Execution Transaction Link */}
                {forceExecutionTxHash && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-700 dark:text-green-300">Force Execution Tx:</span>
                      <HashLink
                        hash={forceExecutionTxHash}
                        href={getBlockExplorerTxLink(targetNetwork.id, forceExecutionTxHash)}
                        copyable={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case "view-transaction":
        return (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-lg">Congratulations! You&apos;ve experienced the future of private DeFi trading.</p>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm">
                Throughout this entire process, your trading intentions remained completely hidden thanks to Fully
                Homomorphic Encryption technology.
              </p>
            </div>
            {marketOrderStatus.transactionHash && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3">Transaction Details</h4>
                <div className="space-y-2">
                  {/* Market Order Transaction */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Market Order:</span>
                    <HashLink
                      hash={marketOrderStatus.transactionHash}
                      href={getBlockExplorerTxLink(targetNetwork.id, marketOrderStatus.transactionHash)}
                      copyable={true}
                    />
                  </div>

                  {/* Force Execution Transaction (if available) */}
                  {forceExecutionTxHash && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Force Execution:</span>
                      <HashLink
                        hash={forceExecutionTxHash}
                        href={getBlockExplorerTxLink(targetNetwork.id, forceExecutionTxHash)}
                        copyable={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const currentStepConfig = WALKTHROUGH_STEPS[currentStep];
  const canProceed = canProceedFromStep(currentStep);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-8">
      <PageIndicator
        totalSteps={WALKTHROUGH_STEPS.length}
        currentStep={currentStep}
        stepTitles={WALKTHROUGH_STEPS.map(step => step.header)}
      />

      <WalkthroughStep
        title={currentStepConfig.title}
        header={currentStepConfig.header}
        description={currentStepConfig.description}
        canProceed={canProceed}
        isFirstStep={currentStep === 0}
        isLastStep={currentStep === WALKTHROUGH_STEPS.length - 1}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onFinish={onFinish}
      >
        {renderStepContent()}
      </WalkthroughStep>
    </div>
  );
}
