// models/Message.ts
//
// CHANGES FROM ORIGINAL:
// - text (plain string)     → REMOVED
// + encryptedContent        → ChaCha20-Poly1305 encrypted message (Base64)
// + nonce                   → 24-byte random nonce (Base64), required for decryption
//
// Kyu text field hata diya?
// Agar plain text store karo toh E2EE ka koi matlab nahi.
// Server pe sirf encrypted blob hoga — server khud decrypt nahi kar sakta.
//
// Nonce ke baare mein:
// Nonce secret nahi hai — openly store karo MongoDB mein.
// Decrypt karte time nonce chahiye hota hai, isliye save karna zaroori hai.

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  encryptedContent: string; // Base64 encrypted message
  nonce: string;            // Base64 nonce (24 bytes)
  seenBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true, // Fast fetch by conversation
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // ── E2EE FIELDS ──────────────────────────────────────────────
    encryptedContent: {
      type: String,
      required: true,
      // Plain text kabhi mat store karo yahan
    },
    nonce: {
      type: String,
      required: true,
      // Decrypt karne ke liye chahiye, public hota hai
    },
    // ─────────────────────────────────────────────────────────────
    seenBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
