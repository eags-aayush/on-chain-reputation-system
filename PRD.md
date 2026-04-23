**# 🚀 Stellar Soroban Project Generator (Master Prompt)

# 🚀 On-Chain Reputation System — PRD.md

> **Hackathon-ready** · Stellar Soroban · React + Tailwind · Freighter Wallet · No Backend

---

## 1. 🧠 Project Overview

### What It Does

The **On-Chain Reputation System** is a decentralized application (dApp) built on the Stellar Soroban blockchain. Users accumulate reputation scores based on verifiable on-chain actions — such as completing tasks, peer endorsements, or participating in governance. Every score update is transparent, immutable, and composable, making it easy for other apps to query and use reputation data.

Think of it as a **trust layer for Web3** — your wallet address becomes your identity, and your reputation score becomes your social credit, earned honestly on-chain.

### Key Features

* 🔑 **Wallet-based Identity** — Connect with Freighter; your Stellar public key is your identity
* ⭐ **Reputation Scoring** — Accumulate points through tracked on-chain actions
* 📣 **Peer Endorsements** — Other users can endorse/vouch for you, adding to your score
* 📋 **Action Registry** — Predefined actions (e.g. "completed task", "reviewed code") each carry a point value
* 🔍 **Public Lookup** — Anyone can query any wallet's reputation score
* 🔌 **Composable API** — Any other dApp can read your score from the contract
* 📊 **Leaderboard** — Top reputation holders displayed on the frontend

### Target Users

* Hackathon builders wanting a plug-and-play reputation primitive
* Web3 projects needing a trust layer (DAOs, marketplaces, freelance platforms)
* Developers exploring Soroban smart contracts for the first time
* End users who want a portable, on-chain reputation identity

---

## 2. 🏗️ Tech Stack


| Layer               | Technology                                      |
| ------------------- | ----------------------------------------------- |
| **Frontend**        | React (JSX) + Tailwind CSS                      |
| **Blockchain**      | Stellar Soroban (Testnet)                       |
| **Wallet**          | Freighter Browser Extension                     |
| **Smart Contract**  | Rust (Soroban SDK)                              |
| **Contract Client** | `@stellar/stellar-sdk`+`@stellar/freighter-api` |
| **Build Tool**      | Vite                                            |
| **Package Manager** | npm                                             |

---

## 3. 📁 Folder Structure

```
on-chain-reputation-system/
│
├── contract/                          # Soroban smart contract (Rust)
│   ├── src/
│   │   └── lib.rs                     # Main contract logic
│   ├── Cargo.toml                     # Rust dependencies
│   └── Makefile                       # Build & deploy shortcuts
│
├── frontend/                          # React frontend
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx             # Top nav with wallet connect button
│   │   │   ├── ReputationCard.jsx     # Displays a user's score
│   │   │   ├── ActionPanel.jsx        # Buttons to perform actions & earn points
│   │   │   ├── EndorsePanel.jsx       # Endorse another wallet address
│   │   │   └── Leaderboard.jsx        # Top reputation holders
│   │   ├── pages/
│   │   │   ├── Home.jsx               # Main landing + dashboard
│   │   │   └── Profile.jsx            # Lookup any wallet's reputation
│   │   ├── utils/
│   │   │   ├── freighter.js           # Wallet connect / sign helpers
│   │   │   └── contract.js            # Contract read/write helpers
│   │   ├── config.js                  # Contract ID + network config
│   │   ├── App.jsx                    # Root component + routing
│   │   └── main.jsx                   # Vite entry point
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── implementation.md                  # Step-by-step setup guide
└── README.md
```

---

## 4. 🔗 Smart Contract (Soroban — Rust)

### `contract/Cargo.toml`

```toml
[package]
name = "reputation"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
soroban-sdk = { version = "20.0.0", features = ["alloc"] }

[dev-dependencies]
soroban-sdk = { version = "20.0.0", features = ["testutils"] }

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
debug-assertions = false
panic = "abort"
codegen-units = 1
lto = true

[profile.release-with-logs]
inherits = "release"
debug-assertions = true
```

### `contract/src/lib.rs`

