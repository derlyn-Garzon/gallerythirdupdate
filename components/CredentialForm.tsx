'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { encryptData } from '@/utils/crypto';
import { Globe, User, KeyRound, Lock, Send, RefreshCw, Check, Code } from 'lucide-react';

export default function CredentialForm() {
  const { masterKey, addCredential, lastNetworkPayload, clearNetworkPayload } = useAuth();

  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNetworkLog, setShowNetworkLog] = useState(false);

  // Helper to generate a random strong password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const array = new Uint32Array(16);
    window.crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < array.length; i++) {
      result += chars[array[i] % chars.length];
    }
    setPassword(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterKey) {
      setError('Vault key not found in memory. Please login again.');
      return;
    }

    if (!site || !username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setError(null);
      setIsEncrypting(true);

      // CPU-LEVEL ENCRYPTION BOUNDARY:
      // Intercept plain text password and encrypt it locally using the memory-resident CryptoKey
      const encrypted = await encryptData(password, masterKey);

      // Exact network payload schema:
      // { "site": string, "username": string, "encryptedPassword": "Base64String", "iv": "Base64String" }
      // Simulating fetch POST request payload to Vercel Serverless Function
      addCredential(site, username, encrypted.ciphertext, encrypted.iv);

      // Clear password input immediately after encryption to purge plain text from component state
      setPassword('');
      setSite('');
      setUsername('');
      setShowNetworkLog(true);
    } catch (err: unknown) {
      console.error('Credential encryption failed:', err);
      setError('Failed to encrypt credential using Web Crypto API.');
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              Add New Credential
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Password will be encrypted client-side using AES-GCM before payload dispatch.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 uppercase tracking-wider">
            Zero-Knowledge Active
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Website/Service Input */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 uppercase tracking-wider">
                Website / Service
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  placeholder="github.com"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            {/* Username Input */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 uppercase tracking-wider">
                Username / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alex.dev"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>
          </div>

          {/* Plain Text Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider">
                Plain Text Password <span className="text-emerald-400/80 font-normal">(Client-Only)</span>
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Generate Secure Password
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter or generate secret password"
                required
                className="w-full pl-9 pr-24 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                  Raw Text
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isEncrypting}
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Encrypt & Store Credential</span>
          </button>
        </form>

        {/* Simulated Vercel Serverless Function Dispatch Payload Display */}
        {lastNetworkPayload && showNetworkLog && (
          <div className="mt-6 p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Code className="w-4 h-4" />
                Simulated Vercel Serverless POST Payload (`/api/vault`)
              </span>
              <button
                onClick={() => {
                  setShowNetworkLog(false);
                  clearNetworkPayload();
                }}
                className="text-zinc-500 hover:text-zinc-300 text-[11px]"
              >
                Dismiss
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mb-2">
              Note: The network request contains ONLY ciphertext and IV. Plaintext password is NEVER transmitted.
            </p>
            <pre className="p-3 rounded-lg bg-zinc-900 text-emerald-300 overflow-x-auto text-[11px]">
{JSON.stringify(lastNetworkPayload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
