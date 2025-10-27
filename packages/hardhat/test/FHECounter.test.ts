/* eslint-disable @typescript-eslint/no-unused-vars */
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
// import { Encryptable, FheTypes, type CofhesdkClient, type Result, CofhesdkErrorCode, CofhesdkError } from '@/core';
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { arbSepolia } from "@cofhe/sdk/chains";
// import { cofhejs } from "cofhejs/node";
import cofhesdk from "@cofhe/sdk";

/**
 * @file FHECounter.test.ts
 * @description Test suite for the FHECounter contract demonstrating FHE operations and testing utilities
 *
 * This test suite showcases the use of FHE testing tools and utilities:
 * - hre.cofhe: Internal FHE testing utilities
 * - cofhejs: FHE operations library
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
      // if (!hre.cofhesdk.isPermittedEnvironment("MOCK")) this.skip();
      // NOTE: Uncomment for global logging
      // hre.cofhe.mocks.enableLogs()
    });

    afterEach(function () {
      // if (!hre.cofhe.isPermittedEnvironment("MOCK")) return;
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
      await hre.cofhesdk.mocks.expectPlaintext(count, 0n);

      // `hre.cofhe.mocks.withLogs` is used to log the FHE operations
      // This is useful for debugging and understanding the FHE operations
      // It will log the FHE operations to the console
      await hre.cofhesdk.mocks.withLogs("counter.increment()", async () => {
        await counter.connect(bob).increment();
      });

      const count2 = await counter.count();
      await hre.cofhesdk.mocks.expectPlaintext(count2, 1n);
    });

    /**
     * @dev Tests the cofhejs unseal functionality in mock environment
     * Demonstrates:
     * - Initializing FHE with a Hardhat signer
     * - Reading and unsealing encrypted values
     * - Verifying unsealed values match expectations
     */
    // it("cofhejs unseal (mocks)", async function () {
    //   await hre.cofhesdk.mocks.enableLogs("cofhejs unseal (mocks)");
    //   const { counter, bob } = await loadFixture(deployCounterFixture);

    //   // `hre.cofhe.initializeWithHardhatSigner` is used to initialize FHE with a Hardhat signer
    //   // Initialization is required before any `cofhejs.unseal` or `cofhejs.encrypt` operations can be performed
    //   // `initializeWithHardhatSigner` is a helper function that initializes FHE with a Hardhat signer
    //   // It returns a `Promise<Result<>>` type.

    //   // The `Result<T>` type looks like this:
    //   // {
    //   //   success: boolean,
    //   //   data: T (Permit | undefined in the case of initializeWithHardhatSigner),
    //   //   error: CofhejsError | null,
    //   // }
    //   const initializeResult = await hre.cofhesdk.initializeWithHardhatSigner(bob);

    //   // `hre.cofhe.expectResultSuccess` is used to verify that the `Result` is successful (success: true)
    //   // If the `Result` is not successful, the test will fail
    //   await hre.cofhesdk.expectResultSuccess(initializeResult);

    //   const count = await counter.count();

    //   // `cofhejs.unseal` is used to unseal the encrypted value
    //   // cofhejs must be initialized before `unseal` can be called
    //   const unsealedResult = await cofhesdk.unseal(count, FheTypes.Uint32);

    //   // `hre.cofhe.expectResultValue` is used to verify that the `Result.data` is the expected value
    //   // If the `Result.data` is not the expected value, the test will fail
    //   await hre.cofhe.expectResultValue(unsealedResult, 0n);

    //   await counter.connect(bob).increment();

    //   const count2 = await counter.count();
    //   const unsealedResult2 = await cofhejs.unseal(count2, FheTypes.Uint32);
    //   await hre.cofhe.expectResultValue(unsealedResult2, 1n);

    //   await hre.cofhe.mocks.disableLogs();
    // });

    // /**
    //  * @dev Tests the cofhejs encryption and value setting functionality
    //  * Demonstrates:
    //  * - Encrypting values using cofhejs
    //  * - Setting encrypted values in the contract
    //  * - Verifying encrypted values using both mocks and unsealing
    //  */
    it("cofhejs encrypt (mocks)", async function () {
      const { counter, bob } = await loadFixture(deployCounterFixture);

      const { publicClient, walletClient } = await hre.cofhesdk.hardhatSignerAdapter(bob);
      // await hre.cofhesdk.expectResultSuccess(initializeResult);

      // `cofhejs.encrypt` is used to encrypt the value
      // cofhejs must be initialized before `encrypt` can be called
      const config = await hre.cofhesdk.createCofhesdkConfig({
        supportedChains: [
          {
            name: "test",
            environment: "MOCK",
            coFheUrl: "https://should-be-removed.example.com",
            verifierUrl: "https://should-be-removed.example.com",
            thresholdNetworkUrl: "https://should-be-removed.example.com",
            id: 31337,
            network: "test",
          },
        ],
        // permitGeneration: "ON_CONNECT",
      });

      console.log("CONFIG", config);
      const cofhesdkClient = hre.cofhesdk.createCofhesdkClient(config);

      await cofhesdkClient.connect(publicClient, walletClient);

      const encryptResult = await cofhesdkClient.encryptInputs([Encryptable.uint32(5n)]).encrypt();

      const [encryptedInput] = await hre.cofhesdk.expectResultSuccess(encryptResult);
      await hre.cofhesdk.mocks.expectPlaintext(encryptedInput.ctHash, 5n);

      await counter.connect(bob).set(encryptedInput);

      const count = await counter.count();
      await hre.cofhesdk.mocks.expectPlaintext(count, 5n);

      const permit = (await cofhesdkClient.permits.createSelf({ issuer: bob.address })).data;
      const active_permit = await cofhesdkClient.permits.getActivePermit();
      const active_permit_data = active_permit.data;
      console.log("ACTIVE PERMIT", active_permit);
      // debugger;
      if (!active_permit_data) throw new Error("No permit");
      const unsealedResult = await cofhesdkClient
        .decryptHandle(count, FheTypes.Uint32)
        .setPermit(active_permit_data)
        .setChainId(31337) // optional
        .setAccount(bob.address) // optional
        .decrypt();
      console.log("UNSEALED RESULT", unsealedResult);
      debugger;

      await hre.cofhesdk.expectResultValue(unsealedResult, 5n);
    });
  });
});