```rust
#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, Map, String, Symbol, Vec, symbol_short,
};

// ─── Storage Keys ────────────────────────────────────────────────────────────

const SCORES: Symbol = symbol_short!("SCORES");       // Map<Address, u64>
const ACTIONS: Symbol = symbol_short!("ACTIONS");     // Map<Address, Vec<String>>
const ENDORSERS: Symbol = symbol_short!("ENDORSERS"); // Map<Address, Vec<Address>>
const ADMIN: Symbol = symbol_short!("ADMIN");         // Address (contract deployer)

// ─── Action Point Values ──────────────────────────────────────────────────────
// Each action name maps to a fixed point reward.
// Adjust these to tune your reputation economy.

const POINTS_COMPLETE_TASK: u64 = 10;
const POINTS_SUBMIT_REVIEW: u64 = 5;
const POINTS_VOTE: u64 = 3;
const POINTS_ENDORSE: u64 = 8; // Points given to the ENDORSED user

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct ReputationContract;

#[contractimpl]
impl ReputationContract {

    // ── Initialize ──────────────────────────────────────────────────────────
    // Call once after deployment to set the admin address.
    pub fn initialize(env: Env, admin: Address) {
        // Prevent re-initialization
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
    }

    // ── Record Action ────────────────────────────────────────────────────────
    // A user calls this to record an action and earn reputation points.
    // Supported actions: "complete_task", "submit_review", "vote"
    pub fn record_action(env: Env, user: Address, action: String) -> u64 {
        // The caller must authorize this call (only the user can record their own action)
        user.require_auth();

        // Determine points for this action
        let points: u64 = Self::action_to_points(&action);
        if points == 0 {
            panic!("unknown action type");
        }

        // Update the user's score
        let new_score = Self::add_score(&env, &user, points);

        // Log the action in the user's history
        Self::log_action(&env, &user, action);

        new_score
    }

    // ── Endorse User ─────────────────────────────────────────────────────────
    // endorser calls this to vouch for target_user.
    // target_user gains POINTS_ENDORSE points.
    // An address can only endorse the same target once.
    pub fn endorse(env: Env, endorser: Address, target_user: Address) -> u64 {
        endorser.require_auth();

        // Prevent self-endorsement
        if endorser == target_user {
            panic!("cannot endorse yourself");
        }

        // Load existing endorsers for target_user
        let mut endorsers: Vec<Address> = env
            .storage()
            .persistent()
            .get(&(&ENDORSERS, &target_user))
            .unwrap_or(Vec::new(&env));

        // Prevent duplicate endorsement
        if endorsers.contains(&endorser) {
            panic!("already endorsed this user");
        }

        endorsers.push_back(endorser);
        env.storage()
            .persistent()
            .set(&(&ENDORSERS, &target_user), &endorsers);

        // Award points to the endorsed user
        Self::add_score(&env, &target_user, POINTS_ENDORSE)
    }

    // ── Get Score ────────────────────────────────────────────────────────────
    // Read any user's current reputation score. Public, no auth needed.
    pub fn get_score(env: Env, user: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&(&SCORES, &user))
            .unwrap_or(0)
    }

    // ── Get Action History ───────────────────────────────────────────────────
    // Returns a list of action strings performed by the user.
    pub fn get_actions(env: Env, user: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&(&ACTIONS, &user))
            .unwrap_or(Vec::new(&env))
    }

    // ── Get Endorser Count ───────────────────────────────────────────────────
    // Returns how many unique addresses have endorsed this user.
    pub fn get_endorser_count(env: Env, user: Address) -> u32 {
        let endorsers: Vec<Address> = env
            .storage()
            .persistent()
            .get(&(&ENDORSERS, &user))
            .unwrap_or(Vec::new(&env));
        endorsers.len()
    }

    // ── Admin: Manually Award Points ─────────────────────────────────────────
    // Only the admin can call this (for special rewards, partnerships, etc.)
    pub fn admin_award(env: Env, admin: Address, user: Address, points: u64) -> u64 {
        admin.require_auth();

        // Verify the caller is actually the stored admin
        let stored_admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if admin != stored_admin {
            panic!("not admin");
        }

        Self::add_score(&env, &user, points)
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    fn add_score(env: &Env, user: &Address, points: u64) -> u64 {
        let current: u64 = env
            .storage()
            .persistent()
            .get(&(&SCORES, user))
            .unwrap_or(0);
        let new_score = current + points;
        env.storage()
            .persistent()
            .set(&(&SCORES, user), &new_score);
        new_score
    }

    fn log_action(env: &Env, user: &Address, action: String) {
        let mut history: Vec<String> = env
            .storage()
            .persistent()
            .get(&(&ACTIONS, user))
            .unwrap_or(Vec::new(env));
        history.push_back(action);
        env.storage()
            .persistent()
            .set(&(&ACTIONS, user), &history);
    }

    fn action_to_points(action: &String) -> u64 {
        // Match action string to point value
        // Extend this list to add more action types
        let action_str = action.to_string();
        match action_str.as_str() {
            "complete_task"  => POINTS_COMPLETE_TASK,
            "submit_review"  => POINTS_SUBMIT_REVIEW,
            "vote"           => POINTS_VOTE,
            _                => 0,
        }
    }
}
```

