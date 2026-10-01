'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { deriveMasterKey } from '@/utils/crypto';
import { Lock, Mail, Key, ShieldCheck, Cpu, ArrowRight, Loader2 } from 'lucide-react';

export default function AuthForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isDeriving, setIsDeriving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and master password.');
      return;
    }

    try {
      setError(null);
      setIsDeriving(true);

      // Derive key locally in browser using PBKDF2 (100,000 iterations)
      // SECURITY NOTICE: Neither the plaintext password nor the key leave client memory.
      const masterKey = await deriveMasterKey(password, email);

      // Store in memory React context (extractable: false)
      login(email, masterKey);
    } catch (err: unknown) {
      console.error('Master key derivation error:', err);
      setError('Failed to derive master key. Web Crypto API unavailable or unsupported.');
    } finally {
      setIsDeriving(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700/80 mb-4 shadow-inner text-emerald-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Zero-Knowledge Vault</h1>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Client-Side AES-GCM 256-bit Encryption Engine. <br />
            Your master key never leaves browser memory.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 uppercase tracking-wider">
              Account Email <span className="text-zinc-500 font-normal">(Used as PBKDF2 Salt)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          {/* Master Password Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 uppercase tracking-wider">
              Master Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Key className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Key Derivation Info Box */}
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-zinc-300">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>PBKDF2 Hardware Derivation</span>
            </div>
            <p className="text-zinc-500 leading-normal">
              100,000 iterations • SHA-256 • Non-extractable memory key
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isDeriving}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isDeriving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deriving Key via WebCrypto...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Unlock Local Vault</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-zinc-800/80 text-center">
          <p className="text-[11px] text-zinc-500">
            Zero-Knowledge Architecture: No plaintext credentials or master key will be transmitted over fetch/XHR.
          </p>
        </div>
      </div>
    </div>
  );
}
