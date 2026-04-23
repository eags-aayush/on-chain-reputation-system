// ─── Config ──────────────────────────────────────────────────────────────────
// Replace CONTRACT_ID with your deployed contract address after deployment.

export const CONFIG = {
  CONTRACT_ID: import.meta.env.VITE_CONTRACT_ID,
  NETWORK: "testnet",
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  RPC_URL: "https://soroban-testnet.stellar.org",
  HORIZON_URL: "https://horizon-testnet.stellar.org",
};