### `contract/Makefile`

```makefile
# Shortcuts for building and deploying the contract

build:
	cargo build --target wasm32-unknown-unknown --release

deploy-testnet:
	soroban contract deploy \
		--wasm target/wasm32-unknown-unknown/release/reputation.wasm \
		--source default \
		--network testnet

test:
	cargo test
```

---

## 5. 🎨 Frontend Code

### `frontend/src/config.js`

```js
// ─── Config ──────────────────────────────────────────────────────────────────
// Replace CONTRACT_ID with your deployed contract address after deployment.

export const CONFIG = {
  CONTRACT_ID: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  NETWORK: "testnet",
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  RPC_URL: "https://soroban-testnet.stellar.org",
  HORIZON_URL: "https://horizon-testnet.stellar.org",
};
```

---

### `frontend/src/utils/freighter.js`

```js
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
```

---

### `frontend/src/utils/contract.js`

```js
// ─── Contract Interaction Utilities ──────────────────────────────────────────
// Functions to read from and write to the Soroban reputation contract.

import * as StellarSdk from "@stellar/stellar-sdk";
import { CONFIG } from "../config";
import { signTx } from "./freighter";

// Set up the Soroban RPC server connection
const server = new StellarSdk.SorobanRpc.Server(CONFIG.RPC_URL);

/**
 * Read a user's reputation score from the contract.
 * This is a READ call — no transaction, no fee.
 *
 * @param {string} userPublicKey - Stellar public key of the user
 * @returns {number} reputation score
 */
export async function getScore(userPublicKey) {
  const contract = new StellarSdk.Contract(CONFIG.CONTRACT_ID);
  const userAddress = StellarSdk.Address.fromString(userPublicKey);

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
  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResult)) {
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
  const userAddress = StellarSdk.Address.fromString(userPublicKey);

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
  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResult)) return [];

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
  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  // Assemble the real transaction with soroban data attached
  tx = StellarSdk.SorobanRpc.assembleTransaction(tx, simResult).build();

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
  const userAddress = StellarSdk.Address.fromString(userPublicKey);
  return invokeContract(userPublicKey, "record_action", [
    userAddress.toScVal(),
    StellarSdk.nativeToScVal(action, { type: "string" }),
  ]);
}

/**
 * Endorse another user's wallet.
 */
export async function endorseUser(endorserPublicKey, targetPublicKey) {
  const endorserAddress = StellarSdk.Address.fromString(endorserPublicKey);
  const targetAddress = StellarSdk.Address.fromString(targetPublicKey);
  return invokeContract(endorserPublicKey, "endorse", [
    endorserAddress.toScVal(),
    targetAddress.toScVal(),
  ]);
}
```

---

### `frontend/src/components/Navbar.jsx`

