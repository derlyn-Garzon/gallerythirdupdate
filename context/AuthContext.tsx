'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CredentialItem {
  id: string;
  site: string;
  username: string;
  encryptedPassword: string; // Base64 ciphertext
  iv: string;                // Base64 IV
  createdAt: string;
}

export interface NetworkPayload {
  site: string;
  username: string;
  encryptedPassword: string;
  iv: string;
}

interface AuthContextType {
  masterKey: CryptoKey | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  vaultItems: CredentialItem[];
  lastNetworkPayload: NetworkPayload | null;
  login: (email: string, key: CryptoKey) => void;
  logout: () => void;
  addCredential: (site: string, username: string, encryptedPassword: string, iv: string) => void;
  deleteCredential: (id: string) => void;
  clearNetworkPayload: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // SECURITY BOUNDARY:
  // `masterKey` is kept strictly in React memory state and never written to localStorage, cookies,
  // or transmitted over any network request.
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [lastNetworkPayload, setLastNetworkPayload] = useState<NetworkPayload | null>(null);

  // Initial mock vault items (stored as encrypted ciphertext payload format)
  // These represent encrypted records returned from a Vercel serverless / database backend
  const [vaultItems, setVaultItems] = useState<CredentialItem[]>([]);

  const login = (email: string, key: CryptoKey) => {
    setMasterKey(key);
    setUserEmail(email);
    setIsAuthenticated(true);
  };

  const logout = () => {
    // Purge key and state from browser RAM
    setMasterKey(null);
    setUserEmail(null);
    setIsAuthenticated(false);
    setVaultItems([]);
    setLastNetworkPayload(null);
  };

  const addCredential = (
    site: string,
    username: string,
    encryptedPassword: string,
    iv: string
  ) => {
    const payload: NetworkPayload = {
      site,
      username,
      encryptedPassword,
      iv,
    };

    setLastNetworkPayload(payload);

    const newItem: CredentialItem = {
      id: window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
      site,
      username,
      encryptedPassword,
      iv,
      createdAt: new Date().toISOString(),
    };

    setVaultItems((prev) => [newItem, ...prev]);
  };

  const deleteCredential = (id: string) => {
    setVaultItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearNetworkPayload = () => {
    setLastNetworkPayload(null);
  };

  return (
    <AuthContext.Provider
      value={{
        masterKey,
        userEmail,
        isAuthenticated,
        vaultItems,
        lastNetworkPayload,
        login,
        logout,
        addCredential,
        deleteCredential,
        clearNetworkPayload,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
