# 🏗 COFHE Scaffold-ETH 2

Scaffold-ETH 2 (Now With CoFHE)

### CoFHE: https://cofhe-docs.fhenix.zone/docs/devdocs/overview

# CoFHE Scaffold-ETH 2 Documentation

## QuickStart

The CoFHE Scaffold-ETH 2 template adds support for Fully Homomorphic Encryption (FHE) operations to the standard Scaffold-ETH 2 template.

To get up and testing, clone and open the repo, then:

1. Start up the local hardhat node (you will see the mocks getting deployed, explained below)

```bash
yarn chain
```

2. Deploy `FHECounter.sol`

```bash
yarn deploy:local
```

3. Start the NextJS webapp

```bash
yarn start
```

4. Open the dApp, and start exploring the FHECounter.

## Integrated Tools

- Hardhat

  - `@fhenixprotocol/cofhe-contracts` - Package containing `FHE.sol`. `FHE.sol` is a library that exposes FHE arithmetic operations like `FHE.add` and `FHE.mul` along with access control functions.
  - `@cofhe/mock-contracts` - The CoFHE coprocessor exists off-chain. `@cofhe/mock-contracts` are a fully on-chain drop-in replacement for the off-chain components. These mocks allow better developer and testing experience when working with FHE. Is transparently used as a dependency of `@cofhe/hardhat-plugin`
  - `@cofhe/hardhat-plugin` - A hardhat plugin responsible for deploying the mock contracts on the hardhat network and during tests. Also exposes testing utility functions in `hre.cofhesdk.___`.
  - `@cofhe/sdk` - Primary connection to the CoFHE coprocessor. Exposes functions like `encryptInputs` (for sealing) and `decryptHandle` (for unsealing). Manages access permits. Automatically plays nicely with the mock environment.

- Nextjs
  - `@cofhe/sdk` - Primary connection to the CoFHE coprocessor. Exposes functions like `encryptInputs` (for sealing) and `decryptHandle` (for unsealing). Manages access permits. Automatically plays nicely with the mock environment.

## Working with FHE Smart Contracts

### Hardhat Setup

1. **[Hardhat Configuration](packages/hardhat/hardhat.config.ts)**:

   ```typescript
   import 'cofhe-hardhat-plugin'

   module.exports = {
   	solidity: '0.8.25',
   	evmVersion: 'cancun',
   	// ... other config
   }
   ```

2. **[TypeScript Configuration](packages/hardhat/tsconfig.json)**:

   ```json
   {
   	"compilerOptions": {
   		"target": "es2020",
   		"module": "Node16",
   		"moduleResolution": "Node16"
   	}
   }
   ```

3. **[Multicall3 Deployment](packages/hardhat/deploy/00_deploy_multicall.ts)**:
   The Multicall3 contract is deployed on the hardhat node to support the `useReadContracts` hook from viem. This allows efficient batch reading of contract data in the mock environment.

### Writing an FHE Contract

