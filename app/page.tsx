"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);

  useEffect(() => {
    async function fetchMe() {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      setCurrentUserId(data.user.id);
    }
    fetchMe();
  }, []);

  return (
    <div className="flex h-screen bg-[#111b21]">
      <Sidebar
        currentUserId={currentUserId}
        onConversationSelect={setSelectedConversation}
      />
      <ChatWindow
        conversation={selectedConversation}
        currentUserId={currentUserId}
      />
    </div>
  )
}