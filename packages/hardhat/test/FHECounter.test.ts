/* eslint-disable @typescript-eslint/no-unused-vars */
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { Encryptable, FheTypes } from "@cofhe/sdk";

/**
 * @file FHECounter.test.ts
 * @description Test suite for the FHECounter contract demonstrating FHE operations and testing utilities
 *
 * This test suite showcases the use of FHE testing tools and utilities:
 * - hre.cofhesdk: Internal FHE testing utilities
 * - cofhe client: FHE operations interface
 * - Mock environment testing for FHE operations
 */

describe("Counter", function () {
  /**
   * @dev Deploys a fresh instance of the FHECounter contract for each test
   * Uses the third signer (bob) as the deployer
   */
  async function deployCounterFixture() {
    // Contracts are deployed using the first signer/account by default
    const [signer, signer2, bob, alice] = await hre.ethers.getSigners();

    const Counter = await hre.ethers.getContractFactory("FHECounter");
    const counter = await Counter.connect(bob).deploy();

    return { counter, signer, bob, alice };
  }

  describe("Functionality", function () {
    /**
     * @dev Setup and teardown for FHE testing
     * - Checks if we're in a MOCK environment (required for FHE testing)
     * - Provides options for enabling/disabling FHE operation logging
     */
    beforeEach(function () {
      // NOTE: Uncomment for global logging
      // hre.cofhesdk.mocks.enableLogs();
    });

    afterEach(function () {
      // NOTE: Uncomment for global logging
      // hre.cofhesdk.mocks.disableLogs()
    });

    /**
     * @dev Tests the basic increment functionality
     * Demonstrates:
     * - Reading encrypted values using hre.cofhesdk.mocks.expectPlaintext
     * - Logging FHE operations using hre.cofhesdk.mocks.withLogs
     */
    it("Should increment the counter", async function () {
      const { counter, bob } = await loadFixture(deployCounterFixture);
      const count = await counter.count();

      // `hre.cofhesdk.mocks.expectPlaintext` is used to verify that the encrypted value is 0
      // This uses the encrypted variable `count` and retrieves the plaintext value from the on-chain mock contracts
      // This kind of test can only be done in a mock environment where the plaintext value is known
      await hre.cofhesdk.mocks.expectPlaintext(count, 0n);

      // `hre.cofhesdk.mocks.withLogs` is used to log the FHE operations
      // This is useful for debugging and understanding the FHE operations
      // It will log the FHE operations to the console
      await hre.cofhesdk.mocks.withLogs("counter.increment()", async () => {
        await counter.connect(bob).increment();
      });

      const count2 = await counter.count();
      await hre.cofhesdk.mocks.expectPlaintext(count2, 1n);
    });

    /**
     * @dev Tests the cofhesdk unseal functionality in mock environment
     * Demonstrates:
     * - Initializing FHE with a Hardhat signer
     * - Reading with transparently unsealing encrypted values
     * - Verifying unsealed values match expectations
     */
    it("cofhesdk decrypt (mocks)", async function () {
      await hre.cofhesdk.mocks.enableLogs("cofhesdk decrypt (mocks)");
      const { counter, bob } = await loadFixture(deployCounterFixture);

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
      const count = await counter.count();

      // `decryptHandle` is used to unseal the encrypted value
      // the client must be initialized before `unseal` can be called
      const unsealedResult = await client.decryptHandle(count, FheTypes.Uint32).decrypt();

      // `hre.cofhesdk.expectResultValue` is used to verify that the `Result.data` is the expected value
      // If the `Result.data` is not the expected value, the test will fail
      await hre.cofhesdk.expectResultValue(unsealedResult, 0n);

      await counter.connect(bob).increment();

      const count2 = await counter.count();
      const unsealedResult2 = await client.decryptHandle(count2, FheTypes.Uint32).decrypt();
      await hre.cofhesdk.expectResultValue(unsealedResult2, 1n);

      await hre.cofhesdk.mocks.disableLogs();
    });

    /**
     * @dev Tests the cofhesdk encryption and value setting functionality
     * Demonstrates:
     * - Encrypting values using cofhesdk
     * - Setting encrypted values in the contract
     * - Verifying encrypted values using both mocks and unsealing
     */
    it("cofhesdk encrypt (mocks)", async function () {
      const { counter, bob } = await loadFixture(deployCounterFixture);

      const client = await hre.cofhesdk.createBatteriesIncludedCofhesdkClient(bob);

      await hre.cofhesdk.expectResultSuccess(client.initializationResults.keyFetchResult);

      // `encryptInputs` is used to encrypt the value
      // the client must be initialized before `encryptInputs` can be called
      const encryptResult = await client.encryptInputs([Encryptable.uint32(5n)]).encrypt();

      const [encryptedInput] = await hre.cofhesdk.expectResultSuccess(encryptResult);
      await hre.cofhesdk.mocks.expectPlaintext(encryptedInput.ctHash, 5n);

      await counter.connect(bob).set(encryptedInput);

      const count = await counter.count();
      await hre.cofhesdk.mocks.expectPlaintext(count, 5n);

      const unsealedResult = await client.decryptHandle(count, FheTypes.Uint32).decrypt();

      await hre.cofhesdk.expectResultValue(unsealedResult, 5n);
    });
  });
});