The [`FHECounter.sol`](packages/hardhat/contracts/FHECounter.sol) contract demonstrates the use of Fully Homomorphic Encryption (FHE) to perform encrypted arithmetic operations. The counter value is stored in encrypted form, allowing for private increments, decrements, and value updates.

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract FHECounter {
    /// @notice The encrypted counter value
    euint32 public count;

    /// @notice A constant encrypted value of 1 used for increments/decrements (gas saving)
    euint32 private ONE;

    constructor() {
        ONE = FHE.asEuint32(1);
        count = FHE.asEuint32(0);

        // Allows anyone to read the initial encrypted value (0)
        // Also allows anyone to perform an operation USING the initial value
        FHE.allowGlobal(count);

        // Allows this contract to perform operations using the constant ONE
        FHE.allowThis(ONE);
    }

    function increment() public {
        // Performs an encrypted addition of count and ONE
        count = FHE.add(count, ONE);

        // Only this contract and the sender can read the new value
        FHE.allowThis(count);
        FHE.allowSender(count);
    }

    function decrement() public {
        count = FHE.sub(count, ONE);
        FHE.allowThis(count);
        FHE.allowSender(count);
    }

    function set(InEuint32 memory value) public {
        count = FHE.asEuint32(value);
        FHE.allowThis(count);
        FHE.allowSender(count);
    }
}
```

Key concepts in FHE contract development:

1. **Encrypted Types**:

   - Use `euint32`, `ebool`, etc. for encrypted values
   - These types support FHE operations while keeping values private

2. **FHE Operations**:

   - `FHE.add(a, b)`: Add two encrypted values
   - `FHE.sub(a, b)`: Subtract encrypted values
   - `FHE.mul(a, b)`: Multiply encrypted values
   - `FHE.div(a, b)`: Divide encrypted values
   - See `FHE.sol` for the full list of available operations

3. **Access Control**:
   - `FHE.allow(value, address)`: Allow `address` to read the value
   - `FHE.allowThis(value)`: Allow the contract to read the value
   - `FHE.allowSender(value)`: Allow the transaction sender to read the value
   - `FHE.allowGlobal(value)`: Allow anyone to read the value
   - Access control must be explicitly set after each operation that modifies an encrypted value

### Testing your FHE Contract

The [`FHECounter.test.ts`](packages/hardhat/test/FHECounter.test.ts) file demonstrates testing FHE contracts using the mock environment. Before using `cofhesdkClient.encryptInput` to prepare input variables, or `cofhesdkClient.decryptHandle` to read encrypted data, cofhe must be initialized. In a hardhat environment there is an exposed utility function:

```typescript
const [bob] = await hre.ethers.getSigners()

// `hre.cofhesdk.createBatteriesIncludedCofhesdkClient` is used to initialize FHE with a Hardhat signer
// Initialization is required before any `encrypt` or `decrypt` operations can be performed
// `createBatteriesIncludedCofhesdkClient` is a helper function that initializes FHE with a Hardhat signer
// It returns a `Promise<Result<>>` type.

// The `Result<T>` type looks like this:
// {
//   success: boolean,
//   data: T (Permit | undefined in the case of initializeWithHardhatSigner),
//   error: CofhesdkError | null,
// }
const client = await hre.cofhesdk.createBatteriesIncludedCofhesdkClient(bob);

// `hre.cofhesdk.expectResultSuccess` is used to verify that the `Result` is successful (success: true)
// If the `Result` is not successful, the test will fail
await hre.cofhesdk.expectResultSuccess(client.initializationResults.keyFetchResult);
```

To verify the value of an encrypted variable, we can use:

```typescript
// Get the encrypted count variable
const count = await counter.count();

// `hre.cofhesdk.mocks.expectPlaintext` is used to verify that the encrypted value is 0
// This uses the encrypted variable `count` and retrieves the plaintext value from the on-chain mock contracts
// This kind of test can only be done in a mock environment where the plaintext value is known
await hre.cofhesdk.mocks.expectPlaintext(count, 0n);
```

To read the encrypted variable directly, we can use `cofhesdkClient.decryptHandle`:

```typescript
const count = await counter.count();

// `decryptHandle` is used to unseal the encrypted value
// the client must be initialized before `unseal` can be called
const unsealedResult = await client.decryptHandle(count, FheTypes.Uint32).decrypt();
```

To encrypt a variable for use as an `InEuint*` we can use `cofhesdkClient.encryptInputs`:

```typescript
// `encryptInputs` is used to encrypt the value
// the client must be initialized before `encryptInputs` can be called
const encryptResult = await client.encryptInputs([Encryptable.uint32(5n)]).encrypt();

const [encryptedInput] = await hre.cofhesdk.expectResultSuccess(encryptResult);
await hre.cofhesdk.mocks.expectPlaintext(encryptedInput.ctHash, 5n);

await counter.connect(bob).set(encryptedInput);

