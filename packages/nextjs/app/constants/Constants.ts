import { TabConfig } from "../Tab";

// Hook / Pool Addresses (Arbitrum Sepolia)
export const MARKET_ORDER_HOOK = "0xA98e541A012D4198b7122D72B38dD0149Ba94080";
export const CIPHER_TOKEN = "0x3Ee7933017691D1AadCf97244D18c1130b148B88";
export const MASK_TOKEN = "0x9828f7e6A63Aa269d7f4927bC803F6f8854218d1";

export const POOL_ID = "0xf27875cbaf127416b7d2f71ff178e377da7bdfb297354c770f81d2385f5452ed";

// Uniswap Contracts
export const QUOTER = "0x7de51022d70a725b508085468052e25e22b5c4c9";
export const POOL_SWAP = "0xf3a39c86dbd13c45365e57fb90fe413371f65af8";
export const STATE_VIEW = "0x9d467fa9062b6e9b1a46e26007ad82db116c67cb";

// Misc.
export const MIN_SQRT_PRICE = 4295128739n + 1n;
export const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n - 1n;

export const POOL_KEY = {
  currency0: CIPHER_TOKEN,
  currency1: MASK_TOKEN,
  fee: 3000,
  tickSpacing: 60,
  hooks: MARKET_ORDER_HOOK,
};

export const TEST_SETTINGS = {
  takeClaims: false,
  settleUsingBurn: false,
};

export const HOOK_DATA = "0x";

export const DEFAULT_TOKENS = {
  from: { symbol: "CPH", value: "" },
  to: { symbol: "MSK", value: "" },
};

export const TABS: TabConfig[] = [
  { id: "market", label: "Market", buttonText: "Place Market Order" },
  { id: "swap", label: "Swap", buttonText: "Swap" },
];
