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
