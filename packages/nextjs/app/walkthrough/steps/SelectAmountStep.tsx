import { useEffect, useState } from "react";
import { useTokenAllowance } from "../../hooks/useTokenAllowance";
import { useTokenBalances } from "../../hooks/useTokenBalances";
import { parseUnits } from "viem";

interface SelectAmountStepProps {
  selectedToken: "CPH" | "MSK";
  amount: string;
  onTokenChange: (token: "CPH" | "MSK") => void;
  onAmountChange: (amount: string) => void;
  onApprove: () => void;
  isApproving: boolean;
}

export function SelectAmountStep({
  selectedToken,
  amount,
  onTokenChange,
  onAmountChange,
  onApprove,
  isApproving,
}: SelectAmountStepProps) {
  const { cphFormattedBalance, mskFormattedBalance, cphRawBalance, mskRawBalance } = useTokenBalances();
  const [inputError, setInputError] = useState<string | null>(null);

  const currentBalance = selectedToken === "CPH" ? cphFormattedBalance : mskFormattedBalance;
  const currentRawBalance = selectedToken === "CPH" ? cphRawBalance : mskRawBalance;

  const formattedAmount = amount && Number(amount) > 0 ? parseUnits(amount, 18) : 0n;

  const { hasEnoughAllowance, currentAllowance } = useTokenAllowance(selectedToken, formattedAmount, "market");

  // Validate input
  useEffect(() => {
    if (!amount || Number(amount) === 0) {
      setInputError(null);
      return;
    }

    try {
      const requiredAmount = parseUnits(amount, 18);
      if (currentRawBalance < requiredAmount) {
        setInputError(`Insufficient balance. You need ${amount} ${selectedToken} but only have ${currentBalance}`);
      } else {
        setInputError(null);
      }
    } catch {
      setInputError("Invalid amount format");
    }
  }, [amount, selectedToken, currentBalance, currentRawBalance]);

  const hasInsufficientBalance = inputError?.includes("Insufficient balance");
  const hasInsufficientAllowance = !hasEnoughAllowance && formattedAmount > 0n;
  const canProceed = amount && Number(amount) > 0 && !hasInsufficientBalance && hasEnoughAllowance;

  const handleAmountChange = (value: string) => {
    // Allow decimal input with up to 18 decimal places
    const decimalIndex = value.indexOf(".");
    if (decimalIndex !== -1 && value.length - decimalIndex - 1 > 18) {
      value = value.substring(0, decimalIndex + 19);
    }

    const regex = /^$|^\d+(\.\d{0,18})?$/;
    if (regex.test(value) && (value === "" || Number(value) >= 0)) {
      onAmountChange(value);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-3">Choose Amount to Trade</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Select which token you want to trade and enter the amount. We&apos;ll need to approve the contract to spend
          your tokens.
        </p>
      </div>

      {/* Token Selection */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Token</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onTokenChange("CPH")}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedToken === "CPH"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="text-center">
              <div className="font-semibold">CPH</div>
              <div className="text-sm text-gray-500">Balance: {cphFormattedBalance}</div>
            </div>
          </button>
          <button
            onClick={() => onTokenChange("MSK")}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedToken === "MSK"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="text-center">
              <div className="font-semibold">MSK</div>
              <div className="text-sm text-gray-500">Balance: {mskFormattedBalance}</div>
            </div>
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount to Trade</label>
        <div className="relative">
          <input
            type="text"
            value={amount}
            onChange={e => handleAmountChange(e.target.value)}
            placeholder="0.0"
            className={`w-full px-4 py-3 text-lg border rounded-lg bg-white dark:bg-gray-800 ${
              inputError
                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
            } focus:ring-1 focus:outline-none`}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">{selectedToken}</div>
        </div>
        {inputError && <p className="text-red-600 dark:text-red-400 text-sm">{inputError}</p>}
      </div>

      {/* Allowance Check & Approval */}
      {formattedAmount > 0n && !hasInsufficientBalance && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Current Allowance:</span>
            <span className="font-mono">
              {currentAllowance.toString()} {selectedToken}
            </span>
          </div>

          {hasInsufficientAllowance && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm mb-3">
                You need to approve the contract to spend your {selectedToken} tokens before proceeding.
              </p>
              <button
                onClick={onApprove}
                disabled={isApproving}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
                  isApproving
                    ? "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                    : "bg-yellow-600 hover:bg-yellow-700 text-white"
                }`}
              >
                {isApproving ? "Approving..." : `Approve ${selectedToken}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Success State */}
      {canProceed && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
          <div className="text-green-600 dark:text-green-400 font-medium">
            ✅ Ready to proceed! Amount: {amount} {selectedToken}
          </div>
        </div>
      )}
    </div>
  );
}
