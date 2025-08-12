import { useEffect, useState } from "react";
import { CIPHER_TOKEN, MASK_TOKEN } from "./constants/Constants";
import { tokenAbi } from "./constants/Token";
import { useTokenBalances } from "./hooks/useTokenBalances";
import { parseUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";

export function TokenFaucet() {
  const [mintAmount, setMintAmount] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState<"CPH" | "MSK">("CPH");
  const [burnError, setBurnError] = useState<string | null>(null);

  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const tokenBalances = useTokenBalances();

  // Get current balance for validation
  const currentBalance = selectedToken === "CPH" ? tokenBalances.cphRawBalance : tokenBalances.mskRawBalance;

  // Validate burn amount in real-time
  useEffect(() => {
    if (!burnAmount || !currentBalance) {
      setBurnError(null);
      return;
    }

    try {
      const burnAmountWei = parseUnits(burnAmount, 18);
      if (currentBalance < burnAmountWei) {
        const formattedBalance =
          selectedToken === "CPH" ? tokenBalances.cphFormattedBalance : tokenBalances.mskFormattedBalance;
        setBurnError(`Insufficient balance. You have ${formattedBalance} ${selectedToken}`);
      } else {
        setBurnError(null);
      }
    } catch {
      setBurnError("Invalid amount format");
    }
  }, [burnAmount, currentBalance, selectedToken, tokenBalances.cphFormattedBalance, tokenBalances.mskFormattedBalance]);

  // Clear errors when switching tokens
  useEffect(() => {
    setBurnError(null);
  }, [selectedToken]);

  const handleMint = async () => {
    if (!mintAmount || !address) return;

    try {
      await writeContractAsync({
        abi: tokenAbi, // You'll need the mint function in your ABI
        address: selectedToken === "CPH" ? CIPHER_TOKEN : MASK_TOKEN,
        functionName: "mint",
        args: [parseUnits(mintAmount, 18)],
      });
      setMintAmount("");

      // Refetch balances after successful mint
      try {
        await tokenBalances.refetchTokenBalance(selectedToken);
      } catch (error) {
        console.error(`Failed to refresh ${selectedToken} balance after mint:`, error);
      }
    } catch (error) {
      console.error("Mint failed:", error);
    }
  };

  const handleBurn = async () => {
    if (!burnAmount || burnError) return;

    try {
      const burnAmountWei = parseUnits(burnAmount, 18);

      await writeContractAsync({
        abi: tokenAbi,
        address: selectedToken === "CPH" ? CIPHER_TOKEN : MASK_TOKEN,
        functionName: "burn",
        args: [burnAmountWei],
      });
      setBurnAmount("");
      setBurnError(null);

      // Refetch balances after successful burn
      try {
        await tokenBalances.refetchTokenBalance(selectedToken);
      } catch (error) {
        console.error(`Failed to refresh ${selectedToken} balance after burn:`, error);
      }
    } catch (error) {
      console.error("Burn failed:", error);
      setBurnError("Transaction failed. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6 space-y-6">
      <h2 className="text-xl font-bold text-center mb-6">Token Faucet</h2>

      {/* Token Selection */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setSelectedToken("CPH")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            selectedToken === "CPH"
              ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
          }`}
        >
          CPH
        </button>
        <button
          onClick={() => setSelectedToken("MSK")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            selectedToken === "MSK"
              ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
          }`}
        >
          MSK
        </button>
      </div>

      {/* Balance Display */}
      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-4 text-center">
        <h3 className="text-lg font-semibold mb-2">Your Balance</h3>
        <p className="text-2xl font-bold">
          {selectedToken === "CPH" ? tokenBalances.cphFormattedBalance : tokenBalances.mskFormattedBalance}{" "}
          {selectedToken}
        </p>
      </div>

      {/* Mint Section */}
      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-4">Mint Tokens</h3>
        <div className="space-y-3">
          <input
            type="number"
            placeholder="Amount to mint"
            value={mintAmount}
            onChange={e => setMintAmount(e.target.value)}
            className="w-full bg-transparent border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 outline-none"
          />
          <button
            onClick={handleMint}
            disabled={!mintAmount || !address || isPending}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-neutral-400 text-white py-2 rounded-lg transition"
          >
            {isPending ? "Minting..." : `Mint ${selectedToken}`}
          </button>
        </div>
      </div>

      {/* Burn Section */}
      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-4">Burn Tokens</h3>
        <div className="space-y-3">
          <input
            type="number"
            placeholder="Amount to burn"
            value={burnAmount}
            onChange={e => setBurnAmount(e.target.value)}
            className={`w-full bg-transparent border rounded-lg px-3 py-2 outline-none ${
              burnError
                ? "border-red-500 focus:border-red-500"
                : "border-neutral-300 dark:border-neutral-600 focus:border-blue-500"
            }`}
          />
          {burnError && <p className="text-red-500 text-sm mt-1">{burnError}</p>}
          <button
            onClick={handleBurn}
            disabled={!burnAmount || isPending || !!burnError}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-neutral-400 text-white py-2 rounded-lg transition"
          >
            {isPending ? "Burning..." : `Burn ${selectedToken}`}
          </button>
        </div>
      </div>
    </div>
  );
}