const count = await counter.count();
await hre.cofhesdk.mocks.expectPlaintext(count, 5n);
```

When global logging is needed we can use the utilities:

```typescript
hre.cofhesdk.mocks.enableLogs()
hre.cofhesdk.mocks.disableLogs()
```

or we can use targeted logging like this:

```typescript
await hre.cofhesdk.mocks.withLogs('counter.increment()', async () => {
	await counter.connect(bob).increment()
})
```

which will result in logs like this:

```
┌──────────────────┬──────────────────────────────────────────────────
│ [COFHE-MOCKS]    │ "counter.increment()" logs:
├──────────────────┴──────────────────────────────────────────────────
├ FHE.add          | euint32(4473..3424)[0] + euint32(1157..3648)[1]  =>  euint32(1106..1872)[1]
├ FHE.allowThis    | euint32(1106..1872)[1] -> 0x663f3ad617193148711d28f5334ee4ed07016602
├ FHE.allow        | euint32(1106..1872)[1] -> 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc
└─────────────────────────────────────────────────────────────────────
```

`euint32(4473..3424)[0]` represents an encrypted variable in the format `type(ct..hash)[plaintext]`

## NextJS with FHE

### Initialization

The frontend initialization begins in [`ScaffoldEthAppWithProviders.tsx`](packages/nextjs/components/ScaffoldEthAppWithProviders.tsx) where the `useInitializeCofhe` hook is called:

```typescript
/**
* CoFHE Initialization
*
* The CoFHE SDK client is initialized in two steps.
* The client is constructed synchronously, with `supportedChains` provided at construction time.
* The useInitializeCofhe hook then makes sure the CoFHE SDK client is connected to the current wallet and is ready to function.
* It performs the following key functions:
* - Connects the CoFHE SDK client to the current provider and signer
* - Initializes the FHE keys
* - Configures the wallet client for encrypted operations
* - Handles initialization errors with user notifications
*
* This hook is essential for enabling FHE (Fully Homomorphic Encryption) operations
* throughout the application. It automatically refreshes when the connected wallet
* or chain changes to maintain proper configuration.
*/
useInitializeCofhe()
```

This hook handles the complete setup of the CoFHE system, including environment detection, wallet client configuration, and permit management initialization. It runs automatically when the wallet or chain changes, ensuring the FHE system stays properly configured.

### CoFHE Portal

The [`CofhePortal`](packages/nextjs/components/cofhe/CofhePortal.tsx) component provides a dropdown interface for managing CoFHE permits and viewing system status. It's integrated into the [`Header`](packages/nextjs/components/Header.tsx) component as a shield icon button:

```typescript
/**
 * CoFHE Portal Integration
 *
 * The CofhePortal component is integrated into the header to provide easy access to
 * CoFHE permit management functionality. It appears as a shield icon button that opens
 * a dropdown menu containing:
 * - System initialization status
 * - Active permit information
 * - Permit management controls
 *
 * This placement ensures the portal is always accessible while using the application,
 * allowing users to manage their permits and monitor system status from any page.
 */
<CofhePortal />
```

The portal displays:

- **Initialization Status**: Shows whether CoFHE is initialized, the connected account, and current network
- **Active Permit**: Displays details about the currently active permit including name, ID, issuer, and expiration
- **Permit Management**: Allows users to create new permits, switch between existing permits, and delete unused permits

### FHE Counter Component

The [`FHECounterComponent`](packages/nextjs/app/FHECounterComponent.tsx) demonstrates how to interact with FHE-enabled smart contracts in a React application:

```typescript
/**
 * FHECounterComponent - A demonstration of Fully Homomorphic Encryption (FHE) in a web application
 *
 * This component showcases how to:
 * 1. Read encrypted values from a smart contract
 * 2. Display encrypted values using a specialized component
 * 3. Encrypt user input before sending to the blockchain
 * 4. Interact with FHE-enabled smart contracts
 *
 * The counter value is stored as an encrypted uint32 on the blockchain,
 * meaning the actual value is never revealed on-chain.
 */
