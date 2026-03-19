import { useCallback, useState } from "react";
import { getCofheClientNext, useCofheConnected } from "./useCofhe";
import { FheTypes } from "@cofhe/sdk";
import { Encryptable } from "cofhe-sdk-next";
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
type NextEncryptableItem =
  | ReturnType<typeof Encryptable.bool>
  | ReturnType<typeof Encryptable.uint8>
  | ReturnType<typeof Encryptable.uint16>
  | ReturnType<typeof Encryptable.uint32>
  | ReturnType<typeof Encryptable.uint64>
  | ReturnType<typeof Encryptable.uint128>
  | ReturnType<typeof Encryptable.address>;

/**
 * Type representing the input data type for a given FHE type.
 * This maps FHE types to their corresponding input data types (e.g., boolean for Bool, string/bigint for Uint types).
 */
type EncryptableInput<T extends FheTypes> = T extends FheTypes.Bool
  ? boolean
  : T extends FheTypes.Uint8 | FheTypes.Uint16 | FheTypes.Uint32 | FheTypes.Uint64 | FheTypes.Uint128
    ? string | bigint
    : T extends FheTypes.Uint160
      ? string | bigint
      : never;

/**
 * Converts a value to its corresponding Encryptable type based on the specified FHE type.
 * @param fheType - The FHE type to convert to (e.g., FheTypes.Bool, FheTypes.Uint32)
 * @param value - The value to convert, must match the expected input type for the FHE type
 * @returns An Encryptable instance of the specified type
 * @throws Error if the FHE type is not supported
 */
const fheTypeToEncryptable = <T extends FheTypes>(fheType: T, value: EncryptableInput<T>): NextEncryptableItem => {
  switch (fheType) {
    case FheTypes.Bool:
      return Encryptable.bool(value as boolean);
    case FheTypes.Uint8:
      return Encryptable.uint8(value as string | bigint);
    case FheTypes.Uint16:
      return Encryptable.uint16(value as string | bigint);
    case FheTypes.Uint32:
      return Encryptable.uint32(value as string | bigint);
    case FheTypes.Uint64:
      return Encryptable.uint64(value as string | bigint);
    case FheTypes.Uint128:
      return Encryptable.uint128(value as string | bigint);
    case FheTypes.Uint160:
      return Encryptable.address(value as string | bigint);
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
 *   - inputEncryptionDisabled: A boolean indicating if encryption is disabled (when cofhe is not connected)
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
  const connected = useCofheConnected();

  const onEncryptInput = useCallback(
    async <T extends FheTypes, E extends EncryptableInput<T>>(fheType: T, value: E) => {
      if (!connected) return;

      logBlockStart("useEncryptInput");
      logBlockMessage(`ENCRYPTING INPUT | ${plaintextToString(fheType, value)}`);

      const encryptable = fheTypeToEncryptable<T>(fheType, value);

      setIsEncryptingInput(true);
      try {
        const encryptedValues = await getCofheClientNext().encryptInputs([encryptable]).execute();
        const encryptedValue = encryptedValues[0];
        logBlockMessageAndEnd(
          `SUCCESS          | ${plaintextToString(fheType, value)} => ${encryptedValueToString(fheType, encryptedValue.ctHash)}`,
        );
        return encryptedValues[0];
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logBlockMessageAndEnd(`FAILED           | error = ${message}`);
        notification.error(`Failed to encrypt input: ${message}`);
        return;
      } finally {
        setIsEncryptingInput(false);
      }
    },
    [connected],
  );

  return { onEncryptInput, isEncryptingInput, inputEncryptionDisabled: !connected };
};
