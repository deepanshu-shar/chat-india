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
  const [lang, setLang] = useState<"en" | "hi">("en");

  useEffect(() => {
    const savedLang = localStorage.getItem("language") as "en" | "hi";
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);

  function toggleLanguage() {
    const newLang = lang === "en" ? "hi" : "en";
    setLang(newLang);
    localStorage.setItem("language", newLang);
  }

  const t = {
    en: {
      chats: "Chats",
      logout: "Logout",
      search: "Search or start new chat",
      online: "online",
      offline: "offline",
      noUsers: "No users found",
      noUsersAvailable: "No users available"
    },
    hi: {
      chats: "चैट्स",
      logout: "लॉगआउट",
      search: "खोजें या नई चैट शुरू करें",
      online: "ऑनलाइन",
      offline: "ऑफलाइन",
      noUsers: "कोई यूजर नहीं मिला",
      noUsersAvailable: "कोई यूजर उपलब्ध नहीं"
    }
  };

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
    <div className="w-1/3 bg-[#111b21] border-r border-gray-800 flex flex-col h-screen">

      {/* Header */}
      <div className="p-4 bg-[#202c33] flex items-center justify-between border-b border-gray-800">
        <h1 className="text-white text-xl font-bold">{t[lang].chats}</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleLanguage}
            className="text-white text-xs bg-gray-700 px-3 py-1 rounded-full hover:bg-gray-600"
          >
            {lang === "en" ? "🇮🇳 HI" : "🇬🇧 EN"}
          </button>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="text-white text-sm bg-gray-700 px-3 py-1 rounded-full hover:bg-gray-600"
          >
            {t[lang].logout}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 bg-[#111b21]">
        <input
          type="text"
          placeholder={t[lang].search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 rounded-lg bg-[#202c33] text-gray-100 text-sm outline-none placeholder-gray-500"
        />
      </div>

      {/* Users List */}
      <div className="overflow-y-auto flex-1 bg-[#111b21]">
        {users.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-4">{search ? t[lang].noUsers : t[lang].noUsersAvailable}</p>
        )}
        {users.map((user) => (
          <div
            key={user._id}
            onClick={() => handleUserClick(user)}
            className={`flex items-center p-3 cursor-pointer border-b border-gray-800 hover:bg-[#202c33]
              ${selectedUserId === user._id ? "bg-[#2a3942]" : ""}`}
          >
            <div className="relative mr-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {user.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111b21]"></div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-100">{user.name}</p>
              <p className="text-sm text-gray-400">
                {user.isOnline ? `🟢 ${t[lang].online}` : user.email}
              </p>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