```

#### Key Features:

1. **Reading Encrypted Values**: Uses `useScaffoldReadContract` to read the encrypted counter value from the smart contract
2. **Displaying Encrypted Data**: Uses the `EncryptedValue` component to handle decryption and display
3. **Encrypting User Input**: Demonstrates the process of encrypting user input before sending to the blockchain
4. **Contract Interactions**: Shows how to call increment, decrement, and set functions on the FHE contract

#### Input Encryption Process:

```typescript
/**
 * SetCounterRow Component
 *
 * Demonstrates the process of encrypting user input before sending it to the blockchain:
 * 1. User enters a number in the input field
 * 2. When "Set" is clicked, the number is encrypted using cofhe SDK
 * 3. The encrypted value is then sent to the smart contract
 *
 * This ensures the actual value is never exposed on the blockchain,
 * maintaining privacy while still allowing computations.
 */
const encryptedResult = await cofhesdkClient.encryptInputs([encryptable]).encrypt();
// encryptedResult is a result object with success status and data/error
```

### Permit Modal

The [`CofhePermitModal`](packages/nextjs/components/cofhe/CofhePermitModal.tsx) allows users to generate cryptographic permits for accessing encrypted data. This modal automatically opens when a user attempts to decrypt a value in the `EncryptedValue` component without a valid permit:

```typescript
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
 */
```

The modal opens in two scenarios:

1. When clicking "Generate Permit" in the CoFHE Portal
2. When attempting to decrypt an encrypted value without a valid permit

### Reference

#### EncryptedValue Component

The [`EncryptedValueCard`](packages/nextjs/components/scaffold-eth/EncryptedValueCard.tsx) provides components for displaying and interacting with encrypted values:

**EncryptedValue Component**:

- Displays encrypted values with appropriate UI states (encrypted, decrypting, decrypted, error)
- Handles permit validation and automatically opens the permit modal when needed
- Manages the decryption process using the `useDecryptValue` hook
- Shows different visual states based on the decryption status

**EncryptedZone Component**:

- Provides a visual wrapper with gradient borders to indicate encrypted content
- Includes a shield icon to clearly mark encrypted data areas

#### useCofhe Hooks

The [`useCofhe.ts`](packages/nextjs/app/useCofhe.ts) file provides comprehensive React hooks for FHE operations:

**Initialization Hooks**:

```typescript
// Hook to initialize cofhe with the connected wallet and chain configuration
// Handles initialization errors and displays toast notifications on success or error
// Refreshes when connected wallet or chain changes
useInitializeCofhe()

// Hook to check if cofhe is fully initialized (FHE keys, provider, and signer)
// This is used to determine if the user is ready to use the FHE library
// FHE based interactions (encrypt / decrypt) should be disabled until this is true
useCofheInitialized()

// Hook to get the current account initialized in cofhe
useCofheAccount()
```

**Status Hooks**:

```typescript
// Hook to get the complete status of cofhe
// Returns Object containing chainId, account, and initialization status
// Refreshes when any of the underlying values change
useCofheStatus()

// Hook to check if the currently connected chain is supported by the application
// Returns boolean indicating if the current chain is in the target networks list
// Refreshes when chainId changes
useIsConnectedChainSupported()
```

**Permit Management Hooks**:

```typescript
// Hook to create a new permit
// Returns Async function to create a permit with optional options
// Refreshes when chainId, account, or initialization status changes
useCofheCreatePermit()

// Hook to remove a permit
// Returns Async function to remove a permit by its hash
// Refreshes when chainId, account, or initialization status changes
useCofheRemovePermit()

// Hook to select the active permit
// Returns Async function to set the active permit by its hash
// Refreshes when chainId, account, or initialization status changes
useCofheSetActivePermit()

// Hook to get the active permit object
// Returns The active permit object or null if not found/valid
// Refreshes when active permit hash changes
useCofheActivePermit()

// Hook to check if the active permit is valid
// Returns boolean indicating if the active permit is valid
// Refreshes when permit changes
useCofheIsActivePermitValid()

// Hook to get all permit objects for the current chain and account
// Returns Array of permit objects
// Refreshes when permit hashes change
useCofheAllPermits()
```

#### useDecrypt Hook

The [`useDecrypt.ts`](packages/nextjs/app/useDecrypt.ts) file provides utilities for handling encrypted value decryption:

```typescript
/**
 * Hook to decrypt a value using cofhe
 * @param fheType - The type of the value to decrypt
 * @param ctHash - The hash of the encrypted value
 * @returns Object containing a function to decrypt the value and the result of the decryption
 */
