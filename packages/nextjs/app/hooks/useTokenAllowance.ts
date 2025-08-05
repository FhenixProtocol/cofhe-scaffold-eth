import { useEffect, useState } from "react";
import { CIPHER_TOKEN, MARKET_ORDER_HOOK, MASK_TOKEN, POOL_SWAP } from "../constants/Constants";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

// Standard ERC20 ABI for allowance and approve functions
const ERC20_ABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function useTokenAllowance(
  tokenSymbol: "CPH" | "MSK",
  formattedAmount: bigint,
  spenderType: "market" | "swap" = "market",
) {
  const { address } = useAccount();
  const [hasEnoughAllowance, setHasEnoughAllowance] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // Get token contract address based on symbol
  const tokenAddress = tokenSymbol === "CPH" ? CIPHER_TOKEN : MASK_TOKEN;

  // Get spender address based on type
  const spenderAddress = spenderType === "market" ? MARKET_ORDER_HOOK : POOL_SWAP;

  // Contract write hook for approval
  const { writeContract, data: approveHash, error: approveError, isPending: approveIsPending } = useWriteContract();

  // Wait for approval transaction
  const {
    isLoading: approveIsConfirming,
    isSuccess: approveIsConfirmed,
    error: approveReceiptError,
  } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Read current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, spenderAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!address && formattedAmount > 0n,
    },
  });

  // Check if allowance is sufficient whenever allowance or formattedAmount changes
  useEffect(() => {
    if (!allowance || formattedAmount === 0n) {
      setHasEnoughAllowance(false);
      return;
    }

    try {
      setIsLoading(true);
      const currentAllowance = BigInt(allowance.toString());

      const sufficient = currentAllowance >= formattedAmount;
      setHasEnoughAllowance(sufficient);

      console.log(`Token allowance check for ${tokenSymbol}:`, {
        requiredAmount: formattedAmount.toString(),
        currentAllowance: currentAllowance.toString(),
        sufficient,
      });
    } catch (error) {
      console.error("Error checking token allowance:", error);
      setHasEnoughAllowance(false);
    } finally {
      setIsLoading(false);
    }
  }, [allowance, formattedAmount, tokenSymbol]);

  // Handle approval state changes
  useEffect(() => {
    if (approveIsPending || approveIsConfirming) {
      setIsApproving(true);
    } else if (approveIsConfirmed) {
      setIsApproving(false);
      // Refetch allowance after successful approval
      refetchAllowance();
    } else if (approveError || approveReceiptError) {
      setIsApproving(false);
      console.error("Approval failed:", approveError || approveReceiptError);
    }
  }, [approveIsPending, approveIsConfirming, approveIsConfirmed, approveError, approveReceiptError, refetchAllowance]);

  // Approve function
  const approve = async (unlimited: boolean = false) => {
    if (!address) {
      console.error("No wallet connected");
      return;
    }

    try {
      const approvalAmount = unlimited
        ? BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff") // Max uint256
        : formattedAmount;

      await writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spenderAddress as `0x${string}`, approvalAmount],
      });
    } catch (error) {
      console.error("Failed to initiate approval:", error);
      setIsApproving(false);
    }
  };

  return {
    hasEnoughAllowance,
    isLoading,
    currentAllowance: allowance ? BigInt(allowance.toString()) : 0n,
    refetchAllowance,
    approve,
    isApproving,
    approveHash,
    approveError: approveError || approveReceiptError,
  };
}
