'use client';

import React, { useState } from 'react';
import { useAuth, CredentialItem } from '@/context/AuthContext';
import { decryptData } from '@/utils/crypto';
import { Shield, Eye, EyeOff, Copy, Check, Trash2, KeyRound, Globe, User, AlertCircle } from 'lucide-react';

interface VaultListProps {
  items?: CredentialItem[];
}

export default function VaultList({ items }: VaultListProps) {
  const { masterKey, vaultItems: contextVaultItems, deleteCredential } = useAuth();

  // Use props items if supplied, otherwise fallback to context vaultItems
  const vaultData = items ?? contextVaultItems;

  // Track plain text decrypted state map by item ID: { [id: string]: string }
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});
  // Track loading state for decryption
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  // Track copied state by item ID
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Track errors by item ID
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const handleToggleReveal = async (item: CredentialItem) => {
    // If already revealed, mask it again
    if (decryptedMap[item.id]) {
      setDecryptedMap((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      return;
    }

    if (!masterKey) {
      setErrorMap((prev) => ({
        ...prev,
        [item.id]: 'Master key unavailable in memory.',
      }));
      return;
    }

    try {
      setDecryptingId(item.id);
      setErrorMap((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });

      // CPU-LEVEL DECRYPTION BOUNDARY:
      // Perform local Web Crypto AES-GCM decryption in browser memory
      const plainText = await decryptData(item.encryptedPassword, item.iv, masterKey);

      setDecryptedMap((prev) => ({
        ...prev,
        [item.id]: plainText,
      }));
    } catch (err: unknown) {
      console.error('Failed to decrypt credential:', err);
      setErrorMap((prev) => ({
        ...prev,
        [item.id]: 'Decryption failed: Key mismatch or corrupted ciphertext.',
      }));
    } finally {
      setDecryptingId(null);
    }
  };

  const handleCopyPassword = async (item: CredentialItem) => {
    try {
      let passwordToCopy = decryptedMap[item.id];

      if (!passwordToCopy) {
        if (!masterKey) {
          setErrorMap((prev) => ({
            ...prev,
            [item.id]: 'Master key unavailable.',
          }));
          return;
        }
        passwordToCopy = await decryptData(item.encryptedPassword, item.iv, masterKey);
      }

      await navigator.clipboard.writeText(passwordToCopy);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err: unknown) {
      console.error('Copy to clipboard failed:', err);
      setErrorMap((prev) => ({
        ...prev,
        [item.id]: 'Failed to copy to clipboard.',
      }));
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Encrypted Vault Records
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Items stored in ciphertext Base64 format. Decrypted strictly on demand on CPU.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
              Total Accounts: <strong className="text-zinc-100">{vaultData.length}</strong>
            </span>
          </div>
        </div>

        {/* Table / Grid */}
        {vaultData.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/50">
            <KeyRound className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-300">Your Vault is Empty</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Add your first credential using the form above. Credentials are encrypted client-side using AES-GCM before storage.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Service / Website</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Password (AES-256-GCM)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-sm">
                {vaultData.map((item) => {
                  const isRevealed = !!decryptedMap[item.id];
                  const plainText = decryptedMap[item.id];
                  const isDecrypting = decryptingId === item.id;
                  const isCopied = copiedId === item.id;
                  const hasError = errorMap[item.id];

                  return (
                    <tr key={item.id} className="group hover:bg-zinc-800/30 transition-colors">
                      {/* Website/Service */}
                      <td className="py-4 px-4 text-zinc-200 font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-emerald-400">
                            <Globe className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-zinc-100">{item.site}</span>
                            <span className="block text-[10px] text-zinc-500 font-mono">
                              IV: {item.iv.substring(0, 10)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-4 px-4 text-zinc-300 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{item.username}</span>
                        </div>
                      </td>

                      {/* Encrypted / Decrypted Password */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {isRevealed ? (
                            <span className="font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/60 text-xs font-bold inline-block">
                              {plainText}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-zinc-500 text-xs tracking-widest bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800/80">
                                ••••••••••••
                              </span>
                              <span className="text-[10px] font-mono text-zinc-600 hidden lg:inline">
                                ({item.encryptedPassword.substring(0, 12)}...)
                              </span>
                            </div>
                          )}

                          {hasError && (
                            <div className="flex items-center gap-1 text-[11px] text-red-400">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{hasError}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Reveal/Hide Button */}
                          <button
                            onClick={() => handleToggleReveal(item)}
                            disabled={isDecrypting}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                              isRevealed
                                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                            title={isRevealed ? 'Hide Password' : 'Decrypt & Reveal Password'}
                          >
                            {isRevealed ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Mask</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>{isDecrypting ? 'Decrypting...' : 'Reveal'}</span>
                              </>
                            )}
                          </button>

                          {/* Copy Button */}
                          <button
                            onClick={() => handleCopyPassword(item)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
                            title="Copy Decrypted Password to Clipboard"
                          >
                            {isCopied ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => deleteCredential(item.id)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/80 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-900/80 transition-colors cursor-pointer"
                            title="Remove from Local Vault"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
