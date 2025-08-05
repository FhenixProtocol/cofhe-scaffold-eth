import { useState } from "react";
import { CIPHER_TOKEN, MASK_TOKEN } from "./constants/Constants";
import { tokenAbi } from "./constants/Token";
import { formatUnits, parseUnits } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

const formatBalance = (balance: bigint | undefined): string => {
  if (!balance) return "0";
  const readable = formatUnits(balance, 18);
  const num = Number(readable);

  if (num >= 999 * 1e12) return ">999T";
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  if (num >= 1) return num.toFixed(2);
  if (num >= 0.01) return num.toFixed(4);
  return num.toExponential(2);
};

export function TokenFaucet() {
  const [mintAmount, setMintAmount] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState<"CPH" | "MSK">("CPH");

  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  // Fetch balances
  const { data: cphBalance } = useReadContract({
    abi: tokenAbi,
    address: CIPHER_TOKEN,
    functionName: "balanceOf",
    args: [address!],
    query: {
      enabled: !!address,
    },
  });

  const { data: mskBalance } = useReadContract({
    abi: tokenAbi,
    address: MASK_TOKEN,
    functionName: "balanceOf",
    args: [address!],
    query: {
      enabled: !!address,
    },
  });

  const formattedCphBalance = formatBalance(cphBalance);
  const formattedMskBalance = formatBalance(mskBalance);

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
    } catch (error) {
      console.error("Mint failed:", error);
    }
  };

  const handleBurn = async () => {
    if (!burnAmount) return;

    try {
      await writeContractAsync({
        abi: tokenAbi,
        address: selectedToken === "CPH" ? CIPHER_TOKEN : MASK_TOKEN,
        functionName: "burn",
        args: [parseUnits(burnAmount, 18)],
      });
      setBurnAmount("");
    } catch (error) {
      console.error("Burn failed:", error);
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
          {selectedToken === "CPH" ? formattedCphBalance : formattedMskBalance} {selectedToken}
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
            className="w-full bg-transparent border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 outline-none"
          />
          <button
            onClick={handleBurn}
            disabled={!burnAmount || isPending}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-neutral-400 text-white py-2 rounded-lg transition"
          >
            {isPending ? "Burning..." : `Burn ${selectedToken}`}
          </button>
        </div>
      </div>
    </div>
  );
}
