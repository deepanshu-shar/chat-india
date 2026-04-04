"use client";
import { useState, useEffect } from "react";

interface User {
  _id: string;
  name: string;
  email: string;
  isOnline: boolean;
}

export default function Sidebar() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    async function fetchUsers() {
      const res = await fetch(`/api/users?search=${search}`);
      const data = await res.json();
      setUsers(data.users || []);
    }
    fetchUsers();
  }, [search]);

  return (
    <div className="w-1/3 bg-white border-r border-gray-300 flex flex-col">

      {/* Sidebar Header */}
      <div className="p-4 bg-green-600">
        <h1 className="text-white text-xl font-bold">Chat India 🇮🇳</h1>
      </div>

      {/* Search Bar */}
      <div className="p-2 bg-gray-100">
        <input
          type="text"
          placeholder="User dhundo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 rounded-lg bg-white text-sm outline-none text-gray-800"
        />
      </div>

      {/* Users List */}
      <div className="overflow-y-auto flex-1">
        {users.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-4">
            Koi user nahi mila
          </p>
        )}
        {users.map((user) => (
          <div
            key={user._id}
            className="flex items-center p-3 hover:bg-gray-100 cursor-pointer border-b"
          >
            {/* Avatar */}
            <div className="relative mr-3">
              <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {/* Online indicator */}
              {user.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}