```jsx
// ─── Navbar ───────────────────────────────────────────────────────────────────
// Shows the app title and wallet connect/disconnect button.

import React from "react";

export default function Navbar({ walletAddress, onConnect, onDisconnect }) {
  // Shorten address for display: GABCD...WXYZ
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 5)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <nav className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
      {/* App title */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">⭐</span>
        <h1 className="text-white font-bold text-xl tracking-tight">
          OnChain Rep
        </h1>
        <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
          Testnet
        </span>
      </div>

      {/* Wallet connect button */}
      {walletAddress ? (
        <div className="flex items-center gap-3">
          <span className="text-green-400 text-sm font-mono">{shortAddress}</span>
          <button
            onClick={onDisconnect}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={onConnect}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm px-5 py-2 rounded-lg transition"
        >
          Connect Freighter
        </button>
      )}
    </nav>
  );
}
```

---

### `frontend/src/components/ReputationCard.jsx`

```jsx
// ─── ReputationCard ───────────────────────────────────────────────────────────
// Displays the current user's reputation score and action history.

import React from "react";

export default function ReputationCard({ score, actions, loading }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-4">
      {/* Score display */}
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">
          Your Reputation Score
        </p>
        {loading ? (
          <div className="h-16 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <p className="text-6xl font-bold text-purple-400">{score ?? 0}</p>
        )}
        <p className="text-gray-500 text-xs mt-1">points</p>
      </div>

      {/* Score tiers */}
      <div className="flex justify-around text-center text-xs text-gray-400 border-t border-gray-700 pt-4">
        <div>
          <p className="text-yellow-400 font-semibold">🥉 Bronze</p>
          <p>0–49 pts</p>
        </div>
        <div>
          <p className="text-gray-300 font-semibold">🥈 Silver</p>
          <p>50–199 pts</p>
        </div>
        <div>
          <p className="text-yellow-300 font-semibold">🥇 Gold</p>
          <p>200+ pts</p>
        </div>
      </div>

      {/* Action history */}
      {actions && actions.length > 0 && (
        <div className="border-t border-gray-700 pt-4">
          <p className="text-gray-400 text-xs uppercase mb-2">Recent Actions</p>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
            {actions.slice(-5).reverse().map((action, i) => (
              <span
                key={i}
                className="bg-gray-700 text-gray-200 text-xs px-3 py-1 rounded-full w-fit"
              >
                ✅ {action.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### `frontend/src/components/ActionPanel.jsx`

```jsx
// ─── ActionPanel ──────────────────────────────────────────────────────────────
// Buttons for the user to perform on-chain actions and earn reputation points.

import React, { useState } from "react";
import { recordAction } from "../utils/contract";

// Available actions with their labels, point values, and descriptions
const ACTIONS = [
  {
    id: "complete_task",
    label: "Complete a Task",
    points: 10,
    emoji: "✅",
    desc: "Mark a task as done",
  },
  {
    id: "submit_review",
    label: "Submit a Review",
    points: 5,
    emoji: "📝",
    desc: "Review someone's work",
  },
  {
    id: "vote",
    label: "Cast a Vote",
    points: 3,
    emoji: "🗳️",
    desc: "Participate in governance",
  },
];

export default function ActionPanel({ walletAddress, onActionComplete }) {
  const [loading, setLoading] = useState(null); // tracks which action is loading
  const [status, setStatus] = useState(null);

  async function handleAction(actionId) {
    if (!walletAddress) return alert("Connect your wallet first!");

    setLoading(actionId);
    setStatus(null);

    try {
      const hash = await recordAction(walletAddress, actionId);
      setStatus({ type: "success", msg: `Transaction confirmed! Hash: ${hash.slice(0, 16)}...` });
      onActionComplete?.(); // refresh score
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-4">
      <h2 className="text-white font-semibold text-lg">⚡ Earn Reputation</h2>

      <div className="flex flex-col gap-3">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id)}
            disabled={!!loading}
            className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-3 rounded-xl transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{action.emoji}</span>
              <div className="text-left">
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-gray-400 text-xs">{action.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loading === action.id ? (
                <div className="animate-spin h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full" />
              ) : (
                <span className="text-purple-400 text-sm font-bold">+{action.points} pts</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Status message */}
      {status && (
        <p
          className={`text-xs mt-2 px-3 py-2 rounded-lg ${
            status.type === "success"
              ? "bg-green-900 text-green-300"
              : "bg-red-900 text-red-300"
          }`}
        >
          {status.type === "success" ? "✅" : "❌"} {status.msg}
        </p>
      )}
    </div>
  );
}
```

---

### `frontend/src/components/EndorsePanel.jsx`

```jsx
// ─── EndorsePanel ─────────────────────────────────────────────────────────────
// Lets the user endorse another Stellar wallet address.

