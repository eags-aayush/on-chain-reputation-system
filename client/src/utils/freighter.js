// ─── Freighter Wallet Utilities ───────────────────────────────────────────────
// Handles connecting the Freighter browser extension, fetching the public key,
// and signing XDR transactions.

import {
  isConnected,
  getPublicKey,
  signTransaction,
  setAllowed,
} from "@stellar/freighter-api";

/**
 * Check if Freighter extension is installed in the browser.
 */
export async function checkFreighterInstalled() {
  const connected = await isConnected();
  return connected;
}

/**
 * Request access to the user's Freighter wallet.
 * Returns the public key (Stellar address) on success.
 */
export async function connectWallet() {
  const installed = await checkFreighterInstalled();
  if (!installed) {
    throw new Error(
      "Freighter not found. Install it from https://freighter.app"
    );
  }

  // Ask user to allow the app
  await setAllowed();

  // Get the public key
  const publicKey = await getPublicKey();
  if (!publicKey) {
    throw new Error("Could not get public key from Freighter.");
  }

  return publicKey;
}

/**
 * Sign an XDR transaction string using Freighter.
 * Returns the signed XDR ready to submit.
 */
export async function signTx(xdr, networkPassphrase) {
  const signedXdr = await signTransaction(xdr, {
    networkPassphrase,
  });
  return signedXdr;
}
