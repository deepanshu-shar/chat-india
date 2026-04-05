"use client";
import { useState, useEffect, useRef } from "react";
import socket from "@/lib/socket";

interface Message {
  _id: string;
  text: string;
  sender: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

interface Props {
  conversation: any;
  currentUserId: string;
}

export default function ChatWindow({ conversation, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUserId) return;
    socket.connect();
    socket.emit("user-online", currentUserId);
    socket.on("receive-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });
    return () => {
      socket.off("receive-message");
      socket.disconnect();
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!conversation) return;
    fetchMessages();
    socket.emit("join-room", conversation._id);
  }, [conversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchMessages() {
    const res = await fetch(`/api/messages?conversationId=${conversation._id}`);
    const data = await res.json();
    setMessages(data.messages || []);
  }

  async function sendMessage() {
    if (!text.trim() || !conversation) return;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: conversation._id, text }),
    });
    const data = await res.json();
    socket.emit("send-message", {
      conversationId: conversation._id,
      message: data.message,
    });
    setText("");
  }

  if (!conversation) {
    return (
      <div className="w-2/3 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800">
        <p className="text-gray-400 dark:text-gray-500 text-lg">
          💬 Kisi user pe click karo chat shuru karne ke liye
        </p>
      </div>
    )
  }

  return (
    <div className="w-2/3 flex flex-col bg-gray-50 dark:bg-gray-800">

      {/* Chat Header */}
      <div className="flex items-center p-4 bg-green-600 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="w-10 h-10 bg-green-400 rounded-full flex items-center justify-center text-white font-bold mr-3">
          {conversation.otherUser?.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-white">
            {conversation.otherUser?.name}
          </p>
          <p className="text-xs text-green-100 dark:text-gray-400">
            {conversation.otherUser?.isOnline ? "🟢 Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-4">
            Abhi tak koi message nahi — pehla message bhejo! 👋
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`flex mb-3 ${msg.sender._id === currentUserId ? "justify-end" : "justify-start"}`}
          >
            <div className={`p-3 rounded-lg shadow-sm max-w-xs ${
              msg.sender._id === currentUserId
                ? "bg-green-100 dark:bg-green-900"
                : "bg-white dark:bg-gray-700"
            }`}>
              <p className="text-sm text-gray-800 dark:text-gray-100">{msg.text}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">
                {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Message Input */}
      <div className="flex items-center p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="Message likho..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 p-2 rounded-full bg-gray-100 dark:bg-gray-700 outline-none text-sm px-4 text-gray-800 dark:text-gray-100"
        />
        <button
          onClick={sendMessage}
          className="ml-3 bg-green-600 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center hover:bg-green-700"
        >
          ➤
        </button>
      </div>

    </div>
  )
}