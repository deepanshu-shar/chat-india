"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getPrivateKeyFromIDB, saveKeysToIDB, fromBase64 } from "@/lib/crypto/keyManager";
import { decryptPrivateKeyWithPIN } from "@/lib/crypto/pinBackup";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // PIN recovery modal states
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pendingEncryptedKey, setPendingEncryptedKey] = useState<{ encryptedPrivateKey: string; publicKey: string } | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        setLoading(false);
        return;
      }

      // Login successful! Now check for private key in IndexedDB
      const privateKeyExists = await getPrivateKeyFromIDB();

      if (privateKeyExists) {
        // Keys already in IndexedDB - proceed to chat
        setLoading(false);
        router.push("/");
      } else {
        // New device - need to recover keys with PIN
        setLoading(false);

        try {
          // Fetch encrypted key from API
          const keyRes = await fetch("/api/auth/my-encrypted-key");
          const keyData = await keyRes.json();

          if (!keyRes.ok) {
            setError(keyData.error || "E2EE keys fetch nahi hua");
            return;
          }

          if (!keyData.encryptedPrivateKey) {
            // No encrypted key found - this is an old account or first login
            console.log("No E2EE keys found - proceeding to chat");
            router.push("/");
            return;
          }

          setPendingEncryptedKey({
            encryptedPrivateKey: keyData.encryptedPrivateKey,
            publicKey: keyData.publicKey,
          });
          setShowRecoveryModal(true);
        } catch (err: any) {
          setError("Error fetching keys: " + err.message);
        }
      }
    } catch (err: any) {
      setError("Login error: " + err.message);
      setLoading(false);
    }
  }

  async function handlePINRecovery() {
    if (!pin || pin.length < 4) {
      setPinError("PIN 4 digits ka hona chahiye");
      return;
    }

    if (!pendingEncryptedKey) {
      setPinError("Encrypted key nahi mila");
      return;
    }

    setPinLoading(true);
    setPinError("");

    try {
      // Decrypt private key with PIN
      const decryptedSecretKey = await decryptPrivateKeyWithPIN(
        pendingEncryptedKey.encryptedPrivateKey,
        pin
      );

      // Convert public key from base64
      const publicKeyUint8 = fromBase64(pendingEncryptedKey.publicKey);

      // Save to IndexedDB
      await saveKeysToIDB(publicKeyUint8, decryptedSecretKey);

      // Close modal and redirect
      setShowRecoveryModal(false);
      router.push("/");
    } catch (err: any) {
      setPinError("PIN galat hai ya key decrypt nahi hua: " + err.message);
    } finally {
      setPinLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">

        <h1 className="text-2xl font-bold text-green-600 text-center mb-6">
          Chat India 🇮🇳
        </h1>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-lg mb-3 outline-none text-sm text-gray-800"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded-lg mb-4 outline-none text-sm text-gray-800"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Login ho raha hai..." : "Login Karo"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          Account nahi hai?{" "}
          <a href="/signup" className="text-green-600 font-semibold">
            Signup karo
          </a>
        </p>

      </div>

      {/* PIN Recovery Modal (New Device) */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold text-gray-800 mb-4">E2EE Key Recovery</h2>
            <p className="text-sm text-gray-600 mb-6">
              Ye naya device hai! Apne messages decrypt karne ke liye:
              <br/><br/>
              Apna <strong>PIN</strong> enter karo jo signup mein set kiya tha.
              <br/>
              <strong>Ye PIN kisi ko mat batana!</strong>
            </p>

            {pinError && (
              <p className="text-red-500 text-sm mb-3">{pinError}</p>
            )}

            <input
              type="password"
              placeholder="4-6 digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 outline-none text-center text-2xl tracking-widest text-gray-800"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Skip PIN recovery and go to chat anyway
                  setShowRecoveryModal(false);
                  setPin("");
                  setPinError("");
                  router.push("/");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Skip
              </button>
              <button
                onClick={handlePINRecovery}
                disabled={pinLoading || pin.length < 4}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
              >
                {pinLoading ? "Recover ho raha..." : "Recover karo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}