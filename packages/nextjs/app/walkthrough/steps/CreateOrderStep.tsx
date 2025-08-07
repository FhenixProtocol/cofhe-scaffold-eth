import { HashLink } from "../../HashLink";
import { TxGuideStepState } from "../../TransactionGuide";
import { CoFheInItem } from "cofhejs/web";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

interface CreateOrderStepProps {
  amount: string;
  selectedToken: "CPH" | "MSK";
  encryptedObject: CoFheInItem | null;
  isCreatingOrder: boolean;
  confirmationStep: TxGuideStepState;
  transactionHash: string;
  onCreateOrder: () => void;
}

export function CreateOrderStep({
  amount,
  selectedToken,
  encryptedObject,
  isCreatingOrder,
  confirmationStep,
  transactionHash,
  onCreateOrder,
}: CreateOrderStepProps) {
  const { targetNetwork } = useTargetNetwork();
  const isOrderCreated = confirmationStep === TxGuideStepState.Success && transactionHash;
  const hasError = confirmationStep === TxGuideStepState.Error;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-3">Submit Encrypted Market Order</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Now we&apos;ll submit your encrypted market order to the blockchain. This order will be queued until it can be
          executed at the best available price.
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium mb-3">Order Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Amount:</span>
            <span className="font-mono">
              {amount} {selectedToken}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Type:</span>
            <span>Encrypted Market Order</span>
          </div>
          <div className="flex justify-between">
            <span>Privacy:</span>
            <span className="text-green-600">🔒 Fully Encrypted</span>
          </div>
        </div>
      </div>

      {/* Create Order Action */}
      {!isOrderCreated && !hasError && (
        <div className="text-center">
          <button
            onClick={onCreateOrder}
            disabled={isCreatingOrder || !encryptedObject}
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              isCreatingOrder || !encryptedObject
                ? "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
            }`}
          >
            {isCreatingOrder ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting Order...
              </div>
            ) : (
              "📝 Submit Market Order"
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2">This will create a transaction on the blockchain</p>
        </div>
      )}

      {/* Success State */}
      {isOrderCreated && (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 text-green-600 dark:text-green-400">✅</div>
              <span className="text-green-600 dark:text-green-400 font-medium">Order Submitted Successfully!</span>
            </div>
            <p className="text-green-700 dark:text-green-300 text-sm">
              Your encrypted market order has been submitted to the blockchain and is now in the queue.
            </p>
          </div>

          {/* Transaction Hash */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">Transaction Details</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Transaction:</span>
                <HashLink
                  hash={transactionHash}
                  href={getBlockExplorerTxLink(targetNetwork.id, transactionHash)}
                  copyable={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 text-red-600 dark:text-red-400">❌</div>
            <span className="text-red-600 dark:text-red-400 font-medium">Order Submission Failed</span>
          </div>
          <p className="text-red-700 dark:text-red-300 text-sm mb-3">
            There was an error submitting your order. Please try again.
          </p>
          <button
            onClick={onCreateOrder}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
