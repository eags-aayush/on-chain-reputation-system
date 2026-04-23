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