import React, { useState } from "react";
import { endorseUser } from "../utils/contract";

export default function EndorsePanel({ walletAddress, onEndorseComplete }) {
  const [targetAddress, setTargetAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleEndorse() {
    if (!walletAddress) return alert("Connect your wallet first!");
    if (!targetAddress.trim()) return alert("Enter a wallet address to endorse.");
    if (targetAddress === walletAddress) return alert("You can't endorse yourself!");

    setLoading(true);
    setStatus(null);

    try {
      const hash = await endorseUser(walletAddress, targetAddress.trim());
      setStatus({ type: "success", msg: `Endorsed! Tx: ${hash.slice(0, 16)}...` });
      setTargetAddress("");
      onEndorseComplete?.();
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-4">
      <h2 className="text-white font-semibold text-lg">🤝 Endorse a User</h2>
      <p className="text-gray-400 text-sm">
        Vouch for a wallet address. They'll receive +8 reputation points.
      </p>

      <input
        type="text"
        placeholder="Enter Stellar address (G...)"
        value={targetAddress}
        onChange={(e) => setTargetAddress(e.target.value)}
        className="bg-gray-700 text-white placeholder-gray-500 text-sm px-4 py-3 rounded-xl border border-gray-600 focus:outline-none focus:border-purple-500"
      />

      <button
        onClick={handleEndorse}
        disabled={loading || !targetAddress}
        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm px-5 py-3 rounded-xl transition"
      >
        {loading ? "Endorsing..." : "Endorse ⭐"}
      </button>

      {status && (
        <p
          className={`text-xs px-3 py-2 rounded-lg ${
            status.type === "success"
              ? "bg-green-900 text-green-300"
              : "bg-red-900 text-red-300"
          }`}
        >
          {status.type === "success" ? "✅" : "❌"} {status.msg}
        </p>
      )}
    </div>
  );
}
```

---

### `frontend/src/pages/Home.jsx`

```jsx
// ─── Home Page ────────────────────────────────────────────────────────────────
// Main dashboard: shows the user's score, actions, and endorsement panel.

import React, { useEffect, useState } from "react";
import ReputationCard from "../components/ReputationCard";
import ActionPanel from "../components/ActionPanel";
import EndorsePanel from "../components/EndorsePanel";
import { getScore, getActions } from "../utils/contract";

export default function Home({ walletAddress }) {
  const [score, setScore] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch score + actions whenever the wallet changes
  useEffect(() => {
    if (walletAddress) {
      fetchData();
    } else {
      setScore(null);
      setActions([]);
    }
  }, [walletAddress]);

  async function fetchData() {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        getScore(walletAddress),
        getActions(walletAddress),
      ]);
      setScore(Number(s));
      setActions(a);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <p className="text-6xl mb-4">⭐</p>
        <h2 className="text-white text-2xl font-bold mb-2">
          Your On-Chain Reputation Awaits
        </h2>
        <p className="text-gray-400 max-w-md">
          Connect your Freighter wallet to view your reputation score, earn points
          through actions, and endorse other users.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left column */}
      <div className="flex flex-col gap-6">
        <ReputationCard score={score} actions={actions} loading={loading} />
        <EndorsePanel walletAddress={walletAddress} onEndorseComplete={fetchData} />
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-6">
        <ActionPanel walletAddress={walletAddress} onActionComplete={fetchData} />

        {/* Wallet info card */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-gray-400 text-xs uppercase mb-3">Your Wallet</h3>
          <p className="text-white font-mono text-sm break-all">{walletAddress}</p>
          <a
            href={`https://stellar.expert/explorer/testnet/account/${walletAddress}`}
            target="_blank"
            rel="noreferrer"
            className="text-purple-400 text-xs hover:underline mt-2 inline-block"
          >
            View on Stellar Expert →
          </a>
        </div>
      </div>
    </div>
  );
}
```

---

### `frontend/src/App.jsx`

```jsx
// ─── App Root ─────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import { connectWallet } from "./utils/freighter";

