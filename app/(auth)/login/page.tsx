"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError("");

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

    router.push("/");
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
          className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700"
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
    </div>
  )
}