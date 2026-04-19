// lib/crypto/keyManager.ts
//
// YE FILE KYA KARTI HAI:
// - Registration pe Curve25519 key pair generate karna
// - Private key ko IndexedDB mein store karna (browser local storage)
// - Dono users ke beech ECDH shared secret compute karna
//
// IndexedDB kyu? localStorage se zyada safe hai, aur JS me easily accessible hai.
// Shared secret kyu save karna? Baar baar compute karna avoid karo.

import nacl from 'tweetnacl';
import { get, set, del } from 'idb-keyval';

// IndexedDB mein in keys ke naam se store hoga
const PRIVATE_KEY_IDB = 'e2ee_private_key';
const PUBLIC_KEY_IDB = 'e2ee_public_key';
const SHARED_PREFIX = 'shared_'; // e.g. "shared_userId123"

// ─── CONVERSION HELPERS ───────────────────────────────────────────────────────
// Server pe string bhejni hai, Uint8Array nahi
// Browser-compatible: btoa/atob use karo, Buffer nahi

export function toBase64(key: Uint8Array): string {
  return btoa(String.fromCharCode(...key));
}

export function fromBase64(str: string): Uint8Array {
  return new Uint8Array(
    atob(str)
      .split('')
      .map((c) => c.charCodeAt(0))
  );
}

// ─── KEY GENERATION ───────────────────────────────────────────────────────────
// Registration pe sirf ek baar call hoga
// nacl.box.keyPair() → Curve25519 algorithm use karta hai
// Returns: { publicKey: Uint8Array, secretKey: Uint8Array }

export function generateKeyPair() {
  return nacl.box.keyPair();
}

// ─── INDEXEDDB STORAGE ────────────────────────────────────────────────────────
// IMPORTANT: Ye functions sirf browser mein chalenge, server pe nahi.
// Next.js mein server-side render ke time window nahi hota.
// Isliye jahan bhi call karo, check karo: typeof window !== 'undefined'

export async function saveKeysToIDB(
  publicKey: Uint8Array,
  secretKey: Uint8Array
): Promise<void> {
  try {
    console.log("💾 Saving to IDB...");
    console.log("Public key type:", publicKey.constructor.name, "length:", publicKey.length);
    console.log("Secret key type:", secretKey.constructor.name, "length:", secretKey.length);

    await set(PUBLIC_KEY_IDB, publicKey);
    console.log("✅ Public key saved");

    await set(PRIVATE_KEY_IDB, secretKey);
    console.log("✅ Private key saved");

    // Verify they were saved
    const verifyPub = await get(PUBLIC_KEY_IDB);
    const verifyPriv = await get(PRIVATE_KEY_IDB);

    console.log("✅ VERIFICATION - Public key in IDB:", verifyPub ? "YES" : "NO");
    console.log("✅ VERIFICATION - Private key in IDB:", verifyPriv ? "YES" : "NO");
  } catch (err: any) {
    console.error("❌ IDB save error:", err);
    throw err;
  }
}

export async function getPrivateKeyFromIDB(): Promise<Uint8Array | null> {
  try {
    console.log("🔍 Fetching private key from IDB...");
    const key = await get(PRIVATE_KEY_IDB);
    if (key) {
      console.log("✅ Private key found! Type:", key.constructor.name, "Length:", key.length);
    } else {
      console.log("❌ Private key NOT found in IDB");
    }
    return key ?? null;
  } catch (err: any) {
    console.error("❌ IDB fetch error:", err);
    return null;
  }
}

export async function getPublicKeyFromIDB(): Promise<Uint8Array | null> {
  try {
    console.log("🔍 Fetching public key from IDB...");
    const key = await get(PUBLIC_KEY_IDB);
    if (key) {
      console.log("✅ Public key found!");
    } else {
      console.log("❌ Public key NOT found in IDB");
    }
    return key ?? null;
  } catch (err: any) {
    console.error("❌ IDB fetch error:", err);
    return null;
  }
}

// Logout pe keys saaf karo IndexedDB se
export async function clearKeysFromIDB(): Promise<void> {
  await del(PRIVATE_KEY_IDB);
  await del(PUBLIC_KEY_IDB);
}

// ─── SHARED SECRET ────────────────────────────────────────────────────────────
// ECDH (Elliptic Curve Diffie-Hellman):
// Teri private key + dusre ki public key = same shared secret dono taraf pe
// Dusra banda bhi yahi karta hai: uski private key + teri public key = same secret
// Magic: alag inputs, same output — server ko secret kabhi pata nahi lagta

export async function computeAndSaveSharedSecret(
  theirPublicKey: Uint8Array,
  mySecretKey: Uint8Array,
  withUserId: string
): Promise<Uint8Array> {
  try {
    console.log("🔐 Computing shared secret...");
    console.log("My secret key type:", mySecretKey.constructor.name, "Length:", mySecretKey.length);
    console.log("Their public key type:", theirPublicKey.constructor.name, "Length:", theirPublicKey.length);

    // nacl.box.before() = Curve25519 ECDH shared secret compute karta hai
    const sharedSecret = nacl.box.before(theirPublicKey, mySecretKey);

    console.log("✅ Shared secret computed. Length:", sharedSecret.length);
    console.log("Shared secret (first 16 bytes):", Array.from(sharedSecret.slice(0, 16)));

    await set(`${SHARED_PREFIX}${withUserId}`, sharedSecret);
    console.log("✅ Shared secret saved to IDB for user:", withUserId);

    return sharedSecret;
  } catch (err: any) {
    console.error("❌ Error computing shared secret:", err);
    throw err;
  }
}

export async function getSharedSecret(
  withUserId: string
): Promise<Uint8Array | null> {
  const secret = await get(`${SHARED_PREFIX}${withUserId}`);
  return secret ?? null;
}

// Kisi ek user ka shared secret delete karo (optional cleanup)
export async function deleteSharedSecret(withUserId: string): Promise<void> {
  await del(`${SHARED_PREFIX}${withUserId}`);
}
