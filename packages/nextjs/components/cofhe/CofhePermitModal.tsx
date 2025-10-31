"use client";

import { useCallback, useState } from "react";
import { zeroAddress } from "viem";
import { ShieldCheckIcon } from "@heroicons/react/24/solid";
import { useCofheAccount, useCofheCreatePermit, useCofheModalStore } from "~~/app/useCofhe";
import { AddressInput } from "~~/components/scaffold-eth";

/**
 * CoFHE Permit Generation Modal
 *
 * This modal allows users to generate cryptographic permits for accessing encrypted data in the CoFHE system.
 * Permits are required because they provide a secure way to verify identity and control access to sensitive
 * encrypted data without revealing the underlying data itself.
 *
 * The modal provides the following options:
 * - Name: An optional identifier for the permit (max 24 chars)
 * - Expiration: How long the permit remains valid (1 day, 1 week (default), or 1 month)
 * - Recipient: (Currently unsupported) Option to share the permit with another address
 *
 * When generated, the permit requires a wallet signature (EIP712) to verify ownership.
 * This signature serves as proof that the user controls the wallet address associated with the permit.
 *
 * This modal will automatically open when a user attempts to decrypt a value in the `EncryptedValue` component.
 * It will also open if the user clicks the "Generate Permit" button in the `CofhePortal` component.
 */

type ExpirationOption = "1 day" | "1 week" | "1 month";
const shareablePermits = false;

export const CofhePermitModal = () => {
  const { generatePermitModalOpen, generatePermitModalCallback, setGeneratePermitModalOpen } = useCofheModalStore();
  const createPermit = useCofheCreatePermit();
  const account = useCofheAccount();
  const [expiration, setExpiration] = useState<ExpirationOption>("1 week");
  const [recipient, setRecipient] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [showRecipientInput, setShowRecipientInput] = useState(false);

  const handleClose = useCallback(() => {
    setGeneratePermitModalOpen(false);
    // Reset state when closing
    setExpiration("1 week");
    setRecipient("");
    setName("");
    setShowRecipientInput(false);
  }, [setGeneratePermitModalOpen]);

  const handleGeneratePermit = useCallback(async () => {
    const type: "self" | "sharing" = recipient ? "sharing" : "self";

    if (!account) throw new Error("No connected account");

    const permitName = name.length > 0 ? name.slice(0, 24) : undefined;

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + (expiration === "1 day" ? 1 : expiration === "1 week" ? 7 : 30));

    const recipientAddress = recipient ? recipient : zeroAddress;

    const result = await createPermit({
      type,
      name: permitName,
      issuer: account,
      expiration: Math.round(expirationDate.getTime() / 1000),
      recipient: recipientAddress,
    });
    if (result?.success) {
      handleClose();
      // If there was a callback provided when opening the modal, execute it
      if (generatePermitModalCallback) {
        generatePermitModalCallback();
      }
    }
  }, [createPermit, generatePermitModalCallback, handleClose, account, recipient, expiration, name]);

  return (
    <dialog className={`modal ${generatePermitModalOpen ? "modal-open" : ""}`}>
      <div className="modal-box relative">
        <button className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3" onClick={handleClose}>
          ✕
        </button>
        <div className="flex items-center justify-center mb-4">
          <ShieldCheckIcon className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-4">Generate CoFHE Permit</h2>
        <p className="text-center mb-6">
          A permit is required to authenticate your identity and grant access to your encrypted data.
        </p>
        <p className="text-center mb-6">
          Generating a permit will open your wallet to sign a message (EIP712) which verifies your ownership of the
          connected wallet.
        </p>

        <div className="flex flex-col gap-4 mb-6">
          {/* Name */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center justify-between gap-2">
              <label className="text-sm font-semibold">
                Name <span className="font-normal">(optional - used for display purposes)</span>
              </label>
              <span className="text-xs text-gray-500">{name.length}/24</span>
            </div>
            <input
              type="text"
              placeholder="Enter permit name"
              className="input input-bordered w-full"
              value={name}
              onChange={e => setName(e.target.value.slice(0, 24))}
              maxLength={24}
            />
          </div>

          {/* Expiration */}
          <div className="flex flex-row items-center justify-between gap-2">
            <label className="text-sm font-semibold">Expiration</label>
            <div className="flex gap-2">
              {(["1 day", "1 week", "1 month"] as const).map(option => (
                <div
                  key={option}
                  className={`btn btn-sm ${expiration === option ? "btn-cofhe" : "btn-ghost"}`}
                  onClick={() => setExpiration(option)}
                >
                  {option}
                </div>
              ))}
            </div>
          </div>

          {/* Recipient */}
          {shareablePermits && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center justify-between gap-2">
                <label className="text-sm font-semibold">Recipient</label>
                <div className="flex gap-2">
                  <div
                    className={`btn btn-sm ${!showRecipientInput ? "btn-cofhe" : "btn-ghost"}`}
                    onClick={() => setShowRecipientInput(false)}
                  >
                    None
                  </div>
                  <div
                    className={`btn btn-sm ${showRecipientInput ? "btn-cofhe" : "btn-ghost"}`}
                    onClick={() => setShowRecipientInput(true)}
                  >
                    Enter address
                  </div>
                </div>
              </div>
              {showRecipientInput && (
                <AddressInput value={recipient} onChange={setRecipient} placeholder="Enter recipient address" />
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <button className="btn btn-ghost" onClick={handleClose}>
            Cancel
          </button>
          <button className="btn btn-cofhe" onClick={handleGeneratePermit}>
            Generate Permit
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={handleClose}>
        <button>close</button>
      </div>
    </dialog>
  );
};
