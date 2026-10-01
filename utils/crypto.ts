/**
 * CRYPTOGRAPHIC ENGINE (Client-Side Zero-Knowledge Architecture)
 *
 * All encryption and decryption operations strictly occur in the browser using the Web Crypto API
 * (window.crypto.subtle). Plaintext credentials and master passwords NEVER leave the client memory
 * or get transmitted across the network.
 */

/**
 * Encodes an ArrayBuffer or Uint8Array into a Base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a Base64 string into a Uint8Array backed by ArrayBuffer.
 */
function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes as Uint8Array<ArrayBuffer>;
}

/**
 * Derives a non-extractable 256-bit AES-GCM CryptoKey from the user's master password and salt (email).
 * Uses PBKDF2 with SHA-256 and 100,000 iterations.
 *
 * @param password The user's plaintext master password
 * @param salt The salt string (typically the user's email address)
 * @returns A Promise resolving to a non-extractable AES-GCM CryptoKey
 */
export async function deriveMasterKey(
  password: string,
  salt: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const saltBytes = encoder.encode(salt.toLowerCase().trim());

  // Import raw master password bytes into a PBKDF2 key representation
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false, // extractable: false
    ['deriveKey']
  );

  // Derive 256-bit AES-GCM key using PBKDF2 (100,000 iterations, SHA-256)
  // SECURITY BOUNDARY: Key is marked extractable: false to prevent memory export/inspection.
  const masterKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // Non-extractable: cannot be exported via exportKey
    ['encrypt', 'decrypt']
  );

  return masterKey;
}

/**
 * Encrypts a plain text string using AES-GCM with a freshly generated 12-byte Initialization Vector (IV).
 *
 * @param plainText The secret credential text to encrypt
 * @param key The derived AES-GCM CryptoKey
 * @returns An object containing Base64 encoded ciphertext and Base64 encoded IV
 */
export async function encryptData(
  plainText: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  try {
    // Generate a cryptographically secure 12-byte (96-bit) IV for AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const plainTextBytes = encoder.encode(plainText);

    // CPU-LEVEL ENCRYPTION BOUNDARY:
    // Plaintext is transformed to encrypted ciphertext locally in web crypto CPU memory
    // prior to any network payload assembly.
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      plainTextBytes
    );

    const ciphertextBase64 = arrayBufferToBase64(encryptedBuffer);
    const ivBase64 = arrayBufferToBase64(iv);

    return {
      ciphertext: ciphertextBase64,
      iv: ivBase64,
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data. Please verify your encryption context.');
  }
}

/**
 * Decrypts a Base64 encoded ciphertext using AES-GCM and the provided IV and CryptoKey.
 *
 * @param ciphertextBase64 The Base64 encoded encrypted payload
 * @param ivBase64 The Base64 encoded Initialization Vector
 * @param key The derived AES-GCM CryptoKey stored in client memory
 * @returns Decrypted plain text string
 */
export async function decryptData(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  try {
    const ciphertextBytes = base64ToUint8Array(ciphertextBase64);
    const ivBytes = base64ToUint8Array(ivBase64);

    // CPU-LEVEL DECRYPTION BOUNDARY:
    // Decryption occurs exclusively in browser client-side memory using the stored key.
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes,
      },
      key,
      ciphertextBytes
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Decryption failed. Invalid key, corrupted ciphertext, or mismatched IV.');
  }
}
