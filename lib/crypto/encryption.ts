// lib/crypto/encryption.ts
//
// YE FILE KYA KARTI HAI:
// - Message encrypt karna before server pe save karna
// - Message decrypt karna after server se receive karna
//
// Algorithm: ChaCha20-Poly1305 (nacl.box.after / nacl.box.open.after)
// - ChaCha20 = actual encryption (message ko scramble karna)
// - Poly1305 = authentication tag (ensure message tamper nahi hua)
//
// Nonce kyu? Ek hi secret se multiple messages encrypt karte ho.
// Nonce ensure karta hai same message ko encrypt karo toh har baar different output aaye.
// Nonce public hota hai — server pe save karo, koi problem nahi.

import nacl from 'tweetnacl';
import { toBase64, fromBase64 } from './keyManager';

// ─── ENCRYPT ──────────────────────────────────────────────────────────────────
// Call karo: message bhejne se pehle
// Input:  plaintext (jo user ne likha), sharedSecret (IndexedDB se)
// Output: encryptedContent + nonce → dono MongoDB mein save karo

export function encryptMessage(
  plaintext: string,
  sharedSecret: Uint8Array
): { encryptedContent: string; nonce: string } {
  // 24 random bytes ka nonce — cryptographically secure random
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  // String → bytes convert karo
  const messageBytes = new TextEncoder().encode(plaintext);

  // Actual encryption: ChaCha20-Poly1305
  // nacl.box.after = precomputed shared secret use karta hai (faster than nacl.box)
  const encrypted = nacl.box.after(messageBytes, nonce, sharedSecret);

  if (!encrypted) {
    throw new Error('Encryption failed — check sharedSecret');
  }

  return {
    encryptedContent: toBase64(encrypted), // server pe save karega
    nonce: toBase64(nonce),                // server pe save karega (public ho sakta hai)
  };
}

// ─── DECRYPT ──────────────────────────────────────────────────────────────────
// Call karo: server/socket se message aane ke baad
// Input:  encryptedContent + nonce (server se), sharedSecret (IndexedDB se)
// Output: plaintext string ya null (agar key galat hai ya message tamper hua)

export function decryptMessage(
  encryptedContent: string,
  nonce: string,
  sharedSecret: Uint8Array
): string | null {
  try {
    console.log("🔍 Decrypting message...");
    console.log("Shared secret type:", sharedSecret.constructor.name, "Length:", sharedSecret.length);
    console.log("Shared secret (first 16 bytes):", Array.from(sharedSecret.slice(0, 16)));

    const encryptedBytes = fromBase64(encryptedContent);
    const nonceBytes = fromBase64(nonce);

    console.log("Encrypted bytes length:", encryptedBytes.length);
    console.log("Nonce length:", nonceBytes.length);

    // nacl.box.open.after = decrypt + verify authentication tag
    // Agar koi message modify kare server pe, ye null return karega
    const decrypted = nacl.box.open.after(encryptedBytes, nonceBytes, sharedSecret);

    if (!decrypted) {
      // Ya toh wrong key, ya message tamper hua, ya nonce mismatch
      console.error('❌ Decryption failed — message may be corrupted or wrong key');
      return null;
    }

    console.log("✅ Decryption successful!");
    return new TextDecoder().decode(decrypted);
  } catch (err: any) {
    console.error("❌ Decryption error:", err);
    return null;
  }
}
