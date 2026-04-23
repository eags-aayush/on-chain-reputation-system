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
