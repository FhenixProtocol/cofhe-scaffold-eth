import { useCallback, useState } from "react";
import { cofhesdkClient, useCofhejsInitialized } from "./useCofhejs";
import {
  Encryptable,
  EncryptableAddress,
  EncryptableBool,
  EncryptableUint8,
  EncryptableUint16,
  EncryptableUint32,
  EncryptableUint64,
  EncryptableUint128,
  FheTypes,
} from "@cofhe/sdk";
import {
  encryptedValueToString,
  logBlockMessage,
  logBlockMessageAndEnd,
  logBlockStart,
  plaintextToString,
} from "~~/utils/cofhe/logging";
import { notification } from "~~/utils/scaffold-eth";

/**
 * Type mapping from FHE types to their corresponding Encryptable types.
 * This type ensures type safety when working with different FHE data types.
 */
type EncryptableFromFheTypes<T extends FheTypes> = T extends FheTypes.Bool
  ? EncryptableBool
  : T extends FheTypes.Uint8
    ? EncryptableUint8
    : T extends FheTypes.Uint16
      ? EncryptableUint16
      : T extends FheTypes.Uint32
        ? EncryptableUint32
        : T extends FheTypes.Uint64
          ? EncryptableUint64
          : T extends FheTypes.Uint128
            ? EncryptableUint128
            : T extends FheTypes.Uint256
              ? EncryptableAddress
              : never;

/**
 * Type representing the input data type for a given FHE type.
 * This maps FHE types to their corresponding input data types (e.g., boolean for Bool, string/bigint for Uint types).
 */
type EncryptableInput<T extends FheTypes> = EncryptableFromFheTypes<T>["data"];

/**
 * Converts a value to its corresponding Encryptable type based on the specified FHE type.
 * @param fheType - The FHE type to convert to (e.g., FheTypes.Bool, FheTypes.Uint32)
 * @param value - The value to convert, must match the expected input type for the FHE type
 * @returns An Encryptable instance of the specified type
 * @throws Error if the FHE type is not supported
 */
const fheTypeToEncryptable = <T extends FheTypes>(
  fheType: T,
  value: EncryptableInput<T>,
): EncryptableFromFheTypes<T> => {
  switch (fheType) {
    case FheTypes.Bool:
      return Encryptable.bool(value as boolean) as EncryptableFromFheTypes<T>;
    case FheTypes.Uint8:
      return Encryptable.uint8(value as string | bigint) as EncryptableFromFheTypes<T>;
    case FheTypes.Uint16:
      return Encryptable.uint16(value as string | bigint) as EncryptableFromFheTypes<T>;
    case FheTypes.Uint32:
      return Encryptable.uint32(value as string | bigint) as EncryptableFromFheTypes<T>;
    case FheTypes.Uint64:
      return Encryptable.uint64(value as string | bigint) as EncryptableFromFheTypes<T>;
    case FheTypes.Uint128:
      return Encryptable.uint128(value as string | bigint) as EncryptableFromFheTypes<T>;
    case FheTypes.Uint160:
      return Encryptable.address(value as string | bigint) as EncryptableFromFheTypes<T>;
    default:
      throw new Error(`Unsupported FHE type: ${fheType}`);
  }
};

/**
 * A React hook that provides functionality for encrypting input values using FHE.
 * This hook manages the encryption state and provides a type-safe way to encrypt different FHE data types.
 *
 * @returns An object containing:
 *   - onEncryptInput: A function to encrypt input values
 *   - isEncryptingInput: A boolean indicating if encryption is in progress
 *   - inputEncryptionDisabled: A boolean indicating if encryption is disabled (when cofhejs is not initialized)
 *
 * @example
 * ```typescript
 * const { onEncryptInput, isEncryptingInput } = useEncryptInput();
 *
 * // Encrypt a uint32 value
 * const encryptedValue = await onEncryptInput(FheTypes.Uint32, 42);
 *
 * // Encrypt a boolean value
 * const encryptedBool = await onEncryptInput(FheTypes.Bool, true);
 * ```
 */
export const useEncryptInput = () => {
  const [isEncryptingInput, setIsEncryptingInput] = useState(false);
  const initialized = useCofhejsInitialized();

  const onEncryptInput = useCallback(
    async <T extends FheTypes, E extends EncryptableInput<T>>(fheType: T, value: E) => {
      if (!initialized) return;

      logBlockStart("useEncryptInput");
      logBlockMessage(`ENCRYPTING INPUT | ${plaintextToString(fheType, value)}`);

      const encryptable = fheTypeToEncryptable<T>(fheType, value);

      setIsEncryptingInput(true);
      const encryptedResult = await cofhesdkClient.encryptInputs([encryptable]).encrypt();
      setIsEncryptingInput(false);

      if (!encryptedResult.success) {
        logBlockMessageAndEnd(`FAILED           | error = ${encryptedResult.error}`);
        notification.error(`Failed to encrypt input: ${encryptedResult.error}`);
        return;
      }

      const encryptedValue = encryptedResult.data[0];
      logBlockMessageAndEnd(
        `SUCCESS          | ${plaintextToString(fheType, value)} => ${encryptedValueToString(fheType, encryptedValue.ctHash)}`,
      );

      return encryptedValue;
    },
    [initialized],
  );

  return { onEncryptInput, isEncryptingInput, inputEncryptionDisabled: !initialized };
};
