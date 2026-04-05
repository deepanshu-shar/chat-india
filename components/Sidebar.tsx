"use client";
import { useState, useEffect } from "react";
import socket from "@/lib/socket";

interface User {
  _id: string;
  name: string;
  email: string;
  isOnline: boolean;
}

interface Props {
  currentUserId: string;
  onConversationSelect: (conversation: any) => void;
}

export default function Sidebar({ currentUserId, onConversationSelect }: Props) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  function toggleTheme() {
    if (dark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDark(true);
    }
  }

  useEffect(() => {
    async function fetchUsers() {
      const res = await fetch(`/api/users?search=${search}`);
      const data = await res.json();
      setUsers(data.users || []);
    }
    fetchUsers();
  }, [search]);

  useEffect(() => {
    socket.on("user-status-change", ({ userId, isOnline }) => {
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isOnline } : u))
      );
    });
    return () => { socket.off("user-status-change"); };
  }, []);

  async function handleUserClick(user: User) {
    setSelectedUserId(user._id);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: user._id }),
    });
    const data = await res.json();
    onConversationSelect({ ...data.conversation, otherUser: user });
  }

  return (
    <div className="w-1/3 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen">

      {/* Header */}
      <div className="p-4 bg-green-600 dark:bg-gray-800 flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">Chat India 🇮🇳</h1>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="text-xl">
            {dark ? "☀️" : "🌙"}
          </button>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="text-white text-sm bg-white/20 px-3 py-1 rounded-full hover:bg-white/30"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 bg-gray-100 dark:bg-gray-800">
        <input
          type="text"
          placeholder="User dhundo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm outline-none"
        />
      </div>

      {/* Users List */}
      <div className="overflow-y-auto flex-1">
        {users.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-4">Koi user nahi mila</p>
        )}
        {users.map((user) => (
          <div
            key={user._id}
            onClick={() => handleUserClick(user)}
            className={`flex items-center p-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800
              ${selectedUserId === user._id ? "bg-green-50 dark:bg-gray-700 border-l-4 border-l-green-600" : ""}`}
          >
            <div className="relative mr-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {user.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 dark:text-gray-100">{user.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.isOnline ? "🟢 Online" : user.email}
              </p>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}