export default function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [error, setError] = useState(null);

  async function handleConnect() {
    try {
      setError(null);
      const address = await connectWallet();
      setWalletAddress(address);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDisconnect() {
    setWalletAddress(null);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar
        walletAddress={walletAddress}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      {/* Error banner */}
      {error && (
        <div className="bg-red-900 text-red-200 text-sm text-center py-2 px-4">
          ❌ {error}
        </div>
      )}

      <main>
        <Home walletAddress={walletAddress} />
      </main>
    </div>
  );
}
```

---

### `frontend/src/main.jsx`

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

### `frontend/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OnChain Reputation System</title>
    <link rel="icon" href="/favicon.ico" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

### `frontend/tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

---

### `frontend/vite.config.js`

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    // Required for stellar-sdk to work in the browser
    global: "globalThis",
  },
});
```

---

### `frontend/package.json`

```json
{
  "name": "on-chain-reputation-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@stellar/freighter-api": "^2.0.0",
    "@stellar/stellar-sdk": "^12.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "vite": "^5.0.0"
  }
}
```

---

### `frontend/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 6. 🔌 Wallet Integration

### How Freighter Works

Freighter is a browser extension wallet for Stellar. When installed, it injects an API into the browser that lets your dApp:

1. Check if the extension is installed
2. Request the user's permission to connect
3. Get their public key (Stellar address)
4. Sign XDR-encoded transactions without exposing the private key

### Connection Flow

```
User clicks "Connect Freighter"
        ↓
checkFreighterInstalled() → throws if not installed
        ↓
setAllowed() → prompts user in extension popup
        ↓
getPublicKey() → returns G... address
        ↓
Store address in React state → UI updates
```

### Signing a Transaction

```js
// 1. Build the transaction (done in contract.js)
const tx = new TransactionBuilder(...).addOperation(...).build();

// 2. Simulate to attach Soroban data
const simResult = await server.simulateTransaction(tx);
const assembledTx = assembleTransaction(tx, simResult).build();

// 3. Sign with Freighter (prompts user's wallet popup)
const signedXdr = await signTransaction(assembledTx.toXDR(), {
  networkPassphrase: "Test SDF Network ; September 2015"
});

// 4. Submit signed transaction
await server.sendTransaction(signedTx);
```

The user only interacts with a popup — their private key never leaves the extension.

---

## 7. 📡 Contract Interaction Layer

### Summary of Utility Functions


| Function                           | Type        | Description                              |
| ---------------------------------- | ----------- | ---------------------------------------- |
| `getScore(publicKey)`              | READ (free) | Returns user's current score as a number |
| `getActions(publicKey)`            | READ (free) | Returns array of past action strings     |
| `recordAction(publicKey, action)`  | WRITE (tx)  | Records an action, earns points          |
| `endorseUser(endorser, target)`    | WRITE (tx)  | Endorses a user, they earn +8 pts        |
| `invokeContract(caller, fn, args)` | WRITE (tx)  | Generic contract invoker used internally |

### Flow for WRITE calls

```
invokeContract(caller, functionName, args)
        ↓
Fetch account sequence → build tx → simulate tx
        ↓
assembleTransaction (attaches Soroban footprint)
        ↓
signTx via Freighter (user approves in popup)
        ↓
server.sendTransaction (submit to network)
        ↓
Poll server.getTransaction until CONFIRMED or FAILED
        ↓
Return transaction hash
```

---

## 8. 🛠️ Deployment Guide

### Contract Deployment

#### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install Soroban CLI
cargo install --locked soroban-cli --features opt
```

#### Step 1 — Generate a testnet identity

```bash
soroban keys generate --global default --network testnet
soroban keys fund default --network testnet
```

#### Step 2 — Build the contract

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
```

