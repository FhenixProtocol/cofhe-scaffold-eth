import { CoFheInItem } from "cofhejs/web";

interface EncryptInputStepProps {
  amount: string;
  selectedToken: "CPH" | "MSK";
  isEncrypting: boolean;
  encryptedObject: CoFheInItem | null;
  onEncrypt: () => void;
}

export function EncryptInputStep({
  amount,
  selectedToken,
  isEncrypting,
  encryptedObject,
  onEncrypt,
}: EncryptInputStepProps) {
  const isEncrypted = !!encryptedObject;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-3">Encrypt Your Trade Amount</h3>
        <p className="text-gray-600 dark:text-gray-400">
          For privacy, we&apos;ll encrypt your trade amount using Fully Homomorphic Encryption (FHE). This keeps your
          trading intentions hidden from other users and MEV bots.
        </p>
      </div>

      {/* Trade Details */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium mb-2">Trade Details</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Amount:</span>
            <span className="font-mono">
              {amount} {selectedToken}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Action:</span>
            <span>Market Order</span>
          </div>
        </div>
      </div>

      {/* Encryption Explanation */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">🔒 Why Encrypt?</h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>Prevents front-running by hiding your trade size</li>
          <li>Protects against MEV extraction</li>
          <li>Maintains privacy until execution</li>
          <li>Uses cutting-edge FHE technology</li>
        </ul>
      </div>

      {/* Encryption Action */}
      {!isEncrypted ? (
        <div className="text-center">
          <button
            onClick={onEncrypt}
            disabled={isEncrypting || !amount}
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              isEncrypting || !amount
                ? "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg"
            }`}
          >
            {isEncrypting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Encrypting...
              </div>
            ) : (
              "🔐 Encrypt Trade Amount"
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Success State */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 text-green-600 dark:text-green-400">🔒</div>
              <span className="text-green-600 dark:text-green-400 font-medium">
                Trade Amount Encrypted Successfully!
              </span>
            </div>
            <p className="text-green-700 dark:text-green-300 text-sm">
              Your trade amount of {amount} {selectedToken} has been encrypted and is ready for submission.
            </p>
          </div>

          {/* Encrypted Value Display */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">Encrypted Value (Preview)</h4>
            <div className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all bg-white dark:bg-gray-900 p-2 rounded border">
              {encryptedObject.ctHash}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This encrypted value contains your trade amount but cannot be read by anyone else.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
