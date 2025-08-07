import { useState } from "react";
import { CIPHER_TOKEN, MASK_TOKEN } from "../../constants/Constants";
import { tokenAbi } from "../../constants/Token";
import { parseUnits } from "viem";
import { useAccount, useWriteContract } from "wagmi";

export function useFaucet() {
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const claimTokens = async (amount: string = "100") => {
    if (!address || !amount) return false;

    setIsLoading(true);

    try {
      const mintAmount = parseUnits(amount, 18);

      // Mint both CPH and MSK tokens
      await Promise.all([
        writeContractAsync({
          abi: tokenAbi,
          address: CIPHER_TOKEN,
          functionName: "mint",
          args: [mintAmount],
        }),
        writeContractAsync({
          abi: tokenAbi,
          address: MASK_TOKEN,
          functionName: "mint",
          args: [mintAmount],
        }),
      ]);

      return true;
    } catch (error) {
      console.error("Faucet claim failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    claimTokens,
    isLoading,
  };
}
