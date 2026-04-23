# 🚀 On-Chain Reputation System

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
└── README.md
```

---

Wallet Address: GBAQHL4FI36WVWTSHEEGQHAHPAHQCBOI7NYKEFWFQ2QKOAINDBSWVEBT

Contract ID: CCAXMBDPDXWNKHO6MSFYII7IVQOGJABYTYPNARTP2CKNROGPPXY5LWBV

---

*Built for hackathons on Stellar Soroban. Ship fast, build trust, earn reputation.* 🚀
