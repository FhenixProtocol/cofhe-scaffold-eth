import { useTokenBalances } from "../../hooks/useTokenBalances";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";

interface GettingStartedStepProps {
  onFaucetClaim: () => void;
  isFaucetLoading: boolean;
}

export function GettingStartedStep({ onFaucetClaim, isFaucetLoading }: GettingStartedStepProps) {
  const { address } = useAccount();
  const { cphFormattedBalance, mskFormattedBalance, cphRawBalance, mskRawBalance } = useTokenBalances();

  const hasMinimumBalance = cphRawBalance > parseUnits("0", 18) || mskRawBalance > parseUnits("0", 18);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-3">Get Test Tokens</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          To use the FHE trading system, you&apos;ll need test tokens. Click the button below to mint tokens to your
          wallet.
        </p>
      </div>

      {/* Current Balance Display */}
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="font-medium mb-2">Your Current Balance:</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-500">CPH</div>
            <div className="text-lg font-mono">{cphFormattedBalance}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500">MSK</div>
            <div className="text-lg font-mono">{mskFormattedBalance}</div>
          </div>
        </div>
      </div>

      {/* Faucet Button */}
      <div className="text-center">
        <button
          onClick={onFaucetClaim}
          disabled={isFaucetLoading || !address}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            isFaucetLoading || !address
              ? "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
          }`}
        >
          {isFaucetLoading ? "Minting Tokens..." : "🚰 Claim Test Tokens"}
        </button>
        {!address && <p className="text-sm text-red-600 dark:text-red-400 mt-2">Please connect your wallet first</p>}
      </div>

      {/* Success State */}
      {hasMinimumBalance && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
          <div className="text-green-600 dark:text-green-400 font-medium">
            ✅ Great! You have test tokens in your wallet. You can proceed to the next step.
          </div>
        </div>
      )}
    </div>
  );
}
