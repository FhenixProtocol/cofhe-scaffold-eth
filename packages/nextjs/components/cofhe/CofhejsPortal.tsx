import { useRef } from "react";
import { Permit } from "@cofhe/sdk/permits";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { ShieldCheckIcon } from "@heroicons/react/24/solid";
import {
  useCofhejsActivePermit,
  useCofhejsAllPermits,
  useCofhejsModalStore,
  useCofhejsRemovePermit, // useCofhejsSetActivePermit,
  useCofhejsStatus,
} from "~~/app/useCofhejs";
import { useOutsideClick } from "~~/hooks/scaffold-eth";
import scaffoldConfig from "~~/scaffold.config";

/**
 * CoFHE Portal Component
 *
 * This component provides a dropdown interface for managing CoFHE permits and viewing system status.
 * It serves as the main control center for CoFHE operations, allowing users to:
 * - View initialization status and connection details
 * - Manage active and stored permits
 * - Create new permits
 * - Switch between different permits
 * - Remove unused permits
 *
 * The portal is accessible through a shield icon button in the UI, which opens a dropdown
 * containing all permit management functionality and system status information.
 */
export const CofhejsPortal = () => {
  const { chainId, account, initialized } = useCofhejsStatus();
  const dropdownRef = useRef<HTMLDetailsElement>(null);
  const activePermit = useCofhejsActivePermit();

  const setGeneratePermitModalOpen = useCofhejsModalStore(state => state.setGeneratePermitModalOpen);
  const removePermit = useCofhejsRemovePermit();

  const closeDropdown = () => {
    dropdownRef.current?.removeAttribute("open");
  };

  useOutsideClick(dropdownRef, closeDropdown);

  const networkName = chainId
    ? scaffoldConfig.targetNetworks.find(network => network.id === Number(chainId))?.name
    : undefined;

  const handleCreatePermit = () => {
    setGeneratePermitModalOpen(true);
  };

  return (
    <details ref={dropdownRef} className="dropdown dropdown-end leading-3">
      <summary className="ml-1 btn btn-cofhe btn-sm px-2 rounded-full dropdown-toggle">
        <ShieldCheckIcon className="h-4 w-4" />
        <ChevronDownIcon className="h-4 w-4" />
      </summary>
      <div className="dropdown-content z-2 p-4 mt-2 shadow-center shadow-accent bg-base-200 rounded-box gap-1 min-w-[275px]">
        <div className="flex flex-row justify-center items-center gap-2 px-2 py-1">
          <ShieldCheckIcon className="h-5 w-5 text-cofhe-primary" />
          <span className="font-bold">Cofhejs Portal</span>
        </div>
        <div className="flex flex-col gap-1 mt-2">
          <div className="menu-title text-xs">Initialization Status</div>
          <InfoRow
            className="h-8"
            label="Initialized"
            value={initialized ? "Yes" : "No"}
            valueClassName={initialized ? "text-success" : "text-error"}
          />
          <InfoRow
            className="h-8"
            label="Account"
            value={account ? account.slice(0, 6) + "..." + account.slice(-4) : "Not connected"}
            valueClassName={account && "font-mono"}
          />
          <InfoRow className="h-8" label="Network" value={networkName ? networkName : "Not connected"} />
        </div>
        <div className="flex flex-col gap-1 mt-2">
          <div className="menu-title text-xs">Permits</div>
          {activePermit && <PermitItem key="active" permit={activePermit} isActive={true} onRemove={removePermit} />}
          <AllPermitsList />
          <div
            className={`btn btn-sm btn-cofhe mt-2 w-full ${!initialized && "btn-disabled"}`}
            onClick={handleCreatePermit}
          >
            Create Permit
          </div>
        </div>
      </div>
    </details>
  );
};

/**
 * A reusable component for displaying label-value pairs in a consistent format.
 * Used throughout the portal for displaying various pieces of information.
 */
const InfoRow = ({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) => {
  return (
    <div className={`flex flex-row justify-between items-center text-sm gap-6 ${className}`}>
      <span className="text-left text-nowrap">{label}</span>
      <span className={`font-bold text-nowrap text-right ${valueClassName}`}>{value}</span>
    </div>
  );
};

/**
 * Displays a list of all available permits, excluding the currently active one.
 * Shows a placeholder message when no permits are available.
 */
const AllPermitsList = () => {
  // const activePermit = useCofhejsActivePermit();
  const allPermits = useCofhejsAllPermits();
  // const removePermit = useCofhejsRemovePermit();

  if (allPermits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 bg-base-300/30 py-6 rounded-lg">
        <span className="text-base-content/50 text-sm">None</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 mt-1">
      {/* {allPermits.map(({ data: permit, success }, index) => {
        if (!success || !permit || permit.getHash() === activePermit?.getHash()) return null;
        return <PermitItem key={index} permit={permit} isActive={false} onRemove={removePermit} />;
      })} */}
    </div>
  );
};

/**
 * Displays detailed information about a single permit and provides controls for managing it.
 * Shows different options based on whether the permit is currently active or not.
 *
 * For active permits:
 * - Displays a success indicator
 * - Shows permit details in read-only mode
 *
 * For inactive permits:
 * - Provides options to activate or delete the permit
 * - Shows the same detailed information as active permits
 */
const PermitItem = ({
  permit,
  isActive,
  // onRemove,
}: {
  permit: Permit;
  isActive: boolean;
  onRemove: (hash: string) => void;
}) => {
  // const setActivePermit = useCofhejsSetActivePermit();
  const hash = "123213213"; // permit.getHash();

  return (
    <div className="flex flex-col bg-base-300/30 p-2 rounded-lg">
      {isActive && <div className="text-xs font-semibold text-success">Active Permit</div>}
      {isActive && <br />}
      <InfoRow className="text-xs" label="Name" value={permit.name} valueClassName="font-mono" />
      <InfoRow
        className="text-xs"
        label="Id"
        value={`${hash.slice(0, 6)}...${hash.slice(-4)}`}
        valueClassName="font-mono"
      />
      <br />
      <InfoRow
        className="text-xs"
        label="Issuer"
        value={permit.issuer.slice(0, 6) + "..." + permit.issuer.slice(-4)}
        valueClassName="font-mono"
      />
      <InfoRow
        className="text-xs"
        label="Expires"
        value={new Date(Number(permit.expiration) * 1000).toLocaleDateString()}
      />
      {!isActive && (
        <div className="flex justify-start gap-2 mt-2">
          <div
            className="btn btn-xs btn-cofhe"
            // onClick={() => setActivePermit(permit.getHash())}
          >
            Use
          </div>
          <div
            className="btn btn-ghost btn-xs text-error hover:text-error hover:bg-error/10"
            // onClick={() => onRemove(permit.getHash())}
            title="Remove permit"
          >
            Delete
          </div>
        </div>
      )}
    </div>
  );
};
