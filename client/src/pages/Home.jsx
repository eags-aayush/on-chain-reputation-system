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
