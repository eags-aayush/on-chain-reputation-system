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
