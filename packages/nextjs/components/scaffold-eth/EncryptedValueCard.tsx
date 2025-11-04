import React, { useCallback } from "react";
import { FheTypes } from "@cofhe/sdk";
import { LockClosedIcon, LockOpenIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useCofheConnected, useCofheIsActivePermitValid, useCofheModalStore } from "~~/app/useCofhe";
import { useDecryptValue } from "~~/app/useDecrypt";

interface EncryptedZoneProps {
  className?: string;
  children: React.ReactNode;
}

export const EncryptedZone = ({ className = "", children }: EncryptedZoneProps) => {
  return (
    <div className={`relative w-full ${className}`}>
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="text-purple-400" style={{ stopColor: "currentColor" }} />
            <stop offset="100%" className="text-purple-600" style={{ stopColor: "currentColor" }} />
          </linearGradient>
        </defs>
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          fill="none"
          stroke="url(#borderGradient)"
          strokeWidth="2"
          rx="16"
          ry="16"
        />
      </svg>

      {/* Content */}
      <div className="relative flex flex-1 items-center justify-between p-2 w-full">
        {children}
        <div className="ml-4 flex items-center justify-center">
          <span className="inline-flex items-center justify-center w-8 h-10 rounded-md bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg">
            <ShieldCheckIcon className="w-5 h-5 text-white" aria-hidden="true" />
          </span>
        </div>
      </div>
    </div>
  );
};

interface EncryptedValueProps<T extends FheTypes> {
  fheType: T;
  ctHash: bigint | null | undefined;
  label: string;
}

export const EncryptedValue = <T extends FheTypes>({ label, fheType, ctHash }: EncryptedValueProps<T>) => {
  const cofheConnected = useCofheConnected();
  const isPermitValid = useCofheIsActivePermitValid();
  const setGeneratePermitModalOpen = useCofheModalStore(state => state.setGeneratePermitModalOpen);
  const { onDecrypt, result } = useDecryptValue(fheType, ctHash);

  const handleDecrypt = useCallback(() => {
    // If permit is invalid or missing, open the generate permit modal
    // After the user generates a new permit, the callback will be called to decrypt the value
    if (!isPermitValid) {
      setGeneratePermitModalOpen(true, onDecrypt);
      return;
    }

    // Permit is valid, decrypt the value
    onDecrypt();
  }, [isPermitValid, onDecrypt, setGeneratePermitModalOpen]);

  return (
    <div className="flex flex-row items-center justify-start p-1 pl-4 gap-2 flex-1 rounded-3xl bg-primary-content/5 min-h-12">
      <span className="text-xs font-semibold">{label}</span>
      {result.state === "no-data" && <span className="text-xs font-semibold flex-1 italic">No data</span>}
      {result.state === "encrypted" && (
        <span className={`btn btn-md btn-cofhe flex-1 ${cofheConnected ? "" : "btn-disabled"}`} onClick={handleDecrypt}>
          <LockClosedIcon className="w-5 h-5" aria-hidden="true" />
          <span className="flex flex-1 items-center justify-center">
            <span>Encrypted</span>
          </span>
        </span>
      )}
      {result.state === "pending" && (
        <span className="btn btn-md btn-cofhe btn-disabled flex-1">
          <div className="loading-spinner loading-sm" />
          Decrypting
        </span>
      )}
      {result.state === "success" && (
        <div className="flex flex-1 px-4 items-center justify-center gap-2 h-10 bg-success/10 border-success border-2 border-solid rounded-full">
          <LockOpenIcon className="w-5 h-5 text-success" aria-hidden="true" />
          <div className="flex flex-1 items-center justify-center">
            <span className="font-mono">{result.value}</span>
          </div>
        </div>
      )}
      {result.state === "error" && (
        <span className="text-xs text-warning font-semibold flex-1 italic">{result.error}</span>
      )}
    </div>
  );
};

// For backward compatibility
export const EncryptedValueCard = <T extends FheTypes>(props: EncryptedValueProps<T>) => {
  return (
    <EncryptedZone>
      <EncryptedValue {...props} />
    </EncryptedZone>
  );
};
