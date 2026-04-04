"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message);
      setLoading(false);
      return;
    }

    router.push("/login");
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
          className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700"
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
    </div>
  );
}