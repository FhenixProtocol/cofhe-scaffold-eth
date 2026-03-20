/* eslint-disable @typescript-eslint/no-unused-vars */
import assert from "node:assert/strict";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { Encryptable, FheTypes } from "@cofhe/sdk";

/**
 * @file FHECounter.test.ts
 * @description Test suite for the FHECounter contract demonstrating FHE operations and testing utilities
 *
 * This test suite showcases the use of FHE testing tools and utilities:
 * - hre.cofhe: Internal FHE testing utilities
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
      // hre.cofhe.mocks.enableLogs();
    });

    afterEach(function () {
      // NOTE: Uncomment for global logging
      // hre.cofhe.mocks.disableLogs()
    });

    /**
     * @dev Tests the basic increment functionality
     * Demonstrates:
     * - Reading encrypted values using hre.cofhe.mocks.expectPlaintext
     * - Logging FHE operations using hre.cofhe.mocks.withLogs
     */
    it("Should increment the counter", async function () {
      const { counter, bob } = await loadFixture(deployCounterFixture);
      const count = await counter.count();

      // `hre.cofhe.mocks.expectPlaintext` is used to verify that the encrypted value is 0
      // This uses the encrypted variable `count` and retrieves the plaintext value from the on-chain mock contracts
      // This kind of test can only be done in a mock environment where the plaintext value is known
      await hre.cofhe.mocks.expectPlaintext(count, 0n);

      // `hre.cofhe.mocks.withLogs` is used to log the FHE operations
      // This is useful for debugging and understanding the FHE operations
      // It will log the FHE operations to the console
      await hre.cofhe.mocks.withLogs("counter.increment()", async () => {
        await counter.connect(bob).increment();
      });

      const count2 = await counter.count();
      await hre.cofhe.mocks.expectPlaintext(count2, 1n);
    });

    /**
     * @dev Tests the cofhesdk unseal functionality in mock environment
     * Demonstrates:
     * - Initializing FHE with a Hardhat signer
     * - Reading with transparently unsealing encrypted values
     * - Verifying unsealed values match expectations
     */
    it("cofhesdk decrypt (mocks)", async function () {
      await hre.cofhe.mocks.enableLogs("cofhesdk decrypt (mocks)");
      const { counter, bob } = await loadFixture(deployCounterFixture);

      // `hre.cofhe.createClientWithBatteries` is used to initialize FHE with a Hardhat signer
      // Initialization is required before any `encrypt` or `decrypt` operations can be performed
      const client = await hre.cofhe.createClientWithBatteries(bob);

      const count = await counter.count();

      // Decryption is performed via `decryptForView(...).withPermit().execute()` which returns the plaintext value.
      const unsealed = await client.decryptForView(count, FheTypes.Uint32).withPermit().execute();
      assert.equal(unsealed, 0n);

      await counter.connect(bob).increment();

      const count2 = await counter.count();
      const unsealed2 = await client.decryptForView(count2, FheTypes.Uint32).withPermit().execute();
      assert.equal(unsealed2, 1n);

      await hre.cofhe.mocks.disableLogs();
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

      const client = await hre.cofhe.createClientWithBatteries(bob);

      // `encryptInputs(...).execute()` returns the encrypted inputs.
      const [encryptedInput] = await client.encryptInputs([Encryptable.uint32(5n)]).execute();
      await hre.cofhe.mocks.expectPlaintext(encryptedInput.ctHash, 5n);

      await counter.connect(bob).set(encryptedInput);

      const count = await counter.count();
      await hre.cofhe.mocks.expectPlaintext(count, 5n);

      const unsealed = await client.decryptForView(count, FheTypes.Uint32).withPermit().execute();
      assert.equal(unsealed, 5n);
    });
  });
});
