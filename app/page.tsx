'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import AuthForm from '@/components/AuthForm';
import CredentialForm from '@/components/CredentialForm';
import VaultList from '@/components/VaultList';
import { ShieldCheck, LogOut, Lock, Terminal, Cpu } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, userEmail, logout } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-zinc-950">
      {/* Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-sm text-zinc-100 block">
                ZeroVault <span className="text-[10px] text-emerald-400 font-mono font-normal">v1.0</span>
              </span>
              <span className="text-[10px] text-zinc-500 hidden sm:block">Client-Side WebCrypto Architecture</span>
            </div>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-zinc-400 font-mono">{userEmail}</span>
              </div>
              <button
                onClick={logout}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Lock Vault</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center justify-center">
        {!isAuthenticated ? (
          <div className="w-full space-y-8">
            <AuthForm />

            {/* Architecture Explainer */}
            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-left space-y-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">PBKDF2 SHA-256</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  100,000 iterations convert your master password into a non-extractable 256-bit AES-GCM key right inside your browser CPU.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-left space-y-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-emerald-400">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">AES-256-GCM Encryption</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Every password is encrypted with a unique 12-byte IV using `window.crypto.subtle`. Plain text never touches memory outside local state.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-left space-y-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-emerald-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Vercel Zero-Config</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Engineered for seamless static/SSR serverless deployment. Server stores only encrypted Base64 cipher blobs.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-10">
            {/* Credential Add Form */}
            <CredentialForm />

            {/* Credential Vault List */}
            <VaultList />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Client-Side Zero-Knowledge Password Vault • Web Crypto API</span>
          <span className="font-mono text-[11px] text-zinc-500">
            AES-GCM (256-bit) • Extractable: False
          </span>
        </div>
      </footer>
    </div>
  );
}
