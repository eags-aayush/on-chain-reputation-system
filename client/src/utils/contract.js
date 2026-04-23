// ─── Contract Interaction Utilities ──────────────────────────────────────────
// Functions to read from and write to the Soroban reputation contract.

import * as StellarSdk from "@stellar/stellar-sdk";
import { CONFIG } from "../config";
import { signTx } from "./freighter";

// Set up the Soroban RPC server connection
const server = new StellarSdk.rpc.Server(CONFIG.RPC_URL);

/**
 * Read a user's reputation score from the contract.
 * This is a READ call — no transaction, no fee.
 *
 * @param {string} userPublicKey - Stellar public key of the user
 * @returns {number} reputation score
 */
export async function getScore(userPublicKey) {
  const contract = new StellarSdk.Contract(CONFIG.CONTRACT_ID);
  const userAddress = new StellarSdk.Address(userPublicKey);

  // Build the simulation call
  const operation = contract.call(
    "get_score",
    userAddress.toScVal()
  );

  // Use a dummy account for simulation (no real account needed for reads)
  const account = new StellarSdk.Account(userPublicKey, "0");
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  // Simulate the transaction (free read)
  const simResult = await server.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  // Parse the returned u64 value
  const resultVal = simResult.result?.retval;
  if (!resultVal) return 0;

  return StellarSdk.scValToNative(resultVal);
}

/**
 * Read a user's action history from the contract.
 * Also a READ call.
 *
 * @param {string} userPublicKey
 * @returns {string[]} list of action strings
 */
export async function getActions(userPublicKey) {
  const contract = new StellarSdk.Contract(CONFIG.CONTRACT_ID);
  const userAddress = new StellarSdk.Address(userPublicKey);

  const operation = contract.call("get_actions", userAddress.toScVal());
  const account = new StellarSdk.Account(userPublicKey, "0");
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(simResult)) return [];

  const resultVal = simResult.result?.retval;
  if (!resultVal) return [];

  return StellarSdk.scValToNative(resultVal);
}

/**
 * Submit a WRITE transaction to the contract (record_action or endorse).
 * This builds, simulates, signs with Freighter, and submits the transaction.
 *
 * @param {string} callerPublicKey - The user's wallet address
 * @param {string} functionName    - Contract function name
 * @param {any[]}  args            - ScVal arguments array
 * @returns {string} transaction hash
 */
export async function invokeContract(callerPublicKey, functionName, args) {
  const contract = new StellarSdk.Contract(CONFIG.CONTRACT_ID);

  // Fetch the real account sequence number from the network
  const account = await server.getAccount(callerPublicKey);

  // Build the transaction
  const operation = contract.call(functionName, ...args);
  let tx = new StellarSdk.TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  // Simulate to get the soroban data (required before submitting)
  const simResult = await server.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  // Assemble the real transaction with soroban data attached
  tx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();

  // Sign the XDR with Freighter wallet
  const signedXdr = await signTx(tx.toXDR(), CONFIG.NETWORK_PASSPHRASE);

  // Reconstruct the transaction from signed XDR
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    CONFIG.NETWORK_PASSPHRASE
  );

  // Submit to the network
  const sendResult = await server.sendTransaction(signedTx);
  if (sendResult.status === "ERROR") {
    throw new Error(`Submission failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  // Poll for confirmation
  const hash = sendResult.hash;
  let response = await server.getTransaction(hash);
  while (response.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 1000));
    response = await server.getTransaction(hash);
  }

  if (response.status === "FAILED") {
    throw new Error("Transaction failed on-chain.");
  }

  return hash;
}

/**
 * Record an on-chain action for the user.
 * Supported: "complete_task", "submit_review", "vote"
 */
export async function recordAction(userPublicKey, action) {
  const userAddress = new StellarSdk.Address(userPublicKey);
  return invokeContract(userPublicKey, "record_action", [
    userAddress.toScVal(),
    StellarSdk.nativeToScVal(action, { type: "string" }),
  ]);
}

/**
 * Endorse another user's wallet.
 */
export async function endorseUser(endorserPublicKey, targetPublicKey) {
  const endorserAddress = new StellarSdk.Address(endorserPublicKey);
  const targetAddress = new StellarSdk.Address(targetPublicKey);
  return invokeContract(endorserPublicKey, "endorse", [
    endorserAddress.toScVal(),
    targetAddress.toScVal(),
  ]);
}
