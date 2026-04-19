"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateKeyPair, saveKeysToIDB, toBase64 } from "@/lib/crypto/keyManager";
import { encryptPrivateKeyWithPIN } from "@/lib/crypto/pinBackup";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // PIN modal states
  const [showPINModal, setShowPINModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState<{ publicKey: string; encryptedPrivateKey: string } | null>(null);

  async function handleSignup() {
    setLoading(true);
    setError("");

    // Step 1: Generate keypair
    let publicKey: Uint8Array, secretKey: Uint8Array;
    try {
      const keyPair = generateKeyPair();
      publicKey = keyPair.publicKey;
      secretKey = keyPair.secretKey;
    } catch (err: any) {
      setError("Keypair generate nahi hua: " + err.message);
      setLoading(false);
      return;
    }

    // Step 2: Show PIN modal for backup
    setPendingSignupData({
      publicKey: toBase64(publicKey),
      encryptedPrivateKey: "", // Will be set after PIN is provided
    });
    setShowPINModal(true);

    // Store keys temporarily in memory for PIN encryption
    (window as any).__tempSecretKey = secretKey;
    (window as any).__tempPublicKey = publicKey;
    setLoading(false);
  }

  async function handlePINSubmit() {
    if (!pin || pin.length < 4) {
      setPinError("PIN 4 digits ka hona chahiye");
      return;
    }

    setPinLoading(true);
    setPinError("");

    try {
      const secretKey = (window as any).__tempSecretKey;
      const publicKey = (window as any).__tempPublicKey;

      // Step 3: Encrypt private key with PIN
      const encryptedPrivateKey = await encryptPrivateKeyWithPIN(secretKey, pin);

      // Step 4: Send to API with encrypted key
      console.log("📤 Sending to API...");
      console.log("publicKey:", toBase64(publicKey).substring(0, 20) + "...");
      console.log("encryptedPrivateKey:", encryptedPrivateKey.substring(0, 20) + "...");

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          publicKey: toBase64(publicKey),
          encryptedPrivateKey,
        }),
      });

      console.log("📡 Signup API response status:", res.status);
      const data = await res.json();
      console.log("📡 Signup API response:", data);

      if (!res.ok) {
        setPinError(data.message || "Signup fail ho gaya");
        setPinLoading(false);
        return;
      }

      // Step 5: Save keys to IndexedDB
      try {
        console.log("Saving keys to IDB...");
        await saveKeysToIDB(publicKey, secretKey);
        console.log("Keys saved to IDB successfully ✅");
      } catch (idbErr: any) {
        setPinError("IDB save failed: " + idbErr.message);
        setPinLoading(false);
        return;
      }

      // Cleanup temp storage
      delete (window as any).__tempSecretKey;
      delete (window as any).__tempPublicKey;
      setShowPINModal(false);

      // Step 6: Redirect to chat
      router.push("/");
    } catch (err: any) {
      setPinError("Error: " + err.message);
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
          type="text"
          placeholder="Naam"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className=" text-gray-800 w-full p-3 border rounded-lg mb-3 outline-none text-sm"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className=" text-gray-800 w-full p-3 border rounded-lg mb-3 outline-none text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className=" text-gray-800 w-full p-3 border rounded-lg mb-4 outline-none text-sm"
        />

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Ban raha hai..." : "Account Banao"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          Pehle se account hai?{" "}
          <a href="/login" className="text-green-600 font-semibold">
            Login karo
          </a>
        </p>

      </div>

      {/* PIN Modal */}
      {showPINModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold text-gray-800 mb-4">E2EE Backup PIN</h2>
            <p className="text-sm text-gray-600 mb-6">
              Apna messages secure rakhne ke liye 4-6 digit PIN set karo.
              <br/><br/>
              <strong>Ye PIN sirf aap ko malum ho — kisi ko mat batana!</strong>
              <br/><br/>
              Naye device pe login karte time is PIN se aapka private key recover kar sakenge.
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
                  setShowPINModal(false);
                  setPin("");
                  setPinError("");
                  delete (window as any).__tempSecretKey;
                  delete (window as any).__tempPublicKey;
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePINSubmit}
                disabled={pinLoading || pin.length < 4}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
              >
                {pinLoading ? "Setup ho raha..." : "Setup karo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}