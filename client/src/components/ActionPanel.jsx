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
