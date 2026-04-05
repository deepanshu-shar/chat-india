"use client";
import { useState, useEffect, useRef } from "react";

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
    if (!conversation) return;
    fetchMessages();
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
      body: JSON.stringify({
        conversationId: conversation._id,
        text,
      }),
    });

    const data = await res.json();
    setMessages((prev) => [...prev, data.message]);
    setText("");
  }

  if (!conversation) {
    return (
      <div className="w-2/3 bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-gray-400 text-lg">Kisi user pe click karo chat shuru karne ke liye</p>
      </div>
    )
  }

  return (
    <div className="w-2/3 bg-gray-50 flex flex-col">

      {/* Chat Header */}
      <div className="flex items-center p-4 bg-white border-b border-gray-300">
        <div className="w-10 h-10 bg-green-400 rounded-full flex items-center justify-center text-white font-bold mr-3">
          {conversation.otherUser?.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-800">{conversation.otherUser?.name}</p>
          <p className="text-xs text-gray-500">
            {conversation.otherUser?.isOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-4">
            Abhi tak koi message nahi — pehla message bhejo! 👋
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`flex mb-3 ${msg.sender._id === currentUserId ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`p-3 rounded-lg shadow-sm max-w-xs ${
                msg.sender._id === currentUserId
                  ? "bg-green-100"
                  : "bg-white"
              }`}
            >
              <p className="text-sm text-gray-800">{msg.text}</p>
              <p className="text-xs text-gray-400 text-right mt-1">
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
      <div className="flex items-center p-3 bg-white border-t border-gray-300">
        <input
          type="text"
          placeholder="Message likho..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 p-2 rounded-full bg-gray-100 outline-none text-sm px-4 text-gray-800"
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