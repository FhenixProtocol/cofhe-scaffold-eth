import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, fallback, http } from "viem";
import { hardhat, mainnet } from "viem/chains";
import { createConfig } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import scaffoldConfig, { DEFAULT_ALCHEMY_API_KEY, ScaffoldConfig } from "~~/scaffold.config";
import { getAlchemyHttpUrl } from "~~/utils/scaffold-eth";
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const { targetNetworks } = scaffoldConfig;

// Define the multicall3 address for hardhat chain
const HARDHAT_MULTICALL3_ADDRESS = (deployedContracts as GenericContractsDeclaration)["31337"].Multicall3.address;

// We always want to have mainnet enabled (ENS resolution, ETH price, etc). But only once.
export const enabledChains = targetNetworks.find((network: Chain) => network.id === 1)
  ? targetNetworks
  : ([...targetNetworks, mainnet] as const);

export const wagmiConfig = createConfig({
  chains: enabledChains,
  connectors: wagmiConnectors,
  ssr: true,
  client({ chain }) {
    let rpcFallbacks = [http()];

    const rpcOverrideUrl = (scaffoldConfig.rpcOverrides as ScaffoldConfig["rpcOverrides"])?.[chain.id];
    if (rpcOverrideUrl) {
      rpcFallbacks = [http(rpcOverrideUrl), http()];
    } else {
      const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);
      if (alchemyHttpUrl) {
        const isUsingDefaultKey = scaffoldConfig.alchemyApiKey === DEFAULT_ALCHEMY_API_KEY;
        // If using default Scaffold-ETH 2 API key, we prioritize the default RPC
        rpcFallbacks = isUsingDefaultKey ? [http(), http(alchemyHttpUrl)] : [http(alchemyHttpUrl), http()];
      }
    }

    return createClient({
      chain:
        chain.id === hardhat.id
          ? // Add multicall3 contract address to hardhat chain
            {
              ...chain,
              contracts: {
                ...chain.contracts,
                multicall3: {
                  address: HARDHAT_MULTICALL3_ADDRESS,
                },
              },
            }
          : chain,
      transport: fallback(rpcFallbacks),
      ...(chain.id !== (hardhat as Chain).id
        ? {
            pollingInterval: scaffoldConfig.pollingInterval,
          }
        : {}),
    });
  },
});