The compiled WASM file will be at: `target/wasm32-unknown-unknown/release/reputation.wasm`

#### Step 3 — Deploy to testnet

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/reputation.wasm \
  --source default \
  --network testnet
```

Copy the contract ID that's printed (starts with `C`).

#### Step 4 — Initialize the contract

```bash
soroban contract invoke \
  --id <YOUR_CONTRACT_ID> \
  --source default \
  --network testnet \
  -- initialize \
  --admin $(soroban keys address default)
```

---

### Frontend Deployment

#### Step 1 — Set the contract ID

Edit `frontend/src/config.js`:

```js
export const CONFIG = {
  CONTRACT_ID: "C<YOUR_CONTRACT_ID_HERE>",
  ...
};
```

#### Step 2 — Install dependencies and run

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 9. 📄 implementation.md Content

```markdown
# 🛠️ Implementation Guide — On-Chain Reputation System

## Step 1: Install System Dependencies

### Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

### Add WASM build target
rustup target add wasm32-unknown-unknown

### Install Soroban CLI
cargo install --locked soroban-cli --features opt

### Verify CLI installation
soroban --version

### Install Node.js (v18+)
# Download from https://nodejs.org or use nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

---

## Step 2: Setup Soroban CLI for Testnet

### Configure the testnet network
soroban network add \
  --global testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

### Generate a local keypair (your deployer identity)
soroban keys generate --global default --network testnet

### Fund the account with testnet XLM (Friendbot)
soroban keys fund default --network testnet

### Confirm your address
soroban keys address default

---

## Step 3: Build the Contract

cd contract

### Build optimized WASM binary
cargo build --target wasm32-unknown-unknown --release

### (Optional) Run unit tests
cargo test

---

## Step 4: Deploy the Contract

### Deploy to Stellar testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/reputation.wasm \
  --source default \
  --network testnet

### SAVE the printed Contract ID — you'll need it next!
# Example: CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

### Initialize the contract (set admin)
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source default \
  --network testnet \
  -- initialize \
  --admin $(soroban keys address default)

---

## Step 5: Setup the Frontend

cd ../frontend

### Install npm packages
npm install

### Edit the config file with your contract ID
# Open frontend/src/config.js and paste your CONTRACT_ID

---

## Step 6: Connect Freighter Wallet

1. Install Freighter browser extension from https://freighter.app
2. Create or import a Stellar wallet
3. Switch Freighter to **Testnet** mode:
   - Click the network selector in Freighter
   - Select "Test SDF Network"
4. Fund your Freighter wallet with testnet XLM:
   - Visit https://laboratory.stellar.org/#account-creator?network=test
   - Paste your public key and click "Create Account"

---

## Step 7: Run the Project

### Start the dev server
npm run dev

### Open in browser
http://localhost:5173

