"use client";
import { useState, useEffect, useRef } from "react";
import socket from "@/lib/socket";
import { getPrivateKeyFromIDB, getSharedSecret, computeAndSaveSharedSecret, fromBase64 } from "@/lib/crypto/keyManager";
import { encryptMessage, decryptMessage } from "@/lib/crypto/encryption";

interface Message {
  _id: string;
  text: string;
  encryptedContent?: string;
  nonce?: string;
  sender: {
    _id: string;
    name: string;
  };
  seenBy: string[];
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
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [decryptionError, setDecryptionError] = useState("");

  // Cache for shared secrets to avoid recomputing
  const sharedSecretCache = useRef<Map<string, Uint8Array>>(new Map());

  useEffect(() => {
    const savedLang = localStorage.getItem("language") as "en" | "hi";
    if (savedLang) {
      setLang(savedLang);
    }

    const checkLang = setInterval(() => {
      const currentLang = localStorage.getItem("language") as "en" | "hi";
      if (currentLang && currentLang !== lang) {
        setLang(currentLang);
      }
    }, 100);

    return () => clearInterval(checkLang);
  }, [lang]);

  const t = {
    en: {
      chatIndia: "Chat India",
      description: "Connect with people across India.",
      selectChat: "Select a chat to start messaging.",
      encrypted: "🔒 Messages are end-to-end encrypted",
      typeMessage: "Type a message",
      online: "online",
      offline: "offline"
    },
    hi: {
      chatIndia: "चैट इंडिया",
      description: "पूरे भारत में लोगों से जुड़ें।",
      selectChat: "मैसेजिंग शुरू करने के लिए चैट चुनें।",
      encrypted: "🔒 संदेश एंड-टू-एंड एन्क्रिप्टेड हैं",
      typeMessage: "मैसेज लिखें",
      online: "ऑनलाइन",
      offline: "ऑफलाइन"
    }
  };

  // Get or compute shared secret for another user
  async function getOrComputeSharedSecret(otherUserId: string): Promise<Uint8Array | null> {
    try {
      console.log("🔐 Getting shared secret for user:", otherUserId);

      // Check cache first
      if (sharedSecretCache.current.has(otherUserId)) {
        console.log("✅ Found in cache");
        return sharedSecretCache.current.get(otherUserId)!;
      }

      // Try to get from IndexedDB
      let sharedSecret = await getSharedSecret(otherUserId);

      if (!sharedSecret) {
        console.log("❌ Not in IDB, computing new shared secret...");

        // Compute shared secret
        const myPrivateKey = await getPrivateKeyFromIDB();
        if (!myPrivateKey) {
          console.error("❌ CRITICAL: Private key nahi mila IndexedDB mein!");
          console.error("This means: Keys were NOT saved during signup");
          return null;
        }

        console.log("✅ Got my private key from IDB");

        // Fetch other user's public key
        console.log("🔍 Fetching public key for user:", otherUserId);
        const pkRes = await fetch(`/api/users/${otherUserId}/public-key`);
        console.log("📡 Response status:", pkRes.status);

        if (!pkRes.ok) {
          console.error("❌ Public key fetch fail:", pkRes.statusText);
          const errorData = await pkRes.json();
          console.error("Error details:", errorData);
          return null;
        }

        console.log("✅ Got their public key from API");

        const { publicKey: publicKeyBase64 } = await pkRes.json();
        const theirPublicKey = fromBase64(publicKeyBase64);

        // Compute and save shared secret
        console.log("🔄 Computing ECDH shared secret...");
        sharedSecret = await computeAndSaveSharedSecret(theirPublicKey, myPrivateKey, otherUserId);
        console.log("✅ Shared secret computed and saved");
      } else {
        console.log("✅ Found shared secret in IDB");
      }

      // Cache it
      sharedSecretCache.current.set(otherUserId, sharedSecret);
      return sharedSecret;
    } catch (err: any) {
      console.error("❌ Error getting shared secret:", err);
      return null;
    }
  }

  // Decrypt a single message
  async function decryptSingleMessage(msg: Message): Promise<Message> {
    if (!msg.encryptedContent || !msg.nonce) {
      // Already decrypted or plain text
      return msg;
    }

    const senderId = msg.sender._id;
    const sharedSecret = await getOrComputeSharedSecret(senderId);

    if (!sharedSecret) {
      console.error("Could not get shared secret for user:", senderId);
      return { ...msg, text: "[Decryption failed]" };
    }

    const plaintext = decryptMessage(msg.encryptedContent, msg.nonce, sharedSecret);
    if (!plaintext) {
      console.error("Decryption returned null for message:", msg._id);
      return { ...msg, text: "[Decryption failed]" };
    }

    return { ...msg, text: plaintext };
  }