useDecryptValue(fheType, ctHash)
```

**DecryptionResult States**:

- `"no-data"`: No encrypted value provided
- `"encrypted"`: Value is encrypted and ready for decryption
- `"pending"`: Decryption is in progress
- `"success"`: Decryption completed successfully with the decrypted value
- `"error"`: Decryption failed with error message

The hook automatically handles:

- Initialization status checking
- Account validation
- Zero value handling (returns appropriate default values)
- Error handling and state management
- Automatic reset when the encrypted value changes

---

## Scaffold-ETH 2

<h4 align="center">
  <a href="https://docs.scaffoldeth.io">Documentation</a> |
  <a href="https://scaffoldeth.io">Website</a>
</h4>

🧪 An open-source, up-to-date toolkit for building decentralized applications (dapps) on the Ethereum blockchain. It's designed to make it easier for developers to create and deploy smart contracts and build user interfaces that interact with those contracts.

⚙️ Built using NextJS, RainbowKit, Hardhat, Wagmi, Viem, and Typescript.

- ✅ **Contract Hot Reload**: Your frontend auto-adapts to your smart contract as you edit it.
- 🪝 **[Custom hooks](https://docs.scaffoldeth.io/hooks/)**: Collection of React hooks wrapper around [wagmi](https://wagmi.sh/) to simplify interactions with smart contracts with typescript autocompletion.
- 🧱 [**Components**](https://docs.scaffoldeth.io/components/): Collection of common web3 components to quickly build your frontend.
- 🔥 **Burner Wallet & Local Faucet**: Quickly test your application with a burner wallet and local faucet.
- 🔐 **Integration with Wallet Providers**: Connect to different wallet providers and interact with the Ethereum network.

![Debug Contracts tab](https://github.com/scaffold-eth/scaffold-eth-2/assets/55535804/b237af0c-5027-4849-a5c1-2e31495cccb1)

## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## Quickstart

To get started with Scaffold-ETH 2, follow the steps below:

1. Install dependencies if it was skipped in CLI:

```
cd my-dapp-example
yarn install
```

2. Run a local network in the first terminal:

```
yarn chain
```

This command starts a local Ethereum network using Hardhat. The network runs on your local machine and can be used for testing and development. You can customize the network configuration in `packages/hardhat/hardhat.config.ts`.

3. On a second terminal, deploy the test contract:

```
yarn deploy
```

This command deploys a test smart contract to the local network. The contract is located in `packages/hardhat/contracts` and can be modified to suit your needs. The `yarn deploy` command uses the deploy script located in `packages/hardhat/deploy` to deploy the contract to the network. You can also customize the deploy script.

4. On a third terminal, start your NextJS app:

```
yarn start
```

Visit your app on: `http://localhost:3000`. You can interact with your smart contract using the `Debug Contracts` page. You can tweak the app config in `packages/nextjs/scaffold.config.ts`.

Run smart contract test with `yarn hardhat:test`

- Edit your smart contracts in `packages/hardhat/contracts`
- Edit your frontend homepage at `packages/nextjs/app/page.tsx`. For guidance on [routing](https://nextjs.org/docs/app/building-your-application/routing/defining-routes) and configuring [pages/layouts](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts) checkout the Next.js documentation.
- Edit your deployment scripts in `packages/hardhat/deploy`

## Documentation

Visit our [docs](https://docs.scaffoldeth.io) to learn how to start building with Scaffold-ETH 2.

To know more about its features, check out our [website](https://scaffoldeth.io).

## Contributing to Scaffold-ETH 2

We welcome contributions to Scaffold-ETH 2!

Please see [CONTRIBUTING.MD](https://github.com/scaffold-eth/scaffold-eth-2/blob/main/CONTRIBUTING.md) for more information and guidelines for contributing to Scaffold-ETH 2.
