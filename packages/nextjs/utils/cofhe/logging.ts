import { FheTypes } from "@cofhe/sdk";

export const logBlockStart = (message: string) => {
  console.log("┌──────────────────┬──────────────────────────────────────────────────");
  console.log(`│ [COFHE]          │ ${message}`);
  console.log("├──────────────────┴──────────────────────────────────────────────────");
};

export const logBlockMessage = (message: string) => {
  console.log(`│ ${message}`);
};

export const logBlockEnd = () => {
  console.log("└─────────────────────────────────────────────────────────────────────");
};

export const logBlockMessageAndEnd = (message: string) => {
  logBlockMessage(message);
  logBlockEnd();
};

export const fheTypeToString = (fheType: FheTypes) => {
  switch (fheType) {
    case FheTypes.Bool:
      return "ebool";
    case FheTypes.Uint8:
      return "euint8";
    case FheTypes.Uint16:
      return "euint16";
    case FheTypes.Uint32:
      return "euint32";
    case FheTypes.Uint64:
      return "euint64";
    case FheTypes.Uint128:
      return "euint128";
    case FheTypes.Uint256:
      return "euint256";
    case FheTypes.Uint160:
      return "eaddress";
    default:
      return "unknown";
  }
};

export const plaintextToString = (fheType: FheTypes, plaintext: string | bigint | boolean) => {
  if (fheType === FheTypes.Bool) {
    return plaintext === 1n ? "true" : "false";
  }
  return plaintext;
};

export const encryptedValueToString = (fheType: FheTypes, handle: bigint) => {
  const hashStr = handle.toString();
  const truncated = hashStr.slice(0, 6) + ".." + hashStr.slice(hashStr.length - 6);

  return `${fheTypeToString(fheType)}(${truncated})`;
};