  useEffect(() => {
    if (!currentUserId) return;
    socket.connect();
    socket.emit("user-online", currentUserId);

    socket.on("receive-message", async (encryptedMsg: Message) => {
      // Decrypt the message before adding to state
      const decryptedMsg = await decryptSingleMessage(encryptedMsg);
      setMessages((prev) => [...prev, decryptedMsg]);
    });

    // Seen event suno
    socket.on("messages-seen", ({ userId }) => {
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          seenBy: msg.seenBy.includes(userId)
            ? msg.seenBy
            : [...msg.seenBy, userId],
        }))
      );
    });

    return () => {
      socket.off("receive-message");
      socket.off("messages-seen");
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
    try {
      const res = await fetch(`/api/messages?conversationId=${conversation._id}`);
      const data = await res.json();

      // Decrypt all messages
      const decryptedMessages = await Promise.all(
        (data.messages || []).map((msg: Message) => decryptSingleMessage(msg))
      );

      setMessages(decryptedMessages);
      setDecryptionError("");

      // Conversation khuli toh seen mark karo
      await fetch("/api/messages/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation._id }),
      });

      // Socket se sender ko batao
      socket.emit("mark-seen", {
        conversationId: conversation._id,
        userId: currentUserId,
      });
    } catch (err: any) {
      console.error("Error fetching messages:", err);
      setDecryptionError("Messages fetch nahi hua");
    }
  }

  async function sendMessage() {
    // sendMessage function ke andar, top pe add karo
console.log("otherUser full object:", conversation.otherUser);
console.log("otherUserId being used:", conversation.otherUser?._id);
    if (!text.trim() || !conversation) return;

    const otherUserId = conversation.otherUser?._id;
    if (!otherUserId) {
      alert("Recipient nahi mila");
      return;
    }

    try {
      console.log("📤 Sending message...");

      let encryptedContent = text; // Default: plaintext
      let nonce = "no-encryption"; // Default: no encryption

      // Try to encrypt (if E2EE keys available)
      try {
        const sharedSecret = await getOrComputeSharedSecret(otherUserId);
        if (sharedSecret) {
          const encrypted = encryptMessage(text, sharedSecret);
          encryptedContent = encrypted.encryptedContent;
          nonce = encrypted.nonce;
          console.log("✅ Message encrypted");
        } else {
          console.log("⚠️ Encryption failed, sending plaintext");
        }
      } catch (encErr: any) {
        console.error("⚠️ Encryption error:", encErr);
        console.log("Fallback: Sending plaintext");
      }

      // Send to API
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation._id,
          encryptedContent,
          nonce,
        }),
      });

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const data = await res.json();

      console.log("✅ Message saved on server");

      // Emit via socket
      socket.emit("send-message", {
        conversationId: conversation._id,
        message: {
          ...data.message,
          text: text,
        },
      });

      // Add to local messages
      setMessages((prev) => [
        ...prev,
        {
          _id: data.message._id,
          text: text,
          sender: { _id: currentUserId, name: "You" },
          seenBy: [currentUserId],
          createdAt: new Date().toISOString(),
        },
      ]);

      setText("");
      console.log("✅ Message sent!");
    } catch (err: any) {
      console.error("❌ Error sending message:", err);
      alert("Message bhejne mein error: " + err.message);
    }
  }

  if (!conversation) {
    return (
      <div className="w-2/3 flex flex-col items-center justify-center bg-[#0b141a]">
        <div className="text-center">
          <h2 className="text-3xl font-light text-gray-300 mb-2">
            {t[lang].chatIndia}
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            {t[lang].description}<br/>
            {t[lang].selectChat}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-2/3 flex flex-col bg-[#0b141a]">

      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#202c33] border-b border-gray-800">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold mr-3">
            {conversation.otherUser?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-100">
              {conversation.otherUser?.name}
            </p>
            <p className="text-xs text-gray-400">
              {conversation.otherUser?.isOnline ? t[lang].online : t[lang].offline}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#0b141a]">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center bg-[#182229] px-4 py-2 rounded-lg shadow-sm">
              <p className="text-gray-400 text-sm">
                {t[lang].encrypted}
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`flex mb-2 ${msg.sender._id === currentUserId ? "justify-end" : "justify-start"}`}
          >
            <div className={`relative px-3 py-2 rounded-lg shadow max-w-md ${
              msg.sender._id === currentUserId
                ? "bg-[#005c4b]"
                : "bg-[#202c33]"
            }`}>
              <p className="text-sm text-gray-100 break-words">{msg.text}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[11px] text-gray-400">
                  {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
             {msg.sender._id === currentUserId && (
  <svg
    className={`w-4 h-4 ${msg.seenBy?.length > 1 ? "text-blue-400" : "text-gray-500"}`}
    viewBox="0 0 16 15"
    fill="currentColor"
  >
    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
  </svg>
)}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Message Input */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#202c33]">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder={t[lang].typeMessage}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="w-full px-4 py-2.5 bg-[#2a3942] text-gray-100 placeholder-gray-400 rounded-lg outline-none text-[15px]"
          />
        </div>
        <button
          onClick={sendMessage}
          className="p-2.5 bg-[#00a884] hover:bg-[#00a884]/90 text-white rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </button>
      </div>

    </div>
  )
}