### Test the flow:
1. Click "Connect Freighter" in the navbar
2. Approve the connection in the Freighter popup
3. Click "Complete a Task" to earn 10 points
4. Approve the transaction in Freighter
5. Wait ~5 seconds for confirmation
6. Your score updates automatically!
7. Try endorsing a different wallet address

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Freighter not found" | Install the extension from freighter.app |
| Transaction fails | Make sure Freighter is on Testnet |
| Score doesn't update | Wait 5–10 seconds, then refresh |
| Build error | Run `rustup update` and try again |
| Simulation error | Check CONTRACT_ID is correct in config.js |
```

---

## 10. ⚡ DX Boost

### Developer Tips

**Copy-paste ready commands** — every shell command in this document runs as-is with no modification except pasting your contract ID.

**Comment density** — every function in both the Rust contract and JS utilities has a comment explaining what it does and why.

**Error messages are human-readable** — every `try/catch` in the frontend shows the actual error message to the user so debugging is fast.

**Separate read vs. write** — `getScore` and `getActions` are free simulation calls. Only `recordAction` and `endorseUser` cost XLM gas. This keeps dev costs low.

**Modular structure** — `freighter.js` is purely wallet logic. `contract.js` is purely contract logic. Components just call these utils. Easy to swap or extend.

**Testnet throughout** — the entire stack runs on Stellar Testnet with free XLM from Friendbot. No real money needed for the hackathon.

### Extending the Project


| Feature           | What to add                                                |
| ----------------- | ---------------------------------------------------------- |
| More action types | Add cases to`action_to_points()`in`lib.rs`                 |
| Leaderboard       | Store top addresses in a`Vec<Address>`on-chain             |
| NFT badges        | Mint Stellar NFTs at score milestones                      |
| DAO integration   | Gate votes by minimum reputation score                     |
| Profile lookup    | Add a search input in`Profile.jsx`to look up any G-address |

### Hackathon Checklist

* [ ]  Freighter installed and set to Testnet
* [ ]  Testnet XLM funded via Friendbot
* [ ]  Contract deployed and initialized
* [ ]  `CONTRACT_ID` pasted into `config.js`
* [ ]  `npm install && npm run dev` runs clean
* [ ]  Score increments after recording an action
* [ ]  Endorsement sends a second wallet address reputation points

---

*Built for hackathons on Stellar Soroban. Ship fast, build trust, earn rep.* 🚀

You are an expert Web3 developer specializing in Stellar Soroban smart contracts and modern frontend development.

I want you to generate a COMPLETE developer-ready [PRD.md](http://prd.md) based on the following input:

---

## 📌 PROJECT INPUT

Project Name: On Chain Reputation System

Project Idea: on-chain-reputation-system

Idea: Users get reputation scores based on actions.

Why it's cool: Social + Web3 combo, Can plug into other apps

---

## 🎯 GOAL

Generate a FULL project setup that includes:

\* Frontend (React + Tailwind)

\* Soroban Smart Contract (Rust)

\* Wallet integration using Freighter

\* No backend (only frontend + contract)

\* Clean DX (developer experience)

---

## 📦 OUTPUT FORMAT (STRICT)

### 1. 🧠 Project Overview

\* Explain what the app does

\* Key features (bullet points)

\* Target users

---

### 2. 🏗️ Tech Stack

\* Frontend: React + Tailwind CSS

\* Blockchain: Stellar Soroban

\* Wallet: Freighter Wallet

\* Language: Rust (contract)

---

### 3. 📁 Folder Structure

Provide a clean folder structure like:

project-root/

│

├── contract/

│   ├── src/

│   │   └── lib.rs

│   └── Cargo.toml

│

├── frontend/

│   ├── src/

│   │   ├── components/

│   │   ├── pages/

│   │   ├── utils/

│   │   └── App.jsx

│   └── package.json

---

### 4. 🔗 Smart Contract (Soroban)

\* Full Rust contract code

\* Functions based on project idea

\* Use simple storage (maps, vectors)

\* Include comments

---

### 5. 🎨 Frontend Code

\* React components

\* Wallet connect (Freighter)

\* Contract interaction

\* Clean UI using Tailwind

\* Keep minimal but working

---

### 6. 🔌 Wallet Integration

\* Show how to connect Freighter

\* Get user public key

\* Sign transactions

---

### 7. 📡 Contract Interaction Layer

\* JS utility functions:

\* call contract

\* send transaction

\* read data

---

### 8. 🛠️ Deployment Guide

#### Contract Deployment:

\* Build contract

\* Deploy to Stellar testnet

\* Get contract ID

#### Frontend:

\* Add contract ID in config

\* Run locally

---

### 9. 📄 implementation.md CONTENT

Write a full step-by-step guide:

\* Step 1: Install dependencies

\* Step 2: Setup Soroban CLI

\* Step 3: Build contract

\* Step 4: Deploy contract

\* Step 5: Setup frontend

\* Step 6: Connect wallet

\* Step 7: Run project

---

### 10. ⚡ DX BOOST (IMPORTANT)

\* Keep code beginner-friendly

\* Avoid over-engineering

\* Make everything copy-paste runnable

\* Add comments everywhere

---

## ⚠️ RULES

\* Do NOT include backend

\* Do NOT skip any section

\* Output must be structured and clean

\* Code must be complete and runnable

\* Assume user is building for a hackathon

---

Now generate the full project.